# 用每库密码替换「记住密钥/助记词」

> Created: 2026-06-10

## 结论

- 删掉 `key-store.ts` 的「记住本机=明文自动解锁」整套;改为**每个 vault 一个解锁密码**:密码经 **Argon2id** 派生包裹密钥,在浏览器 IndexedDB 里加密存放**该库助记词**;重开浏览器输密码即解锁,不再输 12 词。**本地永不存明文密码**。无本地凭据(重新导入 / 换设备 / 清缓存)时强制重新设密码。
- **强密码 + 设置时校验**:最低 12 位且含 ≥3 类字符(小写/大写/数字/符号),并显示强度条;不达标禁止提交。
- **可改密码、不可移除密码**:提供「修改密码」入口(需当前密码,以新密码重新封装助记词);**不提供**「移除密码」(密码是唯一本机解锁凭据)。
- **闲置自动锁定**:默认 15 分钟无操作即锁(清内存密钥 → 回密码界面);时长用户可调,设置持久化本地。
- 会话仅内存:主密钥只在内存(non-extractable CryptoKey),F5/关标签即重输密码。
- 核心加密(AES-256-GCM 文本/文件信封)**保持 `crypto.subtle` 原生,不改、不引 Rust→wasm**。wasm 仅用于 Argon2id。
- 完成的可观测信号:
  - `key-store.ts` 删除;`grep saveKey|loadKey|deleteKey` 除新 store 外 0 命中。
  - 设密码后关浏览器重开 → 出现「输入密码」而非「输入助记词」;输对解锁,输错 GCM tag 失败被拒。
  - 弱密码(<12 位或字符类不足)在设置/改密界面被拒、无法提交。
  - 「修改密码」改完后:旧密码失效、新密码可解锁;无「移除密码」按钮。
  - 解锁后静置超过设定时长 → 自动回到密码界面;调小时长后即时生效。
  - IndexedDB 该库凭据只含 `{salt, params, iv, ct}`:无明文密码、无明文助记词、无可导出密钥字节。

## 约束(推导依据)

- E2E 硬规矩:主密钥/助记词/明文禁止触达服务端,加解密只在浏览器 `@keymask/crypto` + client component。新增的密码派生、助记词包裹必须只在浏览器(CLAUDE.md 强制约束 #3)。
- crypto 包硬规矩:只用 `crypto.subtle` + `@noble`/`@scure` 纯 JS,禁止 `node:crypto`(`packages/crypto/src/index.ts` 头注)。引 wasm 是新依赖类型,须落在 `packages/crypto` 内且浏览器可 instantiate。
- 现有代码事实:
  - `deriveKey(mnemonic)` 返回 **non-extractable** AES-GCM `CryptoKey`;`encryptToEnvelope` / `decryptFromEnvelope` 是现成 GCM 信封(`packages/crypto/src/index.ts`)。
  - `apps/web/src/lib/key-store.ts`:`saveKey/loadKey/deleteKey/clearKeys`,存 non-extractable `CryptoKey` 于 IndexedDB(DB `keymask` / store `vault-keys`)。
  - `apps/web/src/components/vault-panel.tsx` 记住本机/自动解锁:state `rememberDevice/remembered/enteredRemembered` + ref `autoSuppress/autoTried`(182-190)、自动重入 `useEffect`(282-312)、`enterVault` 内 `saveKey`(369-371 / 469-471)、`unlockRemembered`(385-)、`forgetDevice`(847-)、`lock()`(831-)、解锁界面「用本设备解锁/忘记本设备/在此设备记住」UI(1057-1085)。
  - `user-menu.tsx` `onForget`(1568 调用点 / 98 文案)。
  - `i18n.ts`:`btn_unlock_remembered` / `remember_device` / `btn_forget_device`(141-143、365-367);landing 文案 291「no passwords」与新流程矛盾,需改。
- 性能:仅内存会话 → 每次刷新/重开跑一次 KDF。Argon2id 纯 JS 在 m=64MB 量级**未度量**,预计 >1s;wasm 预计 ~100-300ms(**未度量**)。频繁刷新下纯 JS 体验差。

## 关键决策

- **会话仅内存 + non-extractable key**(用户已选):刷新即重输密码;与 key-store 原「抗导出」立场一致,XSS 偷不走密钥字节。
- **每库一密码**:作用域=vault;IndexedDB 按 `vaultId` 存一条加密凭据。
- **存「密码加密后的助记词」,不存导出主密钥**:`deriveKey` 返回不可导出 key,无法导出字节;助记词是天然可恢复的密文,解锁后 `deriveKey` 重建主密钥。纠正"密码存本地"的字面读法 —— 本地存的是**用密码加密的凭据**,不是明文密码。
- **KDF = Argon2id,走审计过的 wasm 库**(候选 `hash-wasm`):因仅内存会话 → 刷新频繁 → 需快 KDF;纯 JS `@noble/hashes/argon2`(零依赖)在该频率下体验差,故取 wasm。
- **偏离用户设想:不为「我们自身的加密方案」引 Rust→wasm**。第一性原理:AES-256-GCM 经 `crypto.subtle` 用的是 CPU 的 AES-NI 硬件指令,任何 wasm(Rust 与否)实现的 AES 都更慢;Rust→wasm 只增加工具链 + 包体 + 审计面,零收益。wasm 的唯一正当用途是 WebCrypto 缺失的 Argon2id;该处用现成审计库 > 自建 Rust argon2(自建无安全增益)。
- **密码 GCM tag 即校验**:密码对不对靠解密时 GCM 认证标签,失败即拒绝,无需为密码单设 verifier(助记词对库的校验仍用 registry 里现有 `makeVerifier/checkVerifier`)。
- **密码强度策略**:最低 12 位 + ≥3 类字符 + 弱模式(纯重复/连续/常见词)拒绝 + 实时强度条。用**轻量本地熵估算**,不引 `zxcvbn`(~400KB,与 crypto 包「极少依赖」立场冲突;离线爆破的真正防线是 Argon2id + 长度,zxcvbn 收益不抵体积)。
- **改密码=重新封装,不改助记词/主密钥**:`changePassword(current,new)` 先用当前密码解封校验,再以**新 salt + 新 Argon2id 包裹密钥**重新加密同一助记词覆盖凭据;助记词与派生主密钥不变。要求输当前密码(防走近已解锁屏幕者直接改密)。
- **无「移除密码」**:密码是本机唯一解锁凭据,移除=回到明文自动解锁,与本提案目标冲突。仅在**删除/忘记整个库**时由内部清理该库凭据(非用户「移除密码」功能)。
- **闲置锁定走客户端计时器**:监听用户输入事件(pointer/key/触摸)重置计时;超时调用现有 `lock()` 清内存密钥。超时值存本地(localStorage,非敏感整数),App 级全局一个,默认 15min,设置项实时生效。

## 未决 / 信息不足

- **Argon2 参数(m,t,p)未定**:需 exec 阶段定一组数值(如 m=64MB/t=3/p=1)并实测解锁延迟、经用户认可。防线=KDF 强度 + 密码强度。
- **闲置时长可选项粒度**:默认 15min;可选档位(如 1/5/15/30/60min + 自定义)未定,exec 时定。
- **多 tab 同库是否共享解锁/同步锁定**:仅内存方案下默认每 tab 各输一次密码、各自计时;共享需 `BroadcastChannel`,默认不做。

## Plans 拆分

| 编号 | 标题 | 路径 | 依赖 | 状态 |
|---|---|---|---|---|
| 001 | 密码派生 + 每库加密凭据存储层(含改密) | `plans/001-password-credential-store.done.md` | - | 已完成 |
| 002 | Web 解锁流:移除记住本机,接密码设置/解锁 + 强度校验 | `plans/002-web-password-unlock-flow.done.md` | 001 | 已完成 |
| 003 | 改密码入口 + 闲置自动锁定(可调) | `plans/003-change-password-and-idle-lock.done.md` | 002 | 已完成 |
