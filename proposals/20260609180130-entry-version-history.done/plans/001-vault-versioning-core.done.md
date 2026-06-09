# vault 版本化数据层 + 内容哈希去重

> 来自 proposal: proposals/20260609180130-entry-version-history/

## 目标

- `@keysark/vault` 把"每条目单文件覆盖"改为"每次内容保存追加一份时间戳命名的不可变快照",当前版指针复用 `EntryMeta.updatedAt`;保存前用明文 SHA-256 与当前版去重;新增列/读/还原历史版本的方法。保证开/存当前版的网络往返数不变。

## 改动范围

- **新增**:
  - `packages/crypto/src/index.ts`:`sha256Hex(bytes: Uint8Array): Promise<string>`(`crypto.subtle.digest("SHA-256")` → hex)。纯浏览器。
  - `packages/vault/src/vault.ts` 方法:
    - `listVersions(id): Promise<VersionMeta[]>` —— `list(items/<id>/)` → 解析文件名时间戳 → 去重(文件版本 .bin/.json 同 ts 合一)→ 按时间倒序。
    - `openVersion(id, ts): Promise<EntryDoc>` —— 读 `items/<id>/<ts>.json`(文本旧版正文 / 文件旧版元信息)。
    - `openFileVersion(id, ts): Promise<Uint8Array>` —— 读 `items/<id>/<ts>.bin` 解密。
    - `restoreVersion(id, ts)` —— 读旧版内容 → 以 `now` 走 save/saveFile 存为新当前版(经 hash 去重:与当前版相同则 no-op)。
  - `packages/vault/src/types.ts`:`EntryMeta`/`EntryDoc` 加 `contentHash?: string`;新增 `VersionMeta { ts: number; size: number; kind: EntryKind }`;版本路径工具 `itemVersionPath(dir,id,ts)` / `itemBlobVersionPath(dir,id,ts)`。
- **更新**:
  - `vault.ts` 路径助手:`itemPath`/`itemBlobPath` 改为接受 ts、指向 `items/<id>/<ts>.{json,bin}`;`itemsDir` 之下每条目一子目录。
  - `save`:计算 `contentHash = sha256Hex(utf8(content))`;若 `existing.contentHash === newHash`:内容未变 → 不写快照,仅当 title/folderId 变了才更 index 元数据(保持 `updatedAt` 不变);否则 `updatedAt=now`,写快照到 `items/<id>/<now>.json` + 更 index(含 contentHash)。缓存仍按 id 存当前版。
  - `saveFile`:`contentHash = sha256Hex(bytes)`;去重逻辑同上;写 `items/<id>/<now>.bin` + `items/<id>/<now>.json`。
  - `open`/`openFile`:缓存优先不变;未命中走 `items/<id>/<updatedAt>.{json,bin}`(列该子目录解析)。**不保留旧扁平路径回退**——旧逻辑直接删除。
  - `remove`:列 `items/<id>/` 子目录,逐个 `transport.delete`(无上限,可能多版本)。
  - `sync`:pending 重传路径用条目当前 `updatedAt` 拼版本路径。
  - `itemRelPath`/`itemBlobRelPath`(types.ts,展示网盘位置用):指向当前版本路径。

## 验收

- [ ] 同一文本条目编辑保存 3 次(内容各不同)→ `items/<id>/` 下有 3 个 `<ts>.json`;`open` 返回最新版。
- [ ] 连续两次保存**相同内容** → 只产生 1 个快照(第二次 hash 命中,no-op)。
- [ ] 文件条目保存两版 → `items/<id>/` 下有两组 `<ts>.bin`+`<ts>.json`;`openFile` 返回最新字节。
- [ ] `listVersions` 倒序列出全部版本(ts+size);`openVersion`/`openFileVersion` 取回对应旧版内容正确解密。
- [ ] `restoreVersion(id, 旧ts)` 后,当前版内容 == 该旧版;再 `restoreVersion` 同一版(内容已相同)为 no-op 不增版本。
- [ ] 开/存当前版的 `transport` 调用次数与改造前一致(文本存=2 PUT、文件存=3 PUT;开命中缓存=0 网络)—— 代码走查 + 计数确认。
- [ ] `remove` 删除后 `items/<id>/` 下无残留。
- [ ] 代码中无任何对旧扁平路径 `items/<id>.json|.bin` 的读/写/删分支(旧逻辑已彻底移除)。
- [ ] `pnpm -r typecheck` 通过。

## 关键点

- **`contentHash` 与 hash 计算只进加密信封 / 只在浏览器**:hash 存 `EntryMeta`(随 index 加密),绝不进文件名或未加密处。
- **去重比对当前版,不比对历史**:只拦截连续无改动保存;内容回到某历史值仍算新版本(符合预期)。
- **往返数守恒是本 plan 的硬指标**:不得为支持历史在开/存热路径上加任何 list/download/manifest 往返;历史相关 IO 只在 `listVersions/openVersion/restoreVersion` 这些冷方法里。
- **Google Drive 每条目子文件夹**:upload 到 `items/<id>/<ts>.*` 需 client 自动建 `items/<id>/` 中间夹(同今天建 `items/`),exec 前置体检实测。

---

## 实施日志

- **执行时间**:2026-06-09 18:20
- **整体状态**:已完成

### 做了什么
- `packages/crypto/src/index.ts`:新增 `sha256Hex(bytes)`(`crypto.subtle.digest("SHA-256")` → hex)。
- `packages/vault/src/types.ts`:`EntryMeta`/`EntryDoc` 加 `contentHash?: string`;新增 `VersionMeta { ts, kind, size }`;`itemRelPath`/`itemBlobRelPath` 签名加 `ts`,指向 `items/<id>/<ts>.{json,bin}`。`packages/vault/src/index.ts` 导出 `VersionMeta`。
- `packages/vault/src/vault.ts`:
  - 路径助手:删 `itemPath`/`itemBlobPath`,改为 `versionsDir(id)`=`<dir>/items/<id>`、`versionPath(id,ts)`、`blobVersionPath(id,ts)`。
  - `save`:算 `sha256Hex(utf8(content))`;与当前版 `contentHash` 相同 → 不写快照(仅 title/folder 变时更 index、不动 updatedAt;否则全 no-op);否则 `updatedAt=now` 写 `items/<id>/<now>.json` + index(2 PUT,与改造前相同)。
  - `saveFile`:算 `sha256Hex(bytes)`;去重同上;写 `items/<id>/<now>.bin` + `.json` + index(3 PUT)。
  - `open`/`openFile`:缓存优先不变;未命中按内存 `meta.updatedAt` 读 `items/<id>/<updatedAt>.{json,bin}`,无旧扁平回退。
  - 新增冷方法 `listVersions`(列 `items/<id>/` 解析 ts、按 .bin 判 file/text、倒序)、`openVersion`、`openFileVersion`、`restoreVersion`(读旧版→以 now 走 save/saveFile,经 hash 去重)。
  - `remove`:列 `items/<id>/` 逐个 delete;`sync`:pending 重传到 `versionPath(id, meta.updatedAt)`。
  - `normalizeIndex` 透传 `contentHash`;模块头注释更新为版本化模型。
- `apps/web/src/components/vault-panel.tsx`:`itemRelPath` 调用加 `selected.updatedAt`(保持 `-r typecheck` 绿)。

### 验收核对
- [x] 文本编辑保存 3 次 → 3 个 `<ts>.json`,open 返回最新 —— 内存 transport 端到端测试通过。
- [x] 连续相同内容 → 只 1 个快照(hash 去重)—— 测试通过(文本+文件各一例)。
- [x] 文件两版 → 两组 `<ts>.bin`+`<ts>.json`,openFile 返回最新字节 —— 测试通过。
- [x] `listVersions` 倒序、`openVersion`/`openFileVersion` 取回旧版正确解密 —— 测试通过。
- [x] `restoreVersion(旧ts)` 后当前版=旧版且版本+1;再 restore 同内容 no-op —— 测试通过。
- [x] 开/存当前版往返数不变(save=2 PUT、saveFile=3 PUT、open 命中缓存=0)—— 代码走查确认(versionPath+indexPath / blob+version+index)。
- [x] `remove` 后 `items/<id>/` 无残留 —— 测试通过。
- [x] 无任何旧扁平路径 `items/<id>.json|.bin` 分支 —— grep 全仓零命中。
- [x] `pnpm -r typecheck` 全 9 包通过。

### 偏差与遗留
- `restoreVersion` 还原内容但保留**当前** title/folder(不回滚标题),内容聚焦;若要整版还原标题,002 UI 可按需调整。
- 文件 blob 不进本地缓存(沿用既有,localStorage 配额),故 `sync` 重试只补元信息信封、不补 blob —— 既有行为,非本次回归。
