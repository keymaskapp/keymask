// 在 IndexedDB 持久化「助记词派生的主密钥」CryptoKey,按保险库 id 索引。
//
// 安全前提(方案①「信任本机」):只持久化 deriveKey 返回的 non-extractable CryptoKey。
// 浏览器能用它解密,但任何 JS(含 XSS)都无法把它导出成裸字节 —— 偷不走密钥本身。
// 全程不涉及服务端、不写 localStorage(只能存字符串=裸密钥),且按 origin 隔离。
// 这不抵御「能操作本台已解锁浏览器的人」,那是该方案明确接受的取舍。

const DB_NAME = "keysark";
const STORE = "vault-keys";
const VERSION = 1;

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

// 在一个事务里跑 fn,事务 commit 后用 req.result 兑现(读返回值、写返回 key/undefined)。
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

/** 持久化某保险库的主密钥(non-extractable CryptoKey)。 */
export async function saveKey(vaultId: string, key: CryptoKey): Promise<void> {
  if (!available()) return;
  await run("readwrite", (s) => s.put(key, vaultId));
}

/** 取回某保险库已记住的主密钥;没有或环境不支持则返回 null。 */
export async function loadKey(vaultId: string): Promise<CryptoKey | null> {
  if (!available()) return null;
  const k = await run<unknown>("readonly", (s) => s.get(vaultId));
  return k instanceof CryptoKey ? k : null;
}

/** 忘记某保险库在本设备记住的密钥。 */
export async function deleteKey(vaultId: string): Promise<void> {
  if (!available()) return;
  await run("readwrite", (s) => s.delete(vaultId));
}

/** 清空本设备记住的全部密钥。 */
export async function clearKeys(): Promise<void> {
  if (!available()) return;
  await run("readwrite", (s) => s.clear());
}
