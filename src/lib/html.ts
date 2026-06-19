// 企画書を単体の HTML ファイルとして書き出す。
// PrintDocument はインラインスタイルのみで構成されているため、複製して
// 画面外配置を解除すれば、そのまま自己完結した HTML になる。
export function exportHtml(el: HTMLElement, filename: string, title: string): void {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.position = "static";
  clone.style.left = "auto";
  clone.style.top = "auto";
  clone.style.margin = "0 auto";
  clone.style.boxShadow = "0 0 0 1px #e3e8e5";

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #f4f7f5; padding: 20px; }
  @media print {
    body { background: #fff; padding: 0; }
    [data-pdf-block] { break-inside: avoid; page-break-inside: avoid; }
    @page { size: A4; margin: 10mm; }
  }
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
