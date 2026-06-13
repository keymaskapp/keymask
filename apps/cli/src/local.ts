// 本地模式:把「从网盘整目录下载的备份」(.zip 或解压后的目录)当成一个只读的存储后端。
// 复用 @keysark/vault 的 Vault + @keysark/crypto 全套解密逻辑 —— 这里只实现一个
// 只读 StorageTransport,字节进字节出,绝不触碰明文/助记词/主密钥。
//
// 备份的真实布局(沙盒根之下):
//   keysark.json                              ← 保险库注册表(明文元数据 + 密文校验块)
//   vaults/<id>/index.json                    ← 加密 index
//   vaults/<id>/items/<id>/<ts>.json[/.bin]   ← 条目各版本快照(密文)
// Drive「下载整个文件夹」会多包一层目录(如 KeysArk-Dev/…),故需先探测并剥掉公共前缀。
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { LEGACY_META_NAME, REGISTRY_NAME, type StorageTransport } from "@keysark/vault";

/** 归一化后的归档:每个文件一条 posix 相对路径 + 大小 + 惰性读取。 */
interface RawArchive {
  entries: { name: string; size: number }[];
  read(name: string): Uint8Array;
}

// ---------- ZIP 读取(纯 JS,只解析中央目录;stored / deflate 两种压缩) ----------
const EOCD_SIG = 0x06054b50; // End of Central Directory
const CDH_SIG = 0x02014b50; // Central Directory Header

function readZip(buf: Buffer): RawArchive {
  // 1) 从尾部回扫定位 EOCD(允许末尾有 zip 注释)。
  let p = buf.length - 22;
  const min = Math.max(0, buf.length - 22 - 0xffff);
  while (p >= min && buf.readUInt32LE(p) !== EOCD_SIG) p--;
  if (p < min) throw new Error("not a zip file (no end-of-central-directory record)");
  const count = buf.readUInt16LE(p + 10);
  let q = buf.readUInt32LE(p + 16); // central directory 起始偏移

  // 2) 遍历中央目录,记录每个条目的压缩方式/大小/本地头偏移。
  const meta: { name: string; method: number; compSize: number; size: number; local: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(q) !== CDH_SIG) break;
    const method = buf.readUInt16LE(q + 10);
    const compSize = buf.readUInt32LE(q + 20);
    const size = buf.readUInt32LE(q + 24);
    const nameLen = buf.readUInt16LE(q + 28);
    const extraLen = buf.readUInt16LE(q + 30);
    const commentLen = buf.readUInt16LE(q + 32);
    const local = buf.readUInt32LE(q + 42);
    const name = buf.toString("utf8", q + 46, q + 46 + nameLen);
    if (!name.endsWith("/")) meta.push({ name, method, compSize, size, local }); // 跳过目录条目
    q += 46 + nameLen + extraLen + commentLen;
  }

  const cache = new Map<string, Uint8Array>();
  const byName = new Map(meta.map((m) => [m.name, m]));
  return {
    entries: meta.map((m) => ({ name: m.name, size: m.size })),
    read(name) {
      const hit = cache.get(name);
      if (hit) return hit;
      const m = byName.get(name);
      if (!m) throw new Error(`zip entry not found: ${name}`);
      // 本地头:30 字节定长 + 文件名 + extra,之后才是数据(extra 长度可能与中央目录不同)。
      const lNameLen = buf.readUInt16LE(m.local + 26);
      const lExtraLen = buf.readUInt16LE(m.local + 28);
      const start = m.local + 30 + lNameLen + lExtraLen;
      const comp = buf.subarray(start, start + m.compSize);
      let out: Uint8Array;
      if (m.method === 0) out = Uint8Array.from(comp);
      else if (m.method === 8) out = Uint8Array.from(inflateRawSync(comp));
      else throw new Error(`unsupported zip compression method ${m.method} for ${name}`);
      cache.set(name, out);
      return out;
    },
  };
}

// ---------- 目录读取(惰性 readFileSync,避免把大 .bin 全读进内存) ----------
function readDir(root: string): RawArchive {
  const entries: { name: string; size: number }[] = [];
  const walk = (abs: string, rel: string) => {
    for (const ent of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = join(abs, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(childAbs, childRel);
      else if (ent.isFile()) entries.push({ name: childRel, size: statSync(childAbs).size });
    }
  };
  walk(root, "");
  return {
    entries,
    read(name) {
      // name 是 posix 相对路径;转成本平台分隔符再读。
      // 必须拷成独立 Uint8Array:Node Buffer 的 .slice() 是共享视图(已废弃语义),
      // 会让下游 crypto 的 iv/ct 切片误带上整段底层 buffer,导致 AES-GCM 解密失败。
      return new Uint8Array(readFileSync(join(root, name.split("/").join(sep))));
    },
  };
}

/** 探测公共前缀:找最浅的 keysark.json / .keysark.json,其所在目录即沙盒根。 */
function detectPrefix(arc: RawArchive): string {
  const regs = arc.entries
    .map((e) => e.name)
    .filter((n) => {
      const base = n.split("/").pop();
      return base === REGISTRY_NAME || base === LEGACY_META_NAME;
    })
    .sort((a, b) => a.split("/").length - b.split("/").length);
  if (regs.length === 0) {
    throw new Error(`no ${REGISTRY_NAME} found — this does not look like a KeysArk backup`);
  }
  const reg = regs[0]!;
  const slash = reg.lastIndexOf("/");
  return slash === -1 ? "" : reg.slice(0, slash + 1); // 含尾部斜杠,或 ""
}

/** 用归档 + 前缀拼出一个只读 StorageTransport(上传/删除拒绝)。 */
function localTransport(arc: RawArchive, prefix: string): StorageTransport {
  const sizeOf = new Map(arc.entries.map((e) => [e.name, e.size]));
  return {
    async list(dir) {
      const base = dir ? `${prefix}${dir}/` : prefix; // 该相对目录在归档里的完整前缀
      const m = new Map<string, { id: string; size: number }>();
      for (const { name } of arc.entries) {
        if (!name.startsWith(base)) continue;
        const rest = name.slice(base.length);
        if (!rest || rest.includes("/")) continue; // 只要直接子文件
        m.set(rest, { id: name, size: sizeOf.get(name) ?? 0 });
      }
      return m;
    },
    async download(relPath) {
      return arc.read(`${prefix}${relPath}`);
    },
    async upload() {
      throw new Error("local mode is read-only");
    },
    async delete() {
      throw new Error("local mode is read-only");
    },
  };
}

export interface LocalSource {
  transport: StorageTransport;
  /** 备份内的沙盒根前缀(展示用,"" 表示无额外目录层)。 */
  prefix: string;
  /** "zip" | "dir",展示用。 */
  kind: "zip" | "dir";
}

/** 打开一个本地备份(.zip 文件或解压后的目录),返回只读 transport。 */
export function openLocalSource(path: string): LocalSource {
  const st = statSync(path); // 不存在 → 抛 ENOENT,由调用方兜底
  let arc: RawArchive;
  let kind: "zip" | "dir";
  if (st.isDirectory()) {
    arc = readDir(path);
    kind = "dir";
  } else {
    arc = readZip(readFileSync(path));
    kind = "zip";
  }
  const prefix = detectPrefix(arc);
  return { transport: localTransport(arc, prefix), prefix, kind };
}
