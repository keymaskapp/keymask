// 读注册表(keysark.json)、按 verifier 把派生密钥匹配到保险库。
import { checkVerifier } from "@keysark/crypto";
import {
  REGISTRY_NAME,
  Vault,
  b64decode,
  makeCache,
  memoryKv,
  vaultVerifierAad,
  type StorageTransport,
  type VaultDescriptor,
} from "@keysark/vault";
import { keysarkDir } from "./config";
import { makeRevAnchor } from "./keystore";

const decoder = new TextDecoder();

/** 拉取注册表里的保险库列表。 */
export async function fetchVaults(transport: StorageTransport): Promise<VaultDescriptor[]> {
  const root = await transport.list("");
  if (!root.get(REGISTRY_NAME)) return [];
  const bytes = await transport.download(REGISTRY_NAME);
  const parsed = JSON.parse(decoder.decode(bytes)) as { vaults?: VaultDescriptor[] };
  return Array.isArray(parsed.vaults) ? parsed.vaults : [];
}

/** 在保险库里挑出与密钥匹配的那个;--vault 可按 id/label 先过滤。 */
export async function pickVault(
  vaults: VaultDescriptor[],
  key: CryptoKey,
  vaultSel?: string,
): Promise<VaultDescriptor | null> {
  const candidates = vaultSel
    ? vaults.filter((v) => v.id === vaultSel || v.label === vaultSel)
    : vaults;
  for (const v of candidates) {
    if (await checkVerifier(key, b64decode(v.verifier), vaultVerifierAad(v.id, v.dir))) return v;
  }
  return null;
}

export function openVault(
  key: CryptoKey,
  descriptor: VaultDescriptor,
  transport: StorageTransport,
): Vault {
  // CLI 进程短命:用内存缓存,每次从网盘读最新,避免陈旧。
  // rev 锚点存 OS keystore:内存缓存无法跨进程检出回滚,锚点是 CLI 唯一的回滚检测来源。
  return new Vault(
    key,
    { dir: descriptor.dir },
    transport,
    makeCache(memoryKv(), descriptor.id),
    makeRevAnchor(descriptor.id, keysarkDir()),
  );
}
