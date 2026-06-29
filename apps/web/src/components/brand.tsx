// KeyMask 官方品牌标识(取自 logos 资源包 mark-violet):盾形外壳 + 镂空钥匙孔,
// 单色实心(evenodd 把钥匙孔从盾形里挖空,透出背景),整体跟随主色(随主题深浅自适应)。
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="2 7 96 96"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 20 Q16 17 19 17 H81 Q84 17 84 20 V46 C84 67 69 83 50 92 C31 83 16 67 16 46 Z M60 43 A10 10 0 1 0 40 43 A10 10 0 1 0 60 43 Z M44 51 L56 51 L60.5 70 Q61 72 59 72 L41 72 Q39 72 39.5 70 Z"
        className="fill-[var(--color-primary)]"
      />
    </svg>
  );
}

// GitHub 标识(lucide v1 已移除品牌图标,这里内嵌官方 mark)。
export function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}>
      <Logo className="h-6 w-6" />
      <span>
        Key<span className="text-[var(--color-primary)]">Mask</span>
      </span>
    </span>
  );
}
