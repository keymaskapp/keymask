import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import {
  htmlLang,
  LOCALE_COOKIE,
  THEME_COOKIE,
  type Locale,
  type Theme,
} from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "KeysArk — 端到端加密保管库 / End-to-end encrypted vault",
  description:
    "端到端加密的文本保管库。内容在你的浏览器里用 BIP39 助记词派生密钥加密,服务端与百度网盘只经手密文。",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const locale = (store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "zh") as Locale;
  const themeRaw = store.get(THEME_COOKIE)?.value;
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
