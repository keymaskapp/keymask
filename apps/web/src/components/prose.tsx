// 长文内容的结构化渲染:内容以 Block[] 数据形式书写(便于中英双语并排维护),
// 这里渲染成带主题色的排版。纯文本进 React 文本节点,无 HTML 注入面;段落内支持 `行内代码`。
import { Fragment } from "react";
import { testId } from "@/lib/test-id";

export type Block =
  | { k: "h2"; t: string }
  | { k: "p"; t: string }
  | { k: "ul"; items: string[] }
  | { k: "code"; t: string }
  | { k: "quote"; t: string };

/** 段落内 `反引号` 渲染为行内代码;其余为普通文本。 */
function Inline({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[0.85em]"
          >
            {p}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div {...testId("prose")} className="flex flex-col gap-5 text-[var(--color-foreground)]">
      {blocks.map((b, i) => {
        switch (b.k) {
          case "h2":
            return (
              <h2 key={i} className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
                <Inline text={b.t} />
              </h2>
            );
          case "p":
            return (
              <p key={i} className="leading-relaxed text-[var(--color-muted-foreground)]">
                <Inline text={b.t} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="flex flex-col gap-2 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5 leading-relaxed text-[var(--color-muted-foreground)]">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                    <span>
                      <Inline text={it} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 font-mono text-xs leading-relaxed"
              >
                <code>{b.t}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-[var(--color-primary)] pl-4 italic leading-relaxed text-[var(--color-muted-foreground)]"
              >
                <Inline text={b.t} />
              </blockquote>
            );
        }
      })}
    </div>
  );
}
