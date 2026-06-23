import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildBlocks } from "../components/PrintDocument";
import type { Product } from "./types";

// 企画書を「自己完結した HTML 文字列」に変換する。
// 動画は再生可能な <video> として埋め込む（HTML / 共有リンク用）。
export function renderShareableHtml(product: Product, includeCost: boolean, title: string): string {
  const body = renderToStaticMarkup(
    createElement(
      "div",
      {
        className: "print-doc",
        style: {
          width: 800,
          margin: "0 auto",
          background: "#fff",
          color: "#243029",
          padding: 26,
          boxShadow: "0 0 0 1px #e3e8e5",
          fontFamily: '"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif',
        },
      },
      ...buildBlocks(product, { includeCost, media: "embed" })
    )
  );

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; background: #f4f7f5; padding: 20px; }
  img, video { max-width: 100%; }
  @media print {
    body { background: #fff; padding: 0; }
    [data-pdf-block] { break-inside: avoid; page-break-inside: avoid; }
    @page { size: A4; margin: 10mm; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// 単体の HTML ファイルとしてダウンロード保存する。
export function exportHtml(product: Product, includeCost: boolean, filename: string, title: string): void {
  const html = renderShareableHtml(product, includeCost, title);
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
