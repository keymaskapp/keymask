// 每个保险库一个「解锁密码」:密码经 Argon2id 派生包裹密钥,在 IndexedDB 里
// 加密存放该库助记词。本地只落 {salt, params, iv, ct} —— 无明文密码、无明文助记词、
// 无可导出密钥字节;密码对不对靠 AES-GCM 认证标签,解密失败即拒绝。
// 与旧「记住本机」时代的 DB "keysark" 明确分离,独立 DB,避免版本号撞车。
import {
  decrypt,
  deriveWrappingKey,
  encrypt,
  generateWrappingSalt,
  DEFAULT_ARGON2ID_PARAMS,
  type Argon2idParams,
} from "@keysark/crypto";

const DB_NAME = "keysark-lock";
const STORE = "vault-credentials";
const VERSION = 1;

/** IndexedDB 里的每库加密凭据。salt/iv/ct 为 base64;明文助记词只在解锁瞬间出现在内存。 */
interface Credential {
  v: 1;
  kdf: "argon2id";
  salt: string;
  params: Argon2idParams;
  iv: string;
  ct: string;
}

function b64encode(u: Uint8Array): string {
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result as T);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

async function getCredential(vaultId: string): Promise<Credential | null> {
  if (!available()) return null;
  const c = await run<unknown>("readonly", (s) => s.get(vaultId));
  if (!c || typeof c !== "object") return null;
  const cred = c as Credential;
  return cred.v === 1 && cred.kdf === "argon2id" ? cred : null;
}

/** 用密码封装助记词并落库(覆盖旧凭据)。salt 每次重新随机。 */
export async function setPassword(
  vaultId: string,
  mnemonic: string,
  password: string,
): Promise<void> {
  const salt = generateWrappingSalt();
  const params = DEFAULT_ARGON2ID_PARAMS;
  const key = await deriveWrappingKey(password, salt, params);
  const { iv, ct } = await encrypt(key, new TextEncoder().encode(mnemonic));
  const cred: Credential = {
    v: 1,
    kdf: "argon2id",
    salt: b64encode(salt),
    params,
    iv: b64encode(iv),
    ct: b64encode(ct),
  };
  await run("readwrite", (s) => s.put(cred, vaultId));
}

/** 该库在本机是否已设解锁密码。 */
export async function hasPassword(vaultId: string): Promise<boolean> {
  return (await getCredential(vaultId)) !== null;
}

/** 密码解锁:还原助记词。无凭据或密码错误(GCM 认证失败)都抛错。 */
export async function unlock(vaultId: string, password: string): Promise<string> {
  const cred = await getCredential(vaultId);
  if (!cred) throw new Error("no credential");
  const key = await deriveWrappingKey(password, b64decode(cred.salt), cred.params);
  const pt = await decrypt(key, b64decode(cred.iv), b64decode(cred.ct));
  return new TextDecoder().decode(pt);
}

/**
 * 修改密码:先用当前密码解封校验(错则抛),再以新 salt 重新封装同一助记词覆盖凭据。
 * 助记词与派生主密钥不变;改完旧密码即失效。
 */
export async function changePassword(
  vaultId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const mnemonic = await unlock(vaultId, currentPassword);
  await setPassword(vaultId, mnemonic, newPassword);
}

/** 内部清理:删除该库本机凭据(删/忘整个库时调用,非用户「移除密码」功能)。 */
export async function clearCredential(vaultId: string): Promise<void> {
  if (!available()) return;
  await run("readwrite", (s) => s.delete(vaultId));
}
