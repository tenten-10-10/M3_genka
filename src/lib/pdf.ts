import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// 文書を「ブロック（セクション）」単位で A4 に配置する。
// 各ブロックが現在のページの残り高さに収まらなければ次ページへ送り、
// セクションが途中で分断されないようにする。
export async function exportPdf(el: HTMLElement, filename: string): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const gap = 2.5; // ブロック間の余白(mm)

  const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-block]"));
  const targets = blocks.length > 0 ? blocks : [el];

  let cursorY = margin;
  let first = true;

  for (const block of targets) {
    const canvas = await html2canvas(block, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: el.scrollWidth,
    });
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (imgH <= contentH) {
      // 1ページに収まるブロック：残りに入らなければ改ページ
      if (!first && cursorY + imgH > pageH - margin) {
        pdf.addPage();
        cursorY = margin;
      }
      pdf.addImage(imgData, "JPEG", margin, cursorY, imgW, imgH);
      cursorY += imgH + gap;
    } else {
      // ページより高いブロック：新ページから開始し、スライスして複数ページに分割
      if (!first) {
        pdf.addPage();
        cursorY = margin;
      }
      let heightLeft = imgH;
      let position = margin; // 先頭ページの上余白
      pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
      heightLeft -= pageH - position;
      while (heightLeft > 0) {
        pdf.addPage();
        position = -(imgH - heightLeft); // 次の見える部分をページ上端へ
        pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
        heightLeft -= pageH;
      }
      cursorY = pageH; // 次のブロックは新ページから
    }
    first = false;
  }

  pdf.save(filename);
}
