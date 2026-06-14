"use client";

// 客户端语言 + 主题上下文。初始值由服务端下传,SSR 与首帧一致,无闪烁。
// 语言由 URL 决定(默认英文在根,其它语言走 /<locale> 前缀),切换语言是整页导航,
// 因此 locale 在单次页面加载内固定——这里直接用服务端下传的值,不在客户端改写。
// 主题 light/dark 通过 <html> 上的 class 控制;system 不加 class,交给 prefers-color-scheme。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  htmlLang,
  THEME_COOKIE,
  translate,
  type Locale,
  type MsgKey,
  type Theme,
} from "@/lib/i18n";

interface LocaleCtx {
  locale: Locale;
  t: (key: MsgKey, ...args: unknown[]) => string;
}
interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const LocaleContext = createContext<LocaleCtx | null>(null);
const ThemeContext = createContext<ThemeCtx | null>(null);

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "light" || theme === "dark") root.classList.add(theme);
  // system: 不加 class,CSS 的 @media (prefers-color-scheme) 接管
}

export function Providers({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // 软导航时根布局的 <html lang> 不会重渲染;语言切换走整页导航,这里兜底同步一次。
  useEffect(() => {
    document.documentElement.lang = htmlLang(initialLocale);
  }, [initialLocale]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setCookie(THEME_COOKIE, t);
    applyThemeClass(t);
  }, []);

  const localeValue = useMemo<LocaleCtx>(
    () => ({
      locale: initialLocale,
      t: (key, ...args) => translate(initialLocale, key, ...args),
    }),
    [initialLocale],
  );
  const themeValue = useMemo<ThemeCtx>(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <LocaleContext.Provider value={localeValue}>{children}</LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <Providers>");
  return ctx;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <Providers>");
  return ctx;
}

/** 便捷:只取取词函数。 */
export function useT() {
  return useLocale().t;
}
