"use client";

// 头部控制:语言(地球图标)+ 主题(随当前选择显示日/月/显示器图标),
// 均为图标按钮点击展开下拉切换,选中项右侧打勾。
import { Check, Globe, Monitor, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@keysark/ui";
import { useLocale, useTheme } from "./providers";
import { LOCALES, THEMES, type Theme } from "@/lib/i18n";

// 头部圆形图标按钮样式(语言/主题/文档共用,保持视觉一致)。
export const CONTROL_TRIGGER =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] data-[state=open]:bg-[var(--color-accent)]";

function ThemeGlyph({ theme, className }: { theme: Theme; className?: string }) {
  if (theme === "light") return <Sun className={className} />;
  if (theme === "dark") return <Moon className={className} />;
  return <Monitor className={className} />;
}

export function HeaderControls() {
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* 语言 */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={CONTROL_TRIGGER}
          aria-label={locale === "zh" ? "切换语言" : "Switch language"}
        >
          <Globe className="h-[1.05rem] w-[1.05rem]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {LOCALES.map((l) => (
            <DropdownMenuItem key={l} onSelect={() => setLocale(l)}>
              <span className="flex-1">{l === "zh" ? "中文" : "English"}</span>
              {locale === l ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 主题 */}
      <DropdownMenu>
        <DropdownMenuTrigger className={CONTROL_TRIGGER} aria-label={t("theme_label")}>
          <ThemeGlyph theme={theme} className="h-[1.05rem] w-[1.05rem]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {THEMES.map((th) => (
            <DropdownMenuItem key={th} onSelect={() => setTheme(th)}>
              <ThemeGlyph theme={th} className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="flex-1">{t(`theme_${th}`)}</span>
              {theme === th ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
