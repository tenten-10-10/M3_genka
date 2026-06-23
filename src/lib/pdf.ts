import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// 文書を「ブロック（セクション）」単位で A4 に配置する。
// 各ブロックは途中で分断されないように改ページする。
// 既定では「なるべく maxPages(=2) 枚以内」に収まるよう、超過する場合のみ
// 全体を等倍縮小（アスペクト比は維持、中央寄せ）して収める。
export async function exportPdf(
  el: HTMLElement,
  filename: string,
  opts: { maxPages?: number; minScale?: number } = {}
): Promise<void> {
  const maxPages = opts.maxPages ?? 2;
  const minScale = opts.minScale ?? 0.6;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const baseGap = 2.5; // ブロック間の余白(mm)

  const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-block]"));
  const targets = blocks.length > 0 ? blocks : [el];

  // 各ブロックを1度だけ描画し、全幅配置時の高さ(mm)を測定して保持
  const items: { dataURL: string; origH: number }[] = [];
  for (const block of targets) {
    const canvas = await html2canvas(block, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: el.scrollWidth,
    });
    const origH = (canvas.height * contentW) / canvas.width;
    items.push({ dataURL: canvas.toDataURL("image/jpeg", 0.92), origH });
  }

  // 指定スケールで配置をシミュレート（draw=false）または実描画（draw=true）。戻り値はページ数。
  function layout(s: number, draw: boolean): number {
    const gap = baseGap * s;
    let pages = 1;
    let cursorY = margin;
    let first = true;
    const newPage = () => {
      pages++;
      if (draw) pdf.addPage();
      cursorY = margin;
    };
    for (const it of items) {
      const imgW = contentW * s;
      const imgH = it.origH * s;
      const x = margin + (contentW - imgW) / 2; // 縮小時は中央寄せ

      if (imgH <= contentH) {
        if (!first && cursorY + imgH > pageH - margin) newPage();
        if (draw) pdf.addImage(it.dataURL, "JPEG", x, cursorY, imgW, imgH);
        cursorY += imgH + gap;
        first = false;
      } else {
        // 1ページより高いブロック：新ページから開始し、スライスして複数ページに分割
        if (!first) newPage();
        let heightLeft = imgH;
        const position = margin;
        if (draw) pdf.addImage(it.dataURL, "JPEG", x, position, imgW, imgH);
        heightLeft -= pageH - position;
        while (heightLeft > 0) {
          newPage();
          const pos = -(imgH - heightLeft);
          if (draw) pdf.addImage(it.dataURL, "JPEG", x, pos, imgW, imgH);
          heightLeft -= pageH;
        }
        cursorY = pageH; // 次のブロックは新ページから
        first = false;
      }
    }
    return pages;
  }

  // スケール決定：等倍で maxPages 超過なら、収まる最大スケールを探索（下限 minScale）
  let scale = 1;
  if (layout(1, false) > maxPages) {
    scale = minScale;
    for (let s = 1; s >= minScale; s -= 0.02) {
      if (layout(s, false) <= maxPages) {
        scale = Math.round(s * 100) / 100;
        break;
      }
    }
  }

  layout(scale, true);
  pdf.save(filename);
}
