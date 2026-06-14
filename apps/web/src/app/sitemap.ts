import type { MetadataRoute } from "next";
import { localeHref } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:6134";
const abs = (path: string) => new URL(path, SITE_URL).toString();

// 公开可索引的页面;每条带 hreflang 备用链接(英文默认无前缀,中文走 /zh)。
const PUBLIC_PATHS = ["/", "/docs"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: abs(localeHref(path, "en")),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
    alternates: {
      languages: {
        en: abs(localeHref(path, "en")),
        "zh-CN": abs(localeHref(path, "zh")),
      },
    },
  }));
}
