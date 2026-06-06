// 本地优先的保险库数据层(纯客户端)。支持多保险库:每个库的数据在各自子目录 dir 下。
//
// 模型(以某个保险库的 dir 为基准,dir="" 表示历史单库在沙盒根):
//   - <dir>/index.json       ← 加密信封,明文为 { v, entries: EntryMeta[] },做检索。
//   - <dir>/items/<uuidv7>.json ← 每条条目一个文件,加密信封,明文为 EntryDoc。
//   - keysark.json(沙盒根)  ← 保险库注册表(明文元数据 + 密文校验块),见 @/lib/registry。
//
// 写入流程:先加密落本地缓存(localStorage,密文存储),再同步到网盘。
// 网盘同步失败不影响本地副本,失败项标记 pending,可手动重试同步。
//
// E2E:主密钥只在内存;落本地/上网盘的都是不透明密文信封。
import { newId } from "@keysark/db/id";
import { decryptFromEnvelope, encryptToEnvelope } from "@keysark/crypto";

export const INDEX_NAME = "index.json";
export const ITEMS_DIR = "items";

/** 拼接沙盒内相对路径;base="" 时直接返回 name(历史单库在根目录)。 */
function joinPath(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}

export interface EntryMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  size: number;
}
export interface IndexDoc {
  v: 1;
  entries: EntryMeta[];
}
export interface EntryDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

// ---------- base64 ----------
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

// ---------- 本地缓存(密文信封,base64;按保险库分命名空间) ----------
const NS_PREFIX = "keysark.vault.v1";

interface CacheShape {
  index: string | null;
  entries: Record<string, string>;
  pending: string[]; // 待同步条目 id
  indexPending: boolean;
}

function emptyCache(): CacheShape {
  return { index: null, entries: {}, pending: [], indexPending: false };
}

/** 为某个保险库(按 id)建一份独立的本地缓存,避免多库之间串扰。 */
function makeLocalCache(vaultId: string) {
  const ns = `${NS_PREFIX}::${vaultId}`;
  function readCache(): CacheShape {
    if (typeof window === "undefined") return emptyCache();
    try {
      const raw = window.localStorage.getItem(ns);
      if (!raw) return emptyCache();
      return { ...emptyCache(), ...(JSON.parse(raw) as Partial<CacheShape>) };
    } catch {
      return emptyCache();
    }
  }
  function writeCache(c: CacheShape): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ns, JSON.stringify(c));
    } catch {
      /* 配额/隐私模式:本地缓存只是镜像,忽略写失败 */
    }
  }
  return {
    raw: readCache,
    getIndex(): string | null {
      return readCache().index;
    },
    setIndex(b64: string, pending: boolean): void {
      const c = readCache();
      c.index = b64;
      c.indexPending = pending;
      writeCache(c);
    },
    getEntry(id: string): string | null {
      return readCache().entries[id] ?? null;
    },
    setEntry(id: string, b64: string, pending: boolean): void {
      const c = readCache();
      c.entries[id] = b64;
      if (pending && !c.pending.includes(id)) c.pending.push(id);
      if (!pending) c.pending = c.pending.filter((x) => x !== id);
      writeCache(c);
    },
    clearPending(id: string): void {
      const c = readCache();
      c.pending = c.pending.filter((x) => x !== id);
      writeCache(c);
    },
    clearIndexPending(): void {
      const c = readCache();
      c.indexPending = false;
      writeCache(c);
    },
    pendingCount(): number {
      const c = readCache();
      return c.pending.length + (c.indexPending ? 1 : 0);
    },
  };
}

type LocalCache = ReturnType<typeof makeLocalCache>;

// ---------- 服务端文件 API(只搬运密文) ----------
async function listFiles(dir = ""): Promise<Map<string, { id: string; size: number }>> {
  const res = await fetch(`/api/files?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) throw new Error(`list HTTP ${res.status}`);
  const data = (await res.json()) as { files: { id: string; name: string; size: number }[] };
  const m = new Map<string, { id: string; size: number }>();
  for (const f of data.files) m.set(f.name, { id: f.id, size: f.size });
  return m;
}
async function uploadFile(path: string, bytes: Uint8Array): Promise<void> {
  const res = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentB64: b64encode(bytes) }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
}
async function downloadById(fileId: string): Promise<Uint8Array> {
  const res = await fetch(`/api/files/content?fileId=${encodeURIComponent(fileId)}`);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const data = (await res.json()) as { contentB64: string };
  return b64decode(data.contentB64);
}

// ---------- 加解密 JSON ----------
async function encJson(key: CryptoKey, obj: unknown): Promise<Uint8Array> {
  return encryptToEnvelope(key, JSON.stringify(obj));
}
async function decJson<T>(key: CryptoKey, bytes: Uint8Array): Promise<T> {
  return JSON.parse(await decryptFromEnvelope(key, bytes)) as T;
}

function sortEntries(entries: EntryMeta[]): EntryMeta[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export class Vault {
  private fileMap = new Map<string, { id: string; size: number }>();
  private index: IndexDoc = { v: 1, entries: [] };
  private readonly dir: string;
  private readonly cache: LocalCache;

  /** @param opts.id 保险库 id(本地缓存命名空间);opts.dir 数据目录,""=沙盒根(历史单库)。 */
  constructor(
    private readonly key: CryptoKey,
    opts: { id: string; dir: string },
  ) {
    this.dir = opts.dir;
    this.cache = makeLocalCache(opts.id);
  }

  private indexPath(): string {
    return joinPath(this.dir, INDEX_NAME);
  }
  private itemsDir(): string {
    return joinPath(this.dir, ITEMS_DIR);
  }
  private itemPath(id: string): string {
    return joinPath(this.itemsDir(), `${id}.json`);
  }

  get entries(): EntryMeta[] {
    return sortEntries(this.index.entries);
  }
  pendingCount(): number {
    return this.cache.pendingCount();
  }

  /** 解锁后加载:以网盘 index.json 为准,失败则回退本地缓存。 */
  async load(): Promise<EntryMeta[]> {
    try {
      this.fileMap = await listFiles(this.dir);
      const idxFile = this.fileMap.get(INDEX_NAME);
      if (idxFile) {
        const bytes = await downloadById(idxFile.id);
        this.index = await decJson<IndexDoc>(this.key, bytes);
        this.cache.setIndex(b64encode(bytes), false);
        return this.entries;
      }
    } catch {
      // 网盘不可达 → 用本地缓存(离线可读)
      const cached = this.cache.getIndex();
      if (cached) {
        try {
          this.index = await decJson<IndexDoc>(this.key, b64decode(cached));
        } catch {
          this.index = { v: 1, entries: [] };
        }
      }
      return this.entries;
    }
    this.index = { v: 1, entries: [] };
    return this.entries;
  }

  /** 打开条目:本地优先,未命中再回网盘。 */
  async open(id: string): Promise<EntryDoc> {
    const cached = this.cache.getEntry(id);
    if (cached) {
      try {
        return await decJson<EntryDoc>(this.key, b64decode(cached));
      } catch {
        /* 本地损坏 → 回网盘 */
      }
    }
    const itemsMap = await listFiles(this.itemsDir());
    const f = itemsMap.get(`${id}.json`);
    if (!f) throw new Error("entry not found on netdisk");
    const bytes = await downloadById(f.id);
    this.cache.setEntry(id, b64encode(bytes), false);
    return decJson<EntryDoc>(this.key, bytes);
  }

  /**
   * 新建或更新条目。先加密落本地(乐观提交),再同步网盘(条目 + index)。
   * 同步失败不回滚本地副本,返回 synced=false + 错误,失败项保持 pending。
   */
  async save(input: { id?: string | null; title: string; content: string }): Promise<{
    id: string;
    entries: EntryMeta[];
    synced: boolean;
    syncError?: string;
  }> {
    const now = Date.now();
    const id = input.id ?? newId();
    const existing = this.index.entries.find((e) => e.id === id);
    const createdAt = existing?.createdAt ?? now;
    const doc: EntryDoc = { id, title: input.title, content: input.content, createdAt, updatedAt: now };

    const entryEnvelope = await encJson(this.key, doc);
    const meta: EntryMeta = {
      id,
      title: input.title,
      createdAt,
      updatedAt: now,
      size: entryEnvelope.byteLength,
    };
    if (existing) Object.assign(existing, meta);
    else this.index.entries.push(meta);
    const indexEnvelope = await encJson(this.key, this.index);

    // 1) 本地优先(标 pending)
    this.cache.setEntry(id, b64encode(entryEnvelope), true);
    this.cache.setIndex(b64encode(indexEnvelope), true);

    // 2) 同步网盘
    try {
      await uploadFile(this.itemPath(id), entryEnvelope);
      this.cache.clearPending(id);
      await uploadFile(this.indexPath(), indexEnvelope);
      this.cache.clearIndexPending();
    } catch (err) {
      return { id, entries: this.entries, synced: false, syncError: String(err) };
    }

    return { id, entries: this.entries, synced: true };
  }

  /** 手动重试:把本地 pending 的条目与 index 重新推送到网盘。 */
  async sync(): Promise<{ remaining: number }> {
    const c = this.cache.raw();
    for (const id of [...c.pending]) {
      const env = this.cache.getEntry(id);
      if (!env) {
        this.cache.clearPending(id);
        continue;
      }
      await uploadFile(this.itemPath(id), b64decode(env));
      this.cache.clearPending(id);
    }
    if (this.cache.raw().indexPending) {
      const idx = this.cache.getIndex();
      if (idx) {
        await uploadFile(this.indexPath(), b64decode(idx));
        this.cache.clearIndexPending();
      }
    }
    return { remaining: this.cache.pendingCount() };
  }
}
