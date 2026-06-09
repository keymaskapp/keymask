# 条目历史版本(文本 + 文件)

> Created: 2026-06-09

## 结论

- 一句话方案:每次内容保存写一份**不可变密文快照**到 `items/<id>/<updatedAt>.json`(文本)/ `items/<id>/<updatedAt>.{json,bin}`(文件),旧快照永不覆盖、永不删除(无保留上限)→ 历史自然累积。"当前版"由 `EntryMeta.updatedAt`(已存在)直接指向,无需新指针字段。保存前用**明文 SHA-256** 与当前版比对,内容相同则不写新版本。
- 完成的可观测信号:同一条目编辑 N 次保存得到 N 个 `items/<id>/<ts>.*` 快照;连续两次保存相同内容只产生 1 个快照;打开"历史"列出全部版本(时间+大小);选任一旧版可预览、可"还原为当前版";**开当前版/存当前版的网络往返数与改造前完全一致**。

## 约束(推导依据)

- **热路径速度来自三处,不可破坏**(`packages/vault/src/vault.ts`):① index 常驻内存(`:85,128-134`),开条目不重读 index;② 本地缓存优先(`open :156-160` 命中即 0 网络),缓存按 `id` 存当前版;③ 本地优先乐观写(`save :196-208` 先写缓存+UI、再异步同步网盘)。
- **E2E**(CLAUDE.md 规则 3):每个快照与 hash 计算只在浏览器。快照是加密信封;**hash 是明文 SHA-256,只能存进加密的 index 信封**,绝不出现在文件名/未加密元数据/服务端。
- **AES-GCM 每次随机 IV** → 相同明文密文不同,**不能靠比对密文去重**,必须比对明文 hash。
- **存储后端是网盘**(`StorageTransport` `types.ts:101-110`):仅 `list/upload/download/delete`,无事务、无 CAS、每次往返慢。`/api/files` 的 `list(dir)` 已支持嵌套子目录(今天就在列 `vaults/<vid>/items`),再深一层 `items/<id>/` 是同一机制(`api/files/route.ts:13`)。
- 现有保存往返数:文本 2 PUT(条目+index `vault.ts:201-208`);文件 3 PUT(.bin+条目+index `:272-280`)。

## 关键决策

- **快照文件名 = 该版本的 `updatedAt` 毫秒时间戳**,不用单独 `seq`/`currentVersion` 字段:列 `items/<id>/` 得到的文件名即"版本号+时间",**目录列表自描述(顺序+时间)**,当前版指针复用已有的 `EntryMeta.updatedAt`。
- **不引入 manifest(`versions.json`)—— 偏离上一轮已确认的"异步 manifest"**:因时间戳命名的快照让"列历史"= 1 次 `list(items/<id>/)` 即得全部版本的时间与大小,manifest 的唯一价值(免逐个下载即可列时间)被列表本身覆盖。去掉它后**保存往返数与改造前完全相等**(不再有第三次 PUT),且无 read-modify-write、无 fire-and-forget 复杂度。
- **写新路径而非覆盖旧路径 = 历史累积的全部机制**:`save` 由覆盖 `items/<id>.json` 改为写 `items/<id>/<now>.json`,旧版留在原地即成历史。开/存逻辑、缓存语义、index 结构基本不变。
- **内容去重比对"当前版",不比对全历史**:`EntryMeta.contentHash` 只存当前版明文 hash;保存时新 hash == 当前 hash → 不写快照(若仅 title/folder 变,只更 index 元数据、不动 `updatedAt`/不生成版本)。语义=拦截"无改动/自动保存"造成的重复版本,正是去重目标。
- **文件也存历史、不设上限**(用户定):文件每版 = `<ts>.bin` + `<ts>.json` 两个对象;100MB×N 的网盘占用由用户承担,不做 GC。
- **无历史数据包袱,旧扁平逻辑直接移除、不兼容**(用户定):不保留对 `items/<id>.json|.bin` 的任何读回退;`open`/`openFile`/`remove` 只认版本布局 `items/<id>/<ts>.*`。既有扁平数据视为不存在(读不到即按"无此条目"处理),不迁移、不兼容。
- **删除条目删整个 `items/<id>/` 子目录**:`remove` 由删两个固定文件改为列子目录逐个 `delete`(无上限 → 版本可能多个)。

## 未决 / 信息不足

- Google Drive 按 parent-folder-id 组织,新布局每条目多一层"文件夹对象"(`items/<id>/`)。client 在 upload 时需自动建中间文件夹(今天已会建 `items/`),逐条目子文件夹的创建成本未度量 → exec 前置体检时实测确认。
- 多端同一毫秒内对同一条目保存 → 同名快照覆盖(丢其一),与今天 last-write-wins 同级,标 best-effort,不做 CAS。

## Plans 拆分

| 编号 | 标题 | 路径 | 依赖 | 状态 |
|---|---|---|---|---|
| 001 | vault 版本化数据层 + 内容哈希去重 | `plans/001-vault-versioning-core.done.md` | - | 已完成 |
| 002 | web 历史版本 UI | `plans/002-web-version-history-ui.done.md` | 001 | 已完成 |
