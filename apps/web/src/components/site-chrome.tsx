// 内容页(about / privacy / blog)共用的站点头尾。服务端组件,内部嵌入客户端的
// Repo/Docs/语言/主题按钮。链接随当前语言加前缀(默认英文无前缀)。
import { Wordmark } from "./brand";
import { DocsButton, HeaderControls, RepoButton } from "./controls";
import { localeHref, translate, type Locale, type MsgKey } from "@/lib/i18n";
import { testId } from "@/lib/test-id";

export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header
      {...testId("site-header")}
      className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-5"
    >
      <a href={localeHref("/", locale)} aria-label="KeyMask">
        <Wordmark className="text-lg" />
      </a>
      <div className="flex items-center gap-3">
        <RepoButton />
        <DocsButton />
        <HeaderControls />
      </div>
    </header>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = (key: MsgKey, ...args: unknown[]) => translate(locale, key, ...args);
  const links: { href: string; label: string }[] = [
    { href: localeHref("/about", locale), label: t("nav_about") },
    { href: localeHref("/blog", locale), label: t("nav_blog") },
    { href: localeHref("/privacy", locale), label: t("nav_privacy") },
    { href: localeHref("/docs", locale), label: t("nav_docs") },
  ];
  return (
    <footer
      {...testId("site-footer")}
      className="relative z-10 mx-auto mt-16 w-full max-w-3xl border-t border-[var(--color-border)] px-6 py-8 text-xs text-[var(--color-muted-foreground)]"
    >
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <a href={localeHref("/", locale)} aria-label="KeyMask">
          <Wordmark className="text-sm font-medium" />
        </a>
        <nav {...testId("site-footer-nav")} className="flex flex-wrap items-center gap-4">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-[var(--color-foreground)]">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
