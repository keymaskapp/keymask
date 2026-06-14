import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./i18n";

/** 读取 middleware 注入的 x-locale 请求头,得到当前请求的语言;无则回退默认(英文)。 */
export async function getServerLocale(): Promise<Locale> {
  const h = await headers();
  const v = h.get("x-locale");
  return (LOCALES as string[]).includes(v ?? "") ? (v as Locale) : DEFAULT_LOCALE;
}
