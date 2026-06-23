import ExcelJS from "exceljs";
import type { Product } from "./types";
import { calcCost } from "./calc";

const GREEN = "FF2F6F55";
const GREEN_DARK = "FF243E33";
const HEAD_BLUE = "FF4285F4";
const LIGHT = "FFDAE5D8";
const YELLOW = "FFFFF6D6";

export async function exportExcel(product: Product, opts: { includeCost?: boolean } = {}): Promise<void> {
  const includeCost = opts.includeCost !== false;
  const wb = new ExcelJS.Workbook();
  wb.creator = "商品企画書ツール";
  wb.created = new Date();

  if (includeCost) buildCostSheet(wb, product);
  buildPlanningSheet(wb, product);

  const buf = await wb.xlsx.writeBuffer();
  const fname = includeCost ? `${safe(product.name)}_原価表・企画書.xlsx` : `${safe(product.name)}_企画書.xlsx`;
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fname);
}

function buildCostSheet(wb: ExcelJS.Workbook, product: Product) {
  const ws = wb.addWorksheet("原価表", { properties: { defaultColWidth: 14 }, views: [{ showGridLines: false }] });
  const c = product.cost;
  const calc = calcCost(c);

  ws.columns = [
    { width: 14 }, { width: 22 }, { width: 40 }, { width: 11 }, { width: 12 },
    { width: 13 }, { width: 11 }, { width: 15 }, { width: 18 }, { width: 11 }, { width: 22 },
  ];

  // タイトル
  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = `${product.name}　原価表`;
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = solid(GREEN_DARK);
  ws.getRow(1).height = 30;

  // 入力ブロック
  ws.getCell("A3").value = "入力項目";
  ws.getCell("B3").value = "値";
  ws.getCell("C3").value = "メモ";
  ["A3", "B3", "C3"].forEach((a) => headerCell(ws.getCell(a)));
  const inputs: [string, number, string, string][] = [
    ["セット総数", c.setTotal, "生産予定数", "#,##0"],
    ["売価（税別）", c.sellingPrice, "税別想定", '"¥"#,##0'],
    ["金型総額", c.moldTotal, "別途発生する場合の償却確認用", '"¥"#,##0'],
    ["粗利率目標", c.targetGrossMarginRate, "任意入力（率）", "0.0%"],
    ["消費税率", c.taxRate, "例: 0.1", "0.0%"],
    ["MOQ", c.moq, "", "#,##0"],
  ];
  inputs.forEach((row, i) => {
    const r = 4 + i;
    ws.getCell(`A${r}`).value = row[0];
    labelCell(ws.getCell(`A${r}`));
    const v = ws.getCell(`B${r}`);
    v.value = row[1];
    v.fill = solid(YELLOW);
    v.numFmt = row[3];
    v.alignment = { horizontal: "right" };
    v.border = thin();
    const m = ws.getCell(`C${r}`);
    m.value = row[2];
    m.border = thin();
  });

  // サマリー（数式参照）
  ws.getCell("E3").value = "サマリー";
  ws.mergeCells("E3:H3");
  headerCell(ws.getCell("E3"));

  const itemStart = 12;
  const itemEnd = itemStart + Math.max(c.items.length, 1) - 1;
  const setCostRef = `SUM(F${itemStart}:F${itemEnd})`;
  const orderRef = `SUM(H${itemStart}:H${itemEnd})`;

  const summary: [string, string, string][] = [
    ["セット原価", `${setCostRef}`, "#,##0"],
    ["売価", "B5", '"¥"#,##0'],
    ["粗利額", `B5-${setCostRef}`, "#,##0"],
    ["粗利率", `IFERROR((B5-${setCostRef})/B5,0)`, "0.0%"],
    ["原価率", `IFERROR(${setCostRef}/B5,0)`, "0.0%"],
    ["総発注金額", `${orderRef}`, "#,##0"],
    ["金型償却/セット", "IFERROR(B6/B4,0)", "#,##0"],
    ["金型償却込原価", `${setCostRef}+IFERROR(B6/B4,0)`, "#,##0"],
    ["損益分岐原価", "B5*(1-B7)", "#,##0"],
    ["粗利率目標差", `IFERROR((B5-${setCostRef})/B5,0)-B7`, "0.0%"],
  ];
  summary.forEach((row, i) => {
    const r = 4 + i;
    ws.getCell(`E${r}`).value = row[0];
    labelCell(ws.getCell(`E${r}`));
    ws.mergeCells(`G${r}:H${r}`);
    const v = ws.getCell(`G${r}`);
    v.value = { formula: row[1] } as ExcelJS.CellFormulaValue;
    v.numFmt = row[2];
    v.alignment = { horizontal: "right" };
    v.border = thin();
    ws.getCell(`F${r}`).border = thin();
  });

  // 明細ヘッダー
  const heads = ["区分", "品目", "仕様・メモ", "数量/セット", "単価", "セット原価", "発注数", "発注金額", "仕入先", "ステータス", "備考"];
  const hr = itemStart - 1;
  heads.forEach((h, i) => {
    const cell = ws.getCell(hr, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = solid(HEAD_BLUE);
    cell.border = thin();
  });

  c.items.forEach((it, i) => {
    const r = itemStart + i;
    ws.getCell(r, 1).value = it.category;
    ws.getCell(r, 2).value = it.item;
    ws.getCell(r, 3).value = it.spec;
    ws.getCell(r, 4).value = it.qtyPerSet;
    ws.getCell(r, 5).value = it.unitPrice;
    ws.getCell(r, 6).value = { formula: `D${r}*E${r}` } as ExcelJS.CellFormulaValue;
    ws.getCell(r, 7).value = it.orderQty;
    ws.getCell(r, 8).value = { formula: `E${r}*G${r}` } as ExcelJS.CellFormulaValue;
    ws.getCell(r, 9).value = it.supplier;
    ws.getCell(r, 10).value = it.status;
    ws.getCell(r, 11).value = it.note;
    [5, 6, 8].forEach((col) => (ws.getCell(r, col).numFmt = "#,##0"));
    ws.getCell(r, 3).alignment = { wrapText: true, vertical: "top" };
    for (let col = 1; col <= 11; col++) ws.getCell(r, col).border = thin();
    if (i % 2 === 1) for (let col = 1; col <= 11; col++) ws.getCell(r, col).fill = solid("FFF3F7F4");
  });

  // 合計行
  const totalRow = itemEnd + 2;
  ws.getCell(`E${totalRow}`).value = "合計";
  labelCell(ws.getCell(`E${totalRow}`));
  ws.getCell(`F${totalRow}`).value = { formula: setCostRef } as ExcelJS.CellFormulaValue;
  ws.getCell(`F${totalRow}`).numFmt = "#,##0";
  ws.getCell(`F${totalRow}`).font = { bold: true };
  ws.getCell(`F${totalRow}`).border = thin();
  ws.getCell(`H${totalRow}`).value = { formula: orderRef } as ExcelJS.CellFormulaValue;
  ws.getCell(`H${totalRow}`).numFmt = "#,##0";
  ws.getCell(`H${totalRow}`).border = thin();

  ws.getCell(`E${totalRow + 1}`).value = "粗利額";
  labelCell(ws.getCell(`E${totalRow + 1}`));
  ws.getCell(`F${totalRow + 1}`).value = { formula: `B5-${setCostRef}` } as ExcelJS.CellFormulaValue;
  ws.getCell(`F${totalRow + 1}`).numFmt = "#,##0";
  ws.getCell(`F${totalRow + 1}`).font = { bold: true, color: { argb: "FFE60012" } };
  ws.getCell(`F${totalRow + 1}`).border = thin();

  ws.getCell(`E${totalRow + 2}`).value = "粗利率";
  labelCell(ws.getCell(`E${totalRow + 2}`));
  ws.getCell(`F${totalRow + 2}`).value = { formula: `IFERROR((B5-${setCostRef})/B5,0)` } as ExcelJS.CellFormulaValue;
  ws.getCell(`F${totalRow + 2}`).numFmt = "0.0%";
  ws.getCell(`F${totalRow + 2}`).font = { bold: true, color: { argb: "FFE60012" } };
  ws.getCell(`F${totalRow + 2}`).border = thin();

  ws.views = [{ state: "frozen", ySplit: itemStart - 1, showGridLines: false }];
  void calc;
}

function buildPlanningSheet(wb: ExcelJS.Workbook, product: Product) {
  const ws = wb.addWorksheet("商品企画書", { properties: { defaultColWidth: 18 }, views: [{ showGridLines: false }] });
  const p = product.planning;
  const calc = calcCost(product.cost);
  ws.columns = [{ width: 18 }, { width: 32 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  let r = 1;
  ws.mergeCells(`A${r}:F${r}`);
  const t = ws.getCell(`A${r}`);
  t.value = "商 品 企 画 書";
  t.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
  t.alignment = { horizontal: "center", vertical: "middle" };
  t.fill = solid(GREEN_DARK);
  ws.getRow(r).height = 34;
  r += 2;

  // ラベル＋値（テキスト）
  const kv = (label: string, value: string) => {
    ws.getCell(`A${r}`).value = label;
    labelCell(ws.getCell(`A${r}`));
    ws.mergeCells(`B${r}:F${r}`);
    const v = ws.getCell(`B${r}`);
    v.value = value || "";
    v.alignment = { wrapText: true, vertical: "top" };
    box(ws, r, 1, 6);
    const text = value || "";
    const lines = Math.max(1, (text.match(/\n/g)?.length ?? 0) + 1, Math.ceil(text.length / 46));
    ws.getRow(r).height = Math.max(22, lines * 15);
    r++;
  };

  // ラベル＋数値
  const price = (label: string, value: number, fmt: string) => {
    ws.getCell(`A${r}`).value = label;
    labelCell(ws.getCell(`A${r}`));
    ws.mergeCells(`B${r}:F${r}`);
    const v = ws.getCell(`B${r}`);
    v.value = value;
    v.numFmt = fmt;
    v.alignment = { horizontal: "right", vertical: "middle" };
    box(ws, r, 1, 6);
    ws.getRow(r).height = 22;
    r++;
  };

  kv("商品名", product.name);
  kv("発売時期", p.releasePeriod);
  kv("担当", p.person);
  kv("ヘッドコピー", p.headCopy);
  kv("他社にない訴求点", p.sellingPoints);

  // 商品説明（内容がある場合のみ）
  if (p.specSections.length > 0) {
    band(ws, r, "商 品 説 明"); r++;
    p.specSections.forEach((s) => {
      ws.getCell(`A${r}`).value = s.heading;
      ws.getCell(`A${r}`).font = { bold: true };
      ws.getCell(`A${r}`).alignment = { vertical: "top", wrapText: true };
      ws.mergeCells(`B${r}:F${r}`);
      ws.getCell(`B${r}`).value = s.bullets.map((b) => "● " + b).join("\n");
      ws.getCell(`B${r}`).alignment = { wrapText: true, vertical: "top" };
      box(ws, r, 1, 6);
      ws.getRow(r).height = Math.max(22, s.bullets.length * 15);
      r++;
    });
  }

  // 価格
  band(ws, r, "商 品 価 格"); r++;
  price("目標売価（税別）", calc.sellingPrice, '"¥"#,##0');
  price("目標売価（税込）", calc.priceInclTax, '"¥"#,##0');
  price("粗利額（税別）", calc.grossProfit, '"¥"#,##0');
  price("粗利額（税込）", calc.grossProfitInclTax, '"¥"#,##0');
  price("掛け率", calc.rateOnPrice, "0.0%");
  price("MOQ", product.cost.moq, "#,##0");

  // 仕様
  band(ws, r, "商 品 仕 様"); r++;
  kv("カラー", p.color);
  kv("同梱品", p.includedItems);
  kv("仕様", p.specText);
  kv("電源", p.power);
  kv("素材", p.material);
  kv("原産地", p.origin);
  kv("承認等", p.approvals);

  // バーコード
  band(ws, r, "商品バーコード・JAN"); r++;
  ["型番", "カラー", "JAN"].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.fill = solid(LIGHT);
    cell.font = { bold: true };
    cell.border = thin();
  });
  ws.getCell(r, 4).border = thin();
  r++;
  p.barcodes.forEach((b) => {
    ws.getCell(r, 1).value = b.model;
    ws.getCell(r, 2).value = b.color;
    ws.getCell(r, 3).value = b.jan;
    for (let col = 1; col <= 4; col++) ws.getCell(r, col).border = thin();
    r++;
  });

  // サイズ
  band(ws, r, "サイズ・梱包・重量"); r++;
  ["区分", "W", "D", "H", "入数", "重量"].forEach((h, i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = h;
    cell.fill = solid(LIGHT);
    cell.font = { bold: true };
    cell.border = thin();
  });
  r++;
  p.sizes.forEach((s) => {
    ws.getCell(r, 1).value = s.label;
    ws.getCell(r, 2).value = s.w;
    ws.getCell(r, 3).value = s.d;
    ws.getCell(r, 4).value = s.h;
    ws.getCell(r, 5).value = s.qty;
    ws.getCell(r, 6).value = s.weight;
    for (let col = 1; col <= 6; col++) ws.getCell(r, col).border = thin();
    r++;
  });

  // その他（内容がある項目のみ）
  const extras: [string, string][] = [
    ["試験情報", p.testInfo],
    ["別売品", p.separateItems],
    ["その他・特記事項", p.notes],
    ["備考", p.remarks],
  ].filter(([, v]) => (v || "").trim() !== "") as [string, string][];
  if (extras.length) {
    band(ws, r, "その他・特記事項"); r++;
    extras.forEach(([k, v]) => kv(k, v));
  }

  r++;
  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = p.footerNote;
  ws.getCell(`A${r}`).font = { italic: true, size: 9, color: { argb: "FF888888" } };
}

// ===== セルスタイル補助 =====
function solid(argb: string): ExcelJS.FillPattern {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function headerCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = solid(GREEN);
  cell.border = thin();
}
function labelCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.fill = solid("FFEAF4EF");
  cell.border = thin();
  cell.alignment = { vertical: "middle" };
}
function band(ws: ExcelJS.Worksheet, r: number, label: string) {
  ws.mergeCells(`A${r}:F${r}`);
  const cell = ws.getCell(`A${r}`);
  cell.value = label;
  cell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = solid("FF497160");
  ws.getRow(r).height = 24;
}
function box(ws: ExcelJS.Worksheet, row: number, from: number, to: number) {
  for (let c = from; c <= to; c++) ws.getCell(row, c).border = thin();
}
function thin(): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style: "thin", color: { argb: "FFCCCCCC" } };
  return { top: s, left: s, bottom: s, right: s };
}

function safe(name: string): string {
  return (name || "product").replace(/[\\/:*?"<>|]/g, "_");
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
