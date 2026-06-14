// 安全响应头 + 严格 CSP + 路由级多语言。两件事都在这一个 proxy 里做(Next 16 只允许一个)。
//
// CSP 策略:vault 场景下主密钥/明文只在浏览器内存,一旦 XSS 后果严重,故用尽量严格的 CSP。
//   - 生产:nonce + strict-dynamic(只信任带 nonce 的脚本及其动态加载链),禁 inline。
//     Next 会自动给自身脚本注入这里下发的 nonce(经请求头传入)。
//   - 开发:HMR 需要 inline/eval,放宽为 'unsafe-inline' 'unsafe-eval'(nonce 在 dev 不启用)。
//   - 始终:wasm-unsafe-eval(Argon2id 走 hash-wasm)、object/base/frame-ancestors 收死。
//
// 多语言:默认英文在根路径(无前缀),其它语言走 `/<locale>` 前缀(如 /zh)。命中前缀的请求被
//   「剥前缀」重写到对应的扁平页面,并把语言塞进 x-locale 请求头,供服务端读取;URL 不变,
//   页面不必复制。显式访问 /en/… 则 301 到无前缀规范 URL,避免重复内容。
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, NON_DEFAULT_LOCALES } from "@/lib/i18n";

const isProd = process.env.NODE_ENV === "production";
const NON_DEFAULT = NON_DEFAULT_LOCALES as string[];

/** 只有页面路由参与语言前缀重写;API、OAuth 回调、带扩展名的静态文件不碰。 */
function isLocalizable(pathname: string): boolean {
  return !/^\/(api|google)(\/|$)/.test(pathname) && !pathname.includes(".");
}

function buildCsp(nonce: string): string {
  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`
    : `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:`;
  const connectSrc = isProd ? "'self'" : "'self' ws: wss:";
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind/Next 注入 inline style;nonce 化不现实
    `img-src 'self' data: blob: https:`, // google/baidu 头像走 https
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `worker-src 'self' blob:`, // pdf.js worker
    `object-src 'none'`,
    `base-uri 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `frame-src 'none'`,
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function withSecurityHeaders(res: NextResponse, csp: string): NextResponse {
  res.headers.set("content-security-policy", csp);
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  res.headers.set("x-dns-prefetch-control", "off");
  res.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  if (isProd) {
    res.headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const { pathname } = request.nextUrl;
  const seg = pathname.split("/")[1] ?? "";
  const localizable = isLocalizable(pathname);

  // 显式 /en/… → 永久重定向(308)到无前缀规范 URL,避免重复内容。
  if (localizable && seg === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(seg.length + 1) || "/";
    return withSecurityHeaders(NextResponse.redirect(url, 308), csp);
  }

  // 把 nonce 经请求头传入,Next 据此给自身脚本打 nonce;同时下发当前语言。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  // 非默认语言前缀(/zh…)→ 剥前缀重写到扁平页面,并标记语言。
  if (localizable && NON_DEFAULT.includes(seg)) {
    requestHeaders.set("x-locale", seg);
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(seg.length + 1) || "/";
    return withSecurityHeaders(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), csp);
  }

  requestHeaders.set("x-locale", DEFAULT_LOCALE);
  return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

// 跳过静态资源与图片优化(它们不需要 CSP 文档头,且避免无谓开销)。
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
