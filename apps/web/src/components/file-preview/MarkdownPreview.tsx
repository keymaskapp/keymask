"use client";

// Markdown 预览:已解密明文 → markdown-it 渲染为格式化 HTML(懒加载)。
// 安全:html:false 关掉原始 HTML 注入;markdown-it 默认 validateLink 拦截
// javascript:/vbscript:/file: 等不安全 scheme。无需额外 DOMPurify。
// 隐私:默认不自动加载图片(<img> 会在渲染时就发外部 HTTPS 请求,暴露阅读行为/
// 文件内嵌 URL)。把图片改渲染为「点击在新标签打开」的链接,请求改为用户主动发起。
import { useEffect, useState } from "react";
import { useT } from "../providers";
import { testId } from "@/lib/test-id";
import { HIGHLIGHT_MAX_BYTES, TEXT_MAX_BYTES, TEXT_MAX_LABEL } from "@/lib/file-preview";

type State =
  | { phase: "loading" }
  | { phase: "rendered"; html: string }
  | { phase: "plain"; text: string }
  | { phase: "error"; message: string };

export function MarkdownPreview({ bytes }: { bytes: Uint8Array }) {
  const t = useT();
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    (async () => {
      const size = bytes.byteLength;
      if (size > TEXT_MAX_BYTES) {
        if (!cancelled) setState({ phase: "error", message: t("preview_too_large", TEXT_MAX_LABEL) });
        return;
      }
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        if (!cancelled) setState({ phase: "error", message: t("preview_decode_fail") });
        return;
      }
      // >1MB 不解析(markdown-it 对超大文档较慢),直接显示源文本。
      if (size > HIGHLIGHT_MAX_BYTES) {
        if (!cancelled) setState({ phase: "plain", text });
        return;
      }
      try {
        const { default: MarkdownIt } = await import("markdown-it");
        const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
        // 外链新窗口打开 + noopener。
        const defaultLinkOpen =
          md.renderer.rules.link_open ??
          ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
        md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
          tokens[idx]?.attrSet("target", "_blank");
          tokens[idx]?.attrSet("rel", "noopener noreferrer");
          return defaultLinkOpen(tokens, idx, options, env, self);
        };
        // 图片不自动加载:渲染成点击才打开(新标签)的链接,避免渲染即发外部请求。
        // src 已过 markdown-it 的 validateLink(挡 javascript: 等);此处仅做 HTML 转义。
        md.renderer.rules.image = (tokens, idx) => {
          const tok = tokens[idx];
          const src = tok?.attrGet("src") ?? "";
          const alt = (tok?.content || tok?.attrGet("alt") || src).trim() || src;
          const esc = md.utils.escapeHtml;
          return `<a class="md-img-link" href="${esc(src)}" target="_blank" rel="noopener noreferrer nofollow">🖼 ${esc(alt)}</a>`;
        };
        const html = md.render(text);
        if (!cancelled) setState({ phase: "rendered", html });
      } catch {
        if (!cancelled) setState({ phase: "plain", text });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bytes, t]);

  if (state.phase === "loading") {
    return <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{t("preview_loading")}</div>;
  }
  if (state.phase === "error") {
    return <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{state.message}</div>;
  }
  if (state.phase === "plain") {
    return (
      <pre className="max-h-[60vh] overflow-auto px-4 py-3 text-xs leading-relaxed">
        <code className="block whitespace-pre font-mono">{state.text}</code>
      </pre>
    );
  }
  return (
    <div
      {...testId("vault-item-markdown-preview")}
      className="md-preview max-h-[60vh] overflow-auto px-5 py-4 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: state.html }}
    />
  );
}
