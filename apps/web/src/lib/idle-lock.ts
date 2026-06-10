// 闲置自动锁定:监听用户输入重置计时,超时触发回调(清内存密钥回密码界面)。
// 只在「已解锁」阶段挂载;超时设置(分钟)持久化 localStorage(App 级全局,非敏感整数)。
// 用 pointerdown/keydown 而非 pointermove 降噪;重置节流 ≥1s;计时基于时间戳 +
// 周期检查,后台标签回前台(visibilitychange)立即补一次检查,不被节流的 timer 骗过。

const STORAGE_KEY = "keysark.idleLockMinutes";
export const DEFAULT_IDLE_MINUTES = 15;
/** 设置 UI 的预设档位(分钟)。 */
export const IDLE_OPTIONS = [1, 5, 15, 30, 60];
const MAX_IDLE_MINUTES = 24 * 60;

export function loadIdleMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_IDLE_MINUTES;
  try {
    const n = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(n) && n >= 1 && n <= MAX_IDLE_MINUTES ? n : DEFAULT_IDLE_MINUTES;
  } catch {
    return DEFAULT_IDLE_MINUTES;
  }
}

export function saveIdleMinutes(n: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* 隐私模式忽略 */
  }
}

/** 规范化用户输入的自定义分钟数;非法返回 null。 */
export function normalizeIdleMinutes(raw: string | number): number | null {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 && n <= MAX_IDLE_MINUTES ? n : null;
}

/**
 * 启动闲置计时器,返回清理函数(锁定/登出时调用,避免泄漏与多实例)。
 * 超时只触发一次,触发前自动清理监听。
 */
export function startIdleLock(timeoutMs: number, onTimeout: () => void): () => void {
  let last = Date.now();
  let lastBump = 0;
  let fired = false;

  const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

  const cleanup = () => {
    for (const e of events) window.removeEventListener(e, bump);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(iv);
  };

  const bump = () => {
    const now = Date.now();
    if (now - lastBump < 1000) return; // 节流:高频事件每 ≥1s 才重置一次
    lastBump = now;
    last = now;
  };

  const check = () => {
    if (fired) return;
    if (Date.now() - last >= timeoutMs) {
      fired = true;
      cleanup();
      onTimeout();
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") check();
  };

  for (const e of events) window.addEventListener(e, bump, { passive: true });
  document.addEventListener("visibilitychange", onVisible);
  const iv = window.setInterval(check, 5_000);

  return cleanup;
}
