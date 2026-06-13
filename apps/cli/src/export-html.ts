// 把解密后的保险库渲染成一个自包含、可离线打开的静态 HTML(零网络请求、无外部资源)。
// 注意:这个文件里出现的全是已解密的明文 —— 它只会被 `ark local` 写到用户本机指定的输出目录,
// 绝不上传、绝不经过任何服务端。生成方(CLI)和产物(HTML)都只在用户机器上。

export interface ExportItem {
  id: string;
  title: string;
  folderPath: string; // "" = 根目录
  kind: "text" | "file";
  content?: string; // 文本条目正文(明文)
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  fileHref?: string; // 文件条目:导出到输出目录后的相对路径
  createdAt: number;
  updatedAt: number;
  provider?: string;
  versions?: number;
}

export interface ExportData {
  vaultLabel: string;
  vaultId: string;
  source: string; // 备份来源路径(展示用)
  exportedAt: number;
  items: ExportItem[];
}

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const fmtTime = (ms: number): string => (ms ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") : "");

const fmtBytes = (n?: number): string => {
  if (n === undefined) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

function renderItem(it: ExportItem): string {
  const folder = it.folderPath ? `<span class="badge folder">${esc(it.folderPath)}</span>` : "";
  const provider = it.provider ? `<span class="badge src">${esc(it.provider)}</span>` : "";
  const versions = it.versions && it.versions > 1 ? `<span class="badge ver">v${it.versions}</span>` : "";
  const kindBadge = it.kind === "file" ? `<span class="badge file">file</span>` : "";
  const haystack = esc(`${it.title} ${it.folderPath} ${it.provider ?? ""} ${it.content ?? ""}`).toLowerCase();

  let body: string;
  if (it.kind === "file") {
    const meta = [it.mimeType, fmtBytes(it.fileSize)].filter(Boolean).join(" · ");
    body = it.fileHref
      ? `<p class="filemeta">${esc(it.filename ?? "")} <span class="muted">${esc(meta)}</span></p>
         <a class="dl" href="${esc(it.fileHref)}" download>↓ Download file</a>`
      : `<p class="muted">(binary file — not exported)</p>`;
  } else {
    const content = it.content ?? "";
    body = content.trim()
      ? `<pre class="content">${esc(content)}</pre>`
      : `<p class="muted">(empty)</p>`;
  }

  return `<article class="item" data-search="${haystack}">
    <header class="item-h">
      <h2>${esc(it.title || "(untitled)")}</h2>
      <div class="badges">${folder}${kindBadge}${provider}${versions}</div>
    </header>
    <div class="meta">
      <code>${esc(it.id.slice(0, 8))}</code>
      <span>updated ${esc(fmtTime(it.updatedAt))}</span>
      <span class="muted">created ${esc(fmtTime(it.createdAt))}</span>
    </div>
    ${body}
  </article>`;
}

export function renderVaultHtml(data: ExportData): string {
  const items = data.items;
  const itemsHtml = items.length
    ? items.map(renderItem).join("\n")
    : `<p class="muted empty">This vault has no items.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<title>KeysArk · ${esc(data.vaultLabel || "vault")}</title>
<style>
  :root {
    --bg: #0b0e14; --panel: #131722; --line: #232838; --fg: #e6e9ef;
    --muted: #8b93a7; --accent: #5b9dff; --chip: #1c2235; --pre: #0e121b;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; }
  a { color: var(--accent); }
  .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 80px; }
  header.top { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 22px; }
  .brand { font-weight: 700; letter-spacing: .3px; }
  .brand .k { color: var(--accent); }
  h1 { font-size: 22px; margin: 8px 0 4px; }
  .sub { color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px 14px; }
  .sub code { color: var(--fg); }
  .search { width: 100%; margin: 20px 0 4px; padding: 11px 14px; border-radius: 10px;
    border: 1px solid var(--line); background: var(--panel); color: var(--fg); font-size: 14px; }
  .search:focus { outline: none; border-color: var(--accent); }
  .count { color: var(--muted); font-size: 13px; margin: 8px 2px 18px; }
  .item { background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 16px 18px; margin-bottom: 14px; }
  .item-h { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
  .item-h h2 { font-size: 16px; margin: 0; word-break: break-word; }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--chip);
    color: var(--muted); white-space: nowrap; }
  .badge.folder { color: #c3a6ff; } .badge.file { color: #6fd3a0; }
  .badge.src { color: #ffce6f; } .badge.ver { color: var(--accent); }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--muted);
    margin: 8px 0 12px; }
  .meta code { background: var(--chip); padding: 1px 6px; border-radius: 5px; color: var(--fg); }
  pre.content { background: var(--pre); border: 1px solid var(--line); border-radius: 8px;
    padding: 12px 14px; margin: 0; overflow-x: auto; white-space: pre-wrap; word-break: break-word;
    font: 13px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }
  .muted { color: var(--muted); }
  .filemeta { margin: 0 0 10px; }
  .dl { display: inline-block; padding: 7px 13px; border: 1px solid var(--line); border-radius: 8px;
    text-decoration: none; font-size: 13px; }
  .dl:hover { border-color: var(--accent); }
  .empty { text-align: center; padding: 40px 0; }
  footer { color: var(--muted); font-size: 12px; margin-top: 30px; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand"><span class="k">Keys</span>Ark</div>
    <h1>${esc(data.vaultLabel || "(default)")}</h1>
    <div class="sub">
      <span>vault <code>${esc(data.vaultId.slice(0, 8))}</code></span>
      <span>${items.length} item${items.length === 1 ? "" : "s"}</span>
      <span>exported ${esc(fmtTime(data.exportedAt))}</span>
      <span class="muted">from ${esc(data.source)}</span>
    </div>
  </header>
  <input id="q" class="search" type="search" placeholder="Search title, folder, content…" autocomplete="off" />
  <div id="count" class="count"></div>
  <main id="list">
${itemsHtml}
  </main>
  <footer>Decrypted locally with <span class="brand"><span class="k">Keys</span>Ark</span> · this file stays on your machine</footer>
</div>
<script>
  (function () {
    var q = document.getElementById("q");
    var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
    var count = document.getElementById("count");
    function apply() {
      var term = q.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (el) {
        var hit = !term || el.getAttribute("data-search").indexOf(term) !== -1;
        el.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      count.textContent = term ? shown + " of " + items.length + " match" : "";
    }
    q.addEventListener("input", apply);
  })();
</script>
</body>
</html>`;
}
