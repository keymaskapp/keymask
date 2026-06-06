// 保险库注册表(keysark.json)。位于沙盒一级目录,登记当前用户的多个保险库。
//
// E2E:注册表只含「非敏感元数据 + 密文校验块」——
//   - label    用户自取的保险库名字(明文元数据,仅用于登录时区分/选择)
//   - verifier 校验块密文信封的 base64(本身就是密文,用于校验助记词是否匹配该库)
// 主密钥、助记词、明文条目绝不出现在此文件。每个保险库的条目数据在各自子目录,见 @/lib/vault。

export const REGISTRY_NAME = "keysark.json";
/** 历史单库的校验文件名(无注册表时据此迁移为单个 legacy 保险库)。 */
export const LEGACY_META_NAME = ".keysark.json";
/** 历史单库的固定 id;其数据在沙盒根目录(dir="")。 */
export const LEGACY_VAULT_ID = "legacy";

export interface VaultDescriptor {
  id: string; // uuidv7;历史单库为 LEGACY_VAULT_ID
  label: string; // 用户可见名称(明文元数据,可为空 → 前端回退默认名)
  dir: string; // 条目数据目录(相对沙盒根);"" 表示历史库(根目录)
  verifier: string; // 校验块密文信封的 base64
  createdAt: number;
}
export interface Registry {
  v: 1;
  vaults: VaultDescriptor[];
}

/** 新建保险库的数据目录:vaults/<id>。 */
export function vaultDir(id: string): string {
  return `vaults/${id}`;
}

// ---------- base64(浏览器端) ----------
export function b64encode(u: Uint8Array): string {
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}
export function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

/**
 * 写注册表到网盘(覆盖)。注册表是明文 JSON(只含元数据 + 密文校验块),
 * 经服务端文件 API 字节进字节出。仅在浏览器调用。
 */
export async function saveRegistry(reg: Registry): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(reg));
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: REGISTRY_NAME, contentB64: b64encode(bytes) }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
}
