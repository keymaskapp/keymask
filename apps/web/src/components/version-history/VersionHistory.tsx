"use client";

// 历史版本面板(冷路径):仅在用户点开"历史"时才 listVersions / 拉旧版,
// 绝不在条目打开时预取。旧版预览复用 FilePreview(文件)/纯文本(文本)。
import { useEffect, useState } from "react";
import { Button } from "@keysark/ui";
import { History, RotateCcw, X } from "lucide-react";
import { useT } from "../providers";
import { testId } from "@/lib/test-id";
import { FilePreview } from "../file-preview/FilePreview";
import type { EntryMeta, Vault, VersionMeta } from "@/lib/vault";

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function VersionHistory({
  vault,
  entry,
  busy,
  onRestore,
  onClose,
}: {
  vault: Vault;
  entry: EntryMeta;
  busy: boolean;
  onRestore: (ts: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [versions, setVersions] = useState<VersionMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVersions(null);
    setError(null);
    vault
      .listVersions(entry.id)
      .then((vs) => {
        if (cancelled) return;
        setVersions(vs);
        setSel(vs[0]?.ts ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(t("history_load_fail", String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [vault, entry.id, t]);

  // 选中版本的文本正文(仅文本条目;文件走 FilePreview)。
  useEffect(() => {
    if (sel == null || entry.kind === "file") {
      setText(null);
      return;
    }
    let cancelled = false;
    setText(null);
    vault
      .openVersion(entry.id, sel)
      .then((doc) => {
        if (!cancelled) setText(doc.content);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vault, entry.id, entry.kind, sel]);

  return (
    <div
      {...testId("vault-version-history")}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent)]"
    >
      <div
        {...testId("vault-version-history-header")}
        className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-2.5"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          {t("history_title")}
          {versions ? (
            <span className="text-xs font-normal text-[var(--color-muted-foreground)]">
              · {t("version_count", versions.length)}
            </span>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
          {t("history_close")}
        </Button>
      </div>

      {error ? (
        <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{error}</div>
      ) : !versions ? (
        <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{t("preview_loading")}</div>
      ) : versions.length === 0 ? (
        <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">{t("history_empty")}</div>
      ) : (
        <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          {/* 版本列表 */}
          <ul
            {...testId("vault-version-list")}
            className="max-h-[60vh] overflow-auto border-r border-[var(--color-border)] py-1"
          >
            {versions.map((v) => {
              const isCurrent = v.ts === entry.updatedAt;
              const active = v.ts === sel;
              return (
                <li key={v.ts} {...testId("vault-version-item")}>
                  <button
                    type="button"
                    onClick={() => setSel(v.ts)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left text-xs hover:bg-[var(--color-muted)] ${
                      active ? "bg-[var(--color-muted)]" : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {new Date(v.ts).toLocaleString()}
                      {isCurrent ? (
                        <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary-foreground)]">
                          {t("version_current")}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[var(--color-muted-foreground)]">{humanSize(v.size)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* 选中版本预览 + 还原 */}
          <div {...testId("vault-version-preview")} className="flex min-w-0 flex-col">
            <div className="min-h-0 flex-1">
              {sel == null ? null : entry.kind === "file" ? (
                <FilePreview
                  entryId={`${entry.id}:${sel}`}
                  filename={entry.filename || entry.title}
                  loadBytes={() => vault.openFileVersion(entry.id, sel)}
                />
              ) : text == null ? (
                <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">
                  {t("preview_loading")}
                </div>
              ) : (
                <pre className="max-h-[52vh] overflow-auto px-4 py-3 text-xs leading-relaxed">
                  <code className="block whitespace-pre-wrap break-words font-mono">{text}</code>
                </pre>
              )}
            </div>
            {sel != null && sel !== entry.updatedAt ? (
              <div className="border-t border-[var(--color-border)] px-4 py-2.5">
                <Button size="sm" onClick={() => onRestore(sel)} disabled={busy}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("version_restore")}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
