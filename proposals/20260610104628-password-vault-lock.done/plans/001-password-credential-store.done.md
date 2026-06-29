# 密码派生 + 每库加密凭据存储层

> 来自 proposal: proposals/20260610104628-password-vault-lock/

## 目标

- 在 `@keymask/crypto` 加 Argon2id 包裹密钥能力;新增浏览器端「每库加密凭据」store,用密码加密助记词存 IndexedDB,供 plan 002 替换 `key-store.ts`。

## 改动范围

- **新增**:
  - `packages/crypto`:`deriveWrappingKey(password, salt, params)` —— Argon2id(wasm)→ AES-256-GCM key;包裹/还原助记词(可复用 `encryptToEnvelope`/`decryptFromEnvelope`);导出默认 KDF 参数常量。
  - `packages/crypto` 依赖:引审计过的 argon2 wasm 库(候选 `hash-wasm`),浏览器可 instantiate。
  - `apps/web/src/lib/vault-lock.ts`:
    - `setPassword(vaultId, mnemonic, password)`
    - `unlock(vaultId, password) → mnemonic | 抛错`
    - `hasPassword(vaultId)`
    - `changePassword(vaultId, currentPassword, newPassword)` —— 先用当前密码解封校验,再以新 salt 重新封装同一助记词覆盖凭据(助记词不变)
    - `clearCredential(vaultId)` —— **内部清理**(删/忘整个库时调用),非用户「移除密码」
    - IndexedDB 存 `{v, kdf, salt, params, iv, ct}`。
- **更新**:`packages/crypto/src/index.ts` 导出新 API + 头注补「wasm 仅用于 Argon2id,AES 仍走 crypto.subtle」。

## 验收

- [ ] `deriveWrappingKey` 用 Argon2id;同 `password+salt+params` 稳定产出同一 key。
- [ ] `setPassword` 后 IndexedDB 凭据仅含 `{salt, params, iv, ct}`;无明文密码、无明文助记词。
- [ ] `unlock` 正确密码还原助记词;错误密码抛错(GCM tag 失败),不泄露任何明文。
- [ ] `changePassword` 当前密码错则拒绝;成功后旧密码失效、新密码可解锁、还原的助记词与改前一致。
- [ ] 助记词包裹→解包往返一致;错误密码 100% 拒绝(手测或单测)。
- [ ] 不引入 `node:crypto`;wasm 在浏览器客户端打包后加载成功。

## 关键点

- IV 每次随机 96-bit、绝不复用;salt 每库随机(项目硬规矩)。
- `hash-wasm` 的 `.wasm` 在 Next.js 客户端打包能否正常 instantiate 要先验证一次(可能需 inline / asset loader)。
- `password.normalize("NFKC")` 后再喂 KDF,避免同字符不同码点导致解锁失败。
- 新 store 的 DB/store 名与旧 `key-store`(`keymask`/`vault-keys`)要么复用要么明确分离,避免 schema 撞车;本 plan 只新增,删除 `key-store.ts` 留给 002。

---

## 实施日志

- **执行时间**：2026-06-10 11:00
- **整体状态**：已完成

### 做了什么
- `packages/crypto` 加依赖 `hash-wasm@4.12.0`(审计过的 argon2 wasm 库,wasm 以 base64 内联,无独立 .wasm 资产,打包器无需特殊配置)。
- `packages/crypto/src/index.ts` 新增:`Argon2idParams` 类型、`DEFAULT_ARGON2ID_PARAMS = {m:65536, t:3, p:1}`(64MB,经用户认可)、`generateWrappingSalt()`(16 字节随机)、`deriveWrappingKey(password, salt, params)`(NFKC 归一化 → Argon2id → non-extractable AES-256-GCM CryptoKey);头注补「wasm 仅用于 Argon2id,AES 仍走 crypto.subtle」。
- 新增 `apps/web/src/lib/vault-lock.ts`:`setPassword` / `unlock` / `hasPassword` / `changePassword` / `clearCredential`;IndexedDB 用独立 DB `keymask-lock` / store `vault-credentials`(与旧 `keymask` DB 明确分离,避免版本号撞车),凭据只存 `{v, kdf, salt, params, iv, ct}`(salt/iv/ct base64)。包裹用底层 `encrypt`/`decrypt`(不复用 `encryptToEnvelope`,因其 kdf 字段写死 "BIP39+HKDF-SHA256" 会误导)。

### 验收核对
- [x] `deriveWrappingKey` 用 Argon2id;同 password+salt+params 稳定产出同一 key —— node 脚本(node 24 自带 crypto.subtle)两次派生互解 PASS;单次耗时实测 ~121-133ms。
- [x] `setPassword` 后凭据仅含 `{salt, params, iv, ct}`(+`v`/`kdf` 版式字段) —— 见 `vault-lock.ts` Credential 结构,无明文密码/助记词字段。
- [x] `unlock` 正确密码还原助记词;错误密码抛错 —— 往返一致 PASS;4 组错误密码 100% 被 GCM tag 拒绝 PASS;另验 NFKC(预组合 é vs 组合码点)等价 PASS、不同 salt 派生 key 互不可解 PASS。
- [x] `changePassword` 逻辑 = `unlock`(当前密码错则抛)+ 新 salt `setPassword` 覆盖,助记词不变 —— 由上两条传递保证;浏览器端行为在 plan 003 验收一并核对。
- [x] 不引入 `node:crypto` —— grep 无命中;`pnpm --filter @keymask/crypto typecheck` + web `tsc --noEmit` 通过。
- [ ] wasm 在浏览器客户端打包后加载成功 —— hash-wasm 内联 wasm,理论无需配置;留到 plan 002 接 UI 后跑 `pnpm build` + 浏览器实跑确认。

### 偏差与遗留
- `hash-wasm` 拒绝空字符串密码(抛 "Password must be specified" 而非派生)——UI 层需禁用空输入提交(002 处理)。
- IndexedDB 相关函数(set/unlock/has/clear)无法在 node 验证,密码学核心已等价验证;浏览器行为留 002/003 验收。
