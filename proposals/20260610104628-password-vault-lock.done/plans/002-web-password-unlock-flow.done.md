# Web 解锁流:移除记住本机,接密码设置/解锁

> 来自 proposal: proposals/20260610104628-password-vault-lock/

## 目标

- 删掉「记住本机/自动解锁/忘记本设备」整套;验证助记词后引导设密码;同设备重开用密码解锁;主密钥仅内存。

## 改动范围

- **新增** `apps/web/src/lib/password-strength.ts`:`scorePassword(pw) → { ok, score, reasons }`。规则:≥12 位 + ≥3 类字符(小写/大写/数字/符号)+ 拒绝弱模式(纯重复/连续/常见词);轻量本地熵估算,不引 `zxcvbn`。002 设密码、003 改密码共用。
- **更新** `apps/web/src/components/vault-panel.tsx`:
  - 删 state/ref:`rememberDevice`、`remembered`、`enteredRemembered`、`autoSuppress`、`autoTried` 及相关逻辑。
  - 删自动解锁 `useEffect`(282-312)、`unlockRemembered`、`forgetDevice`、`enterVault` 内 `saveKey` 调用、`lock()` 内 `autoSuppress` 逻辑。
  - 解锁界面三态:无凭据(`hasPassword`=false)→ 助记词验证 → **设置密码**(二次确认 + 强度条 + `scorePassword.ok` 才能提交)→ `setPassword` → 进库;有凭据 → **输入密码**解锁;已解锁 → 工作台。
  - 主密钥 `deriveKey` 后只留内存(state/ref),不落 IndexedDB。
- **更新** `apps/web/src/components/user-menu.tsx`:移除 `onForget` / `btn_forget_device`。
- **更新** `apps/web/src/lib/i18n.ts`:删 `btn_unlock_remembered`/`remember_device`/`btn_forget_device`;加 设密码/确认/输入/不匹配/密码错/最低长度 文案;改 landing 291「no passwords」卖点。
- **更新** 引用切到 `vault-lock.ts`(plan 001)。
- **删除** `apps/web/src/lib/key-store.ts` 及全部 import。

## 验收

- [ ] `grep key-store|saveKey|loadKey|deleteKey` 0 命中。
- [ ] 设密码后关浏览器重开 → 出现密码输入(非助记词);输对进库,输错被拒并提示。
- [ ] 弱密码(<12 位 / 字符类不足 / 弱模式)强度条提示不达标且提交按钮禁用。
- [ ] F5 刷新 → 要求重输密码(仅内存,验证生效)。
- [ ] 清空 IndexedDB / 换设备 → 无凭据 → 强制助记词 + 重设密码。
- [ ] 全程无明文密码/助记词/可导出密钥落 IndexedDB;`pnpm -r typecheck` 通过。

## 关键点

- 解锁界面三态(无凭据=助记词+设密码 / 有凭据=密码 / 已解锁=工作台)别搅在一起;≥2 库的选库流程不被打断。
- 删 remember 逻辑时注意 `lock()` 与 phase 切换不被破坏。
- 设密码步骤要二次确认 + 最低强度校验(数值见 proposal「未决」,exec 时定并经用户认可)。
- landing/文案的「无密码」卖点必须改,否则与新流程自相矛盾。

---

## 实施日志

- **执行时间**：2026-06-10 11:15
- **整体状态**：已完成

### 做了什么
- 新增 `apps/web/src/lib/password-strength.ts`:`scorePassword(pw) → {ok, score(0-4), reasons}`;规则 = ≥12 位 + ≥3 类字符 + 拒绝弱模式(纯重复 / 重复块 / 等差连续 / 常见词干占≥一半);轻量熵估算(字符池 × 重复打折的有效长度)给强度条分级。
- `vault-panel.tsx`:删 `rememberDevice/remembered/enteredRemembered/autoSuppress/autoTried` 与自动解锁 effect、`unlockRemembered`、`forgetDevice`、`enterVault` 内记住逻辑;新增 `credExists` 探测 effect、`verifyPhrase`(助记词验证 → 进设密码步骤)、`unlockWithPassword`(密码解封助记词 → deriveKey → checkVerifier → 进库;凭据与库不符自动清凭据回助记词流)、`finishSetup`(强制设密码 → 进库)。解锁界面三态:setup(设密码卡,二次确认+强度条+不达标禁提交)/ 有凭据(密码框 + 「忘记密码?用助记词解锁」fallback)/ 无凭据(助记词 + 「验证并继续」)。创建流程 `finishCreate` 改为创建后强制进设密码步骤。新增 `StrengthBar` 组件(002 设密码 / 003 改密码共用)。
- `user-menu.tsx`:删 `onForget` prop 与「忘记本设备」菜单项。
- `i18n.ts`:删 `btn_unlock_remembered`/`remember_device`/`btn_forget_device`;新增设密码/密码解锁/强度/原因等 24 个词条(中英);landing `feat_2_body`「无需账号密码」→「无需注册账号」(en "no passwords" → "no accounts")。
- 删除 `apps/web/src/lib/key-store.ts`。
- 验收手段:因真 OAuth 无法自动登录,新建临时页 `apps/web/src/app/lock-test/page.tsx`(固定助记词客户端生成 verifier 直接渲染 VaultPanel),Playwright 全流程实测;003 验收后删除该页。

### 验收核对
- [x] `grep key-store|saveKey|loadKey|deleteKey` 0 命中 —— grep 验证(连带 rememberDevice/forgetDevice/btn_forget_device 等也 0 命中)。
- [x] 设密码后重开 → 出现密码输入(非助记词);输对进库,输错被拒 —— Playwright:F5 后显示「输入解锁密码」;错密码提示「密码错误」;对密码进工作台。
- [x] 弱密码强度条提示不达标且提交禁用 —— Playwright:`abc123` 显示「太弱」+ 三条原因 + 按钮 disabled;两次不一致显示「两次输入的密码不一致」且禁用。
- [x] F5 刷新 → 要求重输密码 —— Playwright 实测(主密钥仅内存)。
- [x] 清空 IndexedDB / 换设备 → 强制助记词 + 重设密码 —— 无凭据分支(credExists=false)即首访路径,实测;另有「忘记密码?用助记词解锁」fallback 同路径实测。
- [x] 无明文密码/助记词/可导出密钥落 IndexedDB —— 实测凭据 = `{v, kdf, salt(16B), params{m:65536,t:3,p:1}, iv(12B), ct}`,JSON 全文不含密码与助记词单词;`pnpm -r typecheck` 全绿;`pnpm --filter @keymask/web build` 通过(hash-wasm 内联 wasm 在浏览器正常 instantiate,设密码/解锁均实际跑通 Argon2id)。

### 偏差与遗留
- 新增「忘记密码?用助记词解锁」fallback(plan 未列):没有它,忘记密码 + 手持助记词的用户会被永久锁在密码界面,与「助记词即主密钥」矛盾;验证助记词后走同一强制设密码步骤覆盖旧凭据。
- `finishSetup` 中 `setPassword` 落库失败(隐私模式等)不阻断进库,与旧 saveKey 容错立场一致;下次仍走助记词。
- 临时页 `lock-test` 在 003 验收后删除。

### 补充验证(2026-06-10 13:52)

- 应用户要求,对「忘记密码 → 用助记词重置密码」做了完整端到端复验(重建临时页 → 设密码 A → 刷新 → 点「忘记密码?用助记词解锁」→ 输助记词验证 → 强制设新密码 B → 刷新):旧密码 A 被拒「密码错误」,新密码 B 正常解锁。该能力即本 plan 实施时新增的 phraseFallback 路径,无需新代码。临时页与测试数据已再次清理。
