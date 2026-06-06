"use client";

// 客户端语言 + 主题上下文。初始值由服务端从 cookie 读出并下传,SSR 与首帧一致,无闪烁。
// 主题 light/dark 通过 <html> 上的 class 控制;system 不加 class,交给 CSS 的 prefers-color-scheme。
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  htmlLang,
  LOCALE_COOKIE,
  THEME_COOKIE,
  translate,
  type Locale,
  type MsgKey,
  type Theme,
} from "@/lib/i18n";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
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
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setCookie(LOCALE_COOKIE, l);
    document.documentElement.lang = htmlLang(l);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setCookie(THEME_COOKIE, t);
    applyThemeClass(t);
  }, []);

  const localeValue = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale,
      t: (key, ...args) => translate(locale, key, ...args),
    }),
    [locale, setLocale],
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
