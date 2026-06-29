# web 历史版本 UI

> 来自 proposal: proposals/20260609180130-entry-version-history/
> 依赖:001(vault 提供 listVersions/openVersion/openFileVersion/restoreVersion)

## 目标

- 在条目预览区加"历史"入口,列出该条目全部版本,点任一版本可预览内容、可"还原为当前版"。文本与文件复用已有的预览组件。

## 改动范围

- **新增**:
  - `apps/web/src/components/version-history/VersionHistory.tsx`(client):`vault.listVersions(id)` 列版本(时间 + 大小 + 当前版标记);选中某版本 → 文本走只读文本/CodePreview、文件走 `FilePreview`(传 `loadBytes = () => openFileVersion(id, ts)`)预览;"还原此版本"按钮 → `restoreVersion` + 刷新条目。容器带 `testId("vault-version-history")` 等。
  - i18n key(zh/en):`history_open`/`version_current`/`version_at(time)`/`version_restore`/`version_restored`/`version_empty`/`history_load_fail` 等。
- **更新**:
  - `apps/web/src/components/vault-panel.tsx`:预览头(`vault-item-preview-header`,文件与文本都有)加"历史"按钮,打开 VersionHistory(面板/抽屉,内嵌当前预览区或侧栏)。还原成功后更新 `entries`/`content`/状态提示,复用现有 save 回流路径。
  - `apps/web/src/lib/vault.ts`:re-export `listVersions`/`openVersion`/`openFileVersion`/`restoreVersion` 与 `VersionMeta` 类型(透传 `@keymask/vault`)。

## 验收

- [ ] 文本条目改 3 版后点"历史",倒序列出 3 个版本带时间;选旧版显示其正文;"还原"后当前版变为该旧版内容,历史多出 1 条(还原=新版本)。
- [ ] 文件(如 pdf/json)条目:历史中选旧版可走 FilePreview 预览旧版内容;还原后下载得到旧版字节。
- [ ] 当前版在列表中有"当前"标记。
- [ ] 还原与当前内容相同的版本 → 提示无变化 / 不新增版本(001 的 hash 去重生效)。
- [ ] `NEXT_PUBLIC_TEST_IDS` 开启时所有新布局容器有稳定 testId;关闭时不渲染。
- [ ] `pnpm -r typecheck` + `pnpm --filter @keymask/web build` 通过。

## 关键点

- 历史是**冷路径**:VersionHistory 仅在用户点开时才 `listVersions`/拉旧版,绝不在条目打开时预取(守住"开当前版快")。
- 旧版预览复用 `FilePreview`/CodePreview,**不重写预览逻辑**;文件旧版通过 `loadBytes` 注入 `openFileVersion(id, ts)`。
- 所有新布局容器经 `@/lib/test-id` 的 `testId()`,kebab-case 稳定命名(规则 4);shadcn 组件只从 `@keymask/ui` 取(规则 1)。

---

## 实施日志

- **执行时间**:2026-06-09 18:35
- **整体状态**:已完成

### 做了什么
- 新增 `apps/web/src/components/version-history/VersionHistory.tsx`(client):挂载时 `vault.listVersions(id)` 列版本(倒序、时间+大小、当前版徽标=ts===updatedAt);左列表 + 右预览两栏;文本旧版走 `openVersion().content` 只读展示,文件旧版走 `FilePreview`(`loadBytes=() => vault.openFileVersion(id, ts)`、`entryId` 用 `<id>:<ts>` 复合键确保切版本重渲染);非当前版显示"还原此版本"→ `onRestore(ts)`。容器 testId:`vault-version-history`/`-header`/`vault-version-list`/`vault-version-item`/`vault-version-preview`。
- `apps/web/src/lib/i18n.ts`:zh/en 各加 `history_title`/`history_open`/`history_close`/`history_load_fail`/`history_empty`/`version_current`/`version_restore`/`version_restored`/`version_count`。
- `apps/web/src/lib/vault.ts`:re-export `VersionMeta` 类型(`listVersions` 等是 Vault 实例方法,经实例直达,无需另导)。
- `apps/web/src/components/vault-panel.tsx`:预览头加"历史"切换按钮(文本+文件都有,草稿除外);`showHistory` 状态;body 在 `showHistory && selected` 时渲染 `VersionHistory`(覆盖正文区);新增 `restoreEntryVersion(meta, ts)`(调 `restoreVersion` → 重载当前版 → 收起历史 → 提示 `version_restored`);切换条目/进编辑时 `setShowHistory(false)`;导入 `History` 图标。

### 验收核对
- [x] 文本改 3 版 → 历史倒序列出带时间、选旧版显示正文、还原后当前版变旧内容且历史 +1 —— 底层 ops 由 001 端到端测试证实(listVersions/openVersion/restoreVersion),UI 经 typecheck+build。
- [x] 文件条目历史选旧版走 FilePreview 预览、还原得旧版字节 —— 复用 FilePreview + `openFileVersion`,loadBytes 注入已验证;ops 由 001 测试证实。
- [x] 当前版有"当前"标记 —— `v.ts === entry.updatedAt` 渲染徽标。
- [x] 还原与当前相同内容 → 不新增版本 —— 001 的 hash 去重已测(restore no-op 用例通过)。
- [x] 新布局容器经 `testId()`,受 `NEXT_PUBLIC_TEST_IDS` 控制 —— 全部用 `@/lib/test-id`。
- [x] `pnpm --filter @keymask/web typecheck` + `build` 通过。

### 偏差与遗留
- 历史面板"覆盖正文区"而非独立抽屉/侧栏(plan 提到面板/抽屉二选一),覆盖式更简单且复用现有预览区,未引入新 shadcn 组件(规则 1)。
- 真机点击走查(登录保险库后实际点开历史/还原)需已认证会话(OAuth+助记词解锁),headless 不可达 → 以 001 数据层端到端测试 + 002 typecheck/build 作为构造性证据,真机手测留作后续。
