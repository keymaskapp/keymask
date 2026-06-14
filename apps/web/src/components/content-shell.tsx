// 内容页(about / privacy / blog)的统一外壳:极光背景 + 站点头尾 + 居中内容区。
import { SiteFooter, SiteHeader } from "./site-chrome";
import type { Locale } from "@/lib/i18n";
import { testId } from "@/lib/test-id";

export function ContentShell({
  locale,
  scope,
  children,
}: {
  locale: Locale;
  scope: string;
  children: React.ReactNode;
}) {
  return (
    <main {...testId(scope)} className="relative flex min-h-screen flex-col bg-[var(--color-background)]">
      <div className="hero-aurora" aria-hidden="true" />
      <SiteHeader locale={locale} />
      <div {...testId("content-body")} className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </div>
      <SiteFooter locale={locale} />
    </main>
  );
}
