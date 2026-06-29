# Feedback

执行 proposal 期间冒出的、未在当前会话处理的事项。收尾后由用户决定要不要新开 proposal / plan 处理。

---

## [plans/002-web-password-unlock-flow.md] next-env.d.ts 仍被 git 跟踪

- **类型**：范围外发现
- **位置**：`apps/web/next-env.d.ts`
- **描述**：commit 2986070 声称 "stop tracking generated next-env.d.ts and gitignore it",但该文件仍在索引中——本次跑 `pnpm build` 后它出现在 `git status`(dev/build 模式生成的 routes.d.ts 引用路径不同,反复抖动)。
- **建议**：`git rm --cached apps/web/next-env.d.ts` 并确认 .gitignore 规则生效。

## [plans/002-web-password-unlock-flow.md] .playwright-mcp/ 产物目录未被 gitignore

- **类型**：范围外发现
- **位置**：仓库根 `.playwright-mcp/`
- **描述**：Playwright MCP 验收时在仓库根落了快照/console 日志目录,未被 .gitignore 覆盖,会污染 `git status`。
- **建议**：根 .gitignore 加 `.playwright-mcp/`。
- **状态**：✅ 已处理(2026-06-10,用户要求随 provider 文案修复一并完成)。

## [plans/002-web-password-unlock-flow.md] 密码强度的 passphrase 路线被 ≥3 类字符规则挡住

- **类型**：设计调整
- **位置**：`apps/web/src/lib/password-strength.ts`
- **描述**：纯小写长 passphrase(如 "correct horse battery staple",28 位、熵很高)会因「≥3 类字符」硬规则被拒;按 proposal 规则实现无误,但对偏好 diceware 风格的用户不友好。
- **建议**：待决策——可考虑「长度 ≥20 且熵达标时豁免字符类要求」。

## [plans/003-change-password-and-idle-lock.md] 多 tab 不共享锁定/解锁状态

- **类型**：范围外发现(proposal 已声明默认不做)
- **位置**：`apps/web/src/lib/idle-lock.ts`
- **描述**：每个 tab 各自输密码、各自计时;一个 tab 闲置锁定不会同步锁其他 tab。proposal「未决」节已决定默认不做 BroadcastChannel。
- **建议**：若日后要做,在 idle-lock 内加 BroadcastChannel("keymask-lock") 广播 lock 事件即可。
