export {
  INDEX_NAME,
  ITEMS_DIR,
  REGISTRY_NAME,
  joinPath,
  itemRelPath,
  itemBlobRelPath,
  vaultDir,
  vaultVerifierAad,
  b64encode,
  b64decode,
  type FolderMeta,
  type EntryMeta,
  type VersionMeta,
  type EntryKind,
  type IndexDoc,
  type EntryDoc,
  type VaultDescriptor,
  type Registry,
  type StorageTransport,
  type CacheStore,
} from "./types";
export { makeCache, memoryKv, type KvStore } from "./cache";
export { Vault, saveRegistry, VaultIntegrityError, VaultRollbackError, type RevAnchor } from "./vault";
export { SERVICE_PROVIDERS, providerById, providerForHost, type ServiceProvider } from "./providers";
