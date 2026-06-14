import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { providerFlags, storageLabel } from "@/lib/providers";
import {
  htmlLang,
  localeHref,
  translate,
  THEME_COOKIE,
  type MsgKey,
  type Theme,
} from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale-server";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// 部署时设 NEXT_PUBLIC_SITE_URL,用于把 OG / favicon / canonical 的相对路径解析成绝对 URL。
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:6134";
const OG_BANNER = "/keysark-og-banner.png";

const ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/keysark-favicon.svg", type: "image/svg+xml" },
    { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
};

// 元信息随语言变化(标题/描述/OG locale),并声明 hreflang 备用链接,利于多语言 SEO。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = (key: MsgKey, ...args: unknown[]) => translate(locale, key, ...args);
  const store = storageLabel(providerFlags(), {
    google: t("store_google"),
    baidu: t("store_baidu"),
  });
  const title = t("meta_title");
  const description = t("meta_description", store);

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: t("meta_keywords"),
    applicationName: "KeysArk",
    manifest: "/site.webmanifest",
    icons: ICONS,
    openGraph: {
      type: "website",
      siteName: "KeysArk",
      locale: htmlLang(locale),
      url: localeHref("/", locale),
      title,
      description,
      images: [{ url: OG_BANNER, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_BANNER],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#211D52",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  const themeRaw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme: Theme = themeRaw === "light" || themeRaw === "dark" ? themeRaw : "system";
  // light/dark → 给 <html> 加 class;system → 不加,交给 CSS 媒体查询。
  const themeClass = theme === "system" ? "" : theme;

  return (
    <html
      lang={htmlLang(locale)}
      className={`${inter.variable} ${themeClass}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers initialLocale={locale} initialTheme={theme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
