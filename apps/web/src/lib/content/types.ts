import type { Block } from "@/components/prose";
import type { Locale } from "@/lib/i18n";

/** 一篇内容页(about / privacy)的双语数据。 */
export interface DocPage {
  title: string;
  description: string;
  body: Block[];
}

export type DocContent = Record<Locale, DocPage>;
