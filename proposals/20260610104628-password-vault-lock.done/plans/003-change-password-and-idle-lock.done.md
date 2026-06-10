# 改密码入口 + 闲置自动锁定(可调)

> 来自 proposal: proposals/20260610104628-password-vault-lock/

## 目标

- 在已解锁工作台补「修改密码」入口(不可移除密码);加闲置自动锁定,默认 15min、用户可调、设置持久化。

## 改动范围

- **新增**:
  - `apps/web/src/lib/idle-lock.ts`:闲置计时器 —— 监听 `pointerdown/keydown/触摸/visibilitychange` 重置;超时触发回调。读写超时设置。
  - 闲置超时设置持久化:`localStorage`(App 级全局整数,默认 15min)。
  - 改密码 UI(user-menu 或设置弹窗):输当前密码 + 新密码(复用 `password-strength.ts` 校验)+ 确认 → 调 `vault-lock.changePassword`。
  - 闲置时长设置 UI:档位(如 1/5/15/30/60min)+ 自定义,实时生效。
- **更新**:
  - `apps/web/src/components/vault-panel.tsx`:已解锁期间挂载 `idle-lock`,超时调现有 `lock()`;时长设置变更即时重置计时器。
  - `apps/web/src/components/user-menu.tsx`:加「修改密码」「自动锁定时长」入口。
  - `apps/web/src/lib/i18n.ts`:改密码 / 当前密码 / 自动锁定时长 / 各档位 文案。

## 验收

- [ ] 改密码:当前密码错被拒;成功后旧密码失效、新密码可解锁;新密码不达强度被拒。
- [ ] 无「移除密码」按钮。
- [ ] 解锁后静置超过设定时长 → 自动回到密码界面(内存密钥已清)。
- [ ] 有用户操作(移动鼠标/按键)时不误锁;时长调小后即时生效。
- [ ] 时长设置重开浏览器后保留;`pnpm -r typecheck` 通过。

## 关键点

- 计时器只在「已解锁」阶段运行;锁定/登出时清理监听,避免泄漏与多实例。
- 锁定=清内存密钥 + 回密码界面,**不**清 IndexedDB 凭据(下次输密码即可)。
- 改密码在已解锁态仍要求输当前密码:防走近已解锁屏幕者直接改密(与闲置锁定互补)。
- 事件监听用节流(如每 ≥1s 才重置一次计时),避免高频 `pointermove` 抖动;建议用 `pointerdown/keydown` 而非 `pointermove` 降噪。

---

## 实施日志

- **执行时间**：2026-06-10 11:25
- **整体状态**：已完成

### 做了什么
- 新增 `apps/web/src/lib/idle-lock.ts`:`startIdleLock(timeoutMs, onTimeout) → cleanup`(监听 `pointerdown/keydown/touchstart/wheel` passive 重置,节流 ≥1s;时间戳 + 5s 周期检查,`visibilitychange` 回前台立即补查,不被后台节流的 timer 骗过;超时只触发一次并自清理);`loadIdleMinutes/saveIdleMinutes`(localStorage `keysark.idleLockMinutes`,默认 15,上限 24h)、`normalizeIdleMinutes`、档位 `IDLE_OPTIONS = [1,5,15,30,60]`。
- `vault-panel.tsx`:已解锁阶段挂载 idle-lock 的 effect(超时调现有 `lock()`;`idleMinutes` 变更 → effect 重跑 → 计时器即时重置);「修改密码」弹窗(AlertDialog:当前密码 + 新密码 + StrengthBar + 确认,不达标/不一致/空当前密码禁提交,`changePassword` GCM 失败显示「密码错误」不关弹窗);「自动锁定时长」弹窗(预设档位即点即生效 + 自定义分钟数)。
- `user-menu.tsx`:新增 `onChangePassword`/`onAutoLock` 入口(KeyRound / TimerReset 图标),仅工作台传入。
- `i18n.ts`:改密码 / 当前密码 / 自动锁定 / 档位 / 确定 等 11 个词条(中英)。
- 验收后删除临时页 `apps/web/src/app/lock-test/`,并清理 Playwright profile 的测试凭据(IndexedDB `keysark-lock`)与 localStorage 设置。

### 验收核对
- [x] 改密码:当前密码错被拒(「密码错误」,弹窗不关)、成功后旧密码失效、新密码可解锁 —— Playwright 实测三段;新密码强度复用 `scorePassword.ok` 禁提交(同 002 已验证的组件与逻辑)。
- [x] 无「移除密码」按钮 —— 菜单仅 锁定/修改密码/自动锁定时长/退出登录。
- [x] 解锁后静置超过设定时长 → 自动回到密码界面 —— 设 1 分钟档,静置 75s 实测回到密码界面(`lock()` 清内存密钥,IndexedDB 凭据保留,重输密码即可)。
- [x] 有用户操作不误锁;时长调小即时生效 —— 解锁后 t=35s 点击一次,t=70s(已超 60s 阈值)仍解锁;「15→1 分钟」变更后同会话内 60s 即锁,证明 effect 重跑即时生效。
- [x] 时长设置重开浏览器后保留 —— localStorage 持久化 "1",页面 reload 后按 1 分钟计时实测。
- [x] `pnpm -r typecheck` 通过(删除临时页后全仓重跑)。

### 偏差与遗留
- 设置 UI 用现有 `AlertDialog` 做模态(packages/ui 无 Dialog/Select,硬规矩禁止绕过 ui 包加 shadcn 组件);自定义时长为整数分钟输入框,非滑杆。
- 监听事件较 plan 增补 `wheel`(滚动浏览长文不该被误锁;pointerdown/keydown 捕不到纯滚动)。
