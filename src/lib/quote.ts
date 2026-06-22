// 見積もりPDF（外貨建て）を解析し、原価明細へ取り込むためのユーティリティ。
// - PDF からテキスト行を抽出（pdfjs はファイル解析時にのみ遅延ロード）
// - 行から「品目・単価・通貨・MOQ」を抽出（parseQuote は純粋関数でテスト可能）
// - 為替レートの取得・換算

export type Currency = "USD" | "CNY" | "EUR" | "JPY";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "USD", label: "USドル", symbol: "$" },
  { code: "CNY", label: "人民元", symbol: "元" },
  { code: "EUR", label: "ユーロ", symbol: "€" },
  { code: "JPY", label: "日本円", symbol: "¥" },
];

export interface Rates {
  USD: number;
  CNY: number;
  EUR: number;
  JPY: number;
}

// 既定レート（取得失敗時のフォールバック。手動で調整可能）
export const DEFAULT_RATES: Rates = { USD: 155, CNY: 21.5, EUR: 168, JPY: 1 };

export interface QuoteItem {
  description: string; // 品目名
  spec: string; // 仕様・メモ（材質・サイズ等）
  currency: Currency;
  unitPrice: number; // 原貨建て単価
  moq: string; // 原文の MOQ 表記（例: 3k）
  moqQty: number; // 数値化した MOQ（発注数の初期値に利用）
}

export interface ParsedQuote {
  supplier: string; // 仕入先（見積発行元）
  quoteNo: string;
  date: string;
  items: QuoteItem[];
  currencies: Currency[];
  lines: string[]; // 抽出した行（確認用）
}

// ---- 価格抽出 ----
interface PriceHit {
  currency: Currency;
  value: number;
  start: number;
  end: number;
}

const NUM = "([0-9][0-9,]*(?:\\.[0-9]+)?)";

function firstPrice(line: string): PriceHit | null {
  const patterns: { re: RegExp; cur: Currency }[] = [
    { re: new RegExp(`(?:US\\$|USD|＄|\\$)\\s*${NUM}`, "i"), cur: "USD" },
    { re: new RegExp(`(?:€|EUR)\\s*${NUM}`, "i"), cur: "EUR" },
    { re: new RegExp(`(?:RMB|CNY|人民币|人民元)\\s*${NUM}`, "i"), cur: "CNY" },
    { re: new RegExp(`${NUM}\\s*元`), cur: "CNY" },
    { re: new RegExp(`(?:JPY|￥|¥)\\s*${NUM}`, "i"), cur: "JPY" },
    { re: new RegExp(`${NUM}\\s*円`), cur: "JPY" },
  ];
  let best: PriceHit | null = null;
  for (const p of patterns) {
    const m = p.re.exec(line);
    if (!m || m.index == null) continue;
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    const hit: PriceHit = { currency: p.cur, value, start: m.index, end: m.index + m[0].length };
    if (!best || hit.start < best.start) best = hit;
  }
  return best;
}

function cleanDesc(line: string, hit: PriceHit): string {
  let d = line.slice(0, hit.start);
  d = d.replace(/^\s*\d+[\s.):、]+/, ""); // 先頭の項番（1 / 2) / 3.）
  d = d.replace(/MOQ[:：]?\s*\S+/gi, " ");
  d = d.replace(/\b[0-9][0-9,]*\s*[kK]\b/g, " "); // 3k など
  d = d.replace(/\b[0-9][0-9,]*\s*(?:pcs|pc|個|set|sets|台|本)\b/gi, " ");
  d = d.replace(/[\t|]+/g, " ").replace(/\s+/g, " ").trim();
  d = d.replace(/[\-–—:：/]+$/, "").trim();
  return d;
}

function parseMoq(line: string): { text: string; qty: number } {
  let m = line.match(/\b([0-9][0-9,]*)\s*([kK])\b/);
  if (m) {
    const base = parseFloat(m[1].replace(/,/g, ""));
    return { text: m[0].trim(), qty: m[2].toLowerCase() === "k" ? base * 1000 : base };
  }
  m = line.match(/MOQ[:：]?\s*([0-9][0-9,]*)/i);
  if (m) return { text: m[0].trim(), qty: parseFloat(m[1].replace(/,/g, "")) };
  m = line.match(/\b([0-9][0-9,]*)\s*(?:pcs|pc|個|set|sets)\b/i);
  if (m) return { text: m[0].trim(), qty: parseFloat(m[1].replace(/,/g, "")) };
  return { text: "", qty: 0 };
}

function isSpecLine(line: string): boolean {
  if (/^(other\s+terms|terms|payment|shipping|delivery|bulk|remark|備考|条件|納期|支払|合計|total|subtotal)/i.test(line)) return false;
  if (/[：:]/.test(line)) return true;
  if (/(材質|サイズ|寸法|厚さ|重量|容量|適用|カラー|色|仕様|規格|入数|素材)/.test(line)) return true;
  return false;
}

function matchOne(lines: string[], re: RegExp): string {
  for (const l of lines) {
    const m = l.match(re);
    if (m) return (m[1] || "").trim();
  }
  return "";
}

function detectSupplier(lines: string[]): string {
  const top = lines.slice(0, 8);
  const qi = top.findIndex((l) => /^quotation\b/i.test(l));
  if (qi >= 0) {
    for (let i = qi + 1; i < top.length; i++) {
      const l = top[i];
      if (/^(add[:：]|tel|fax|attn|messrs|c\.c|q\/?no|date)/i.test(l)) continue;
      if (l.replace(/[^A-Za-z0-9一-龠ぁ-んァ-ン]/g, "").length > 2) {
        return l.replace(/[.,、]\s*$/, "").trim();
      }
    }
  }
  const comp = top.find(
    (l) => /(limited|ltd|inc\b|corp|company|有限公司|股份|株式会社)/i.test(l) && !/messrs|attn/i.test(l)
  );
  return comp ? comp.replace(/[.,、]\s*$/, "").trim() : "";
}

// 抽出済みの行配列から見積内容を解析（純粋関数）
export function parseQuote(rawLines: string[]): ParsedQuote {
  const L = rawLines
    .map((s) => s.replace(/　/g, " ").replace(/[\t]+/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const supplier = detectSupplier(L);
  const quoteNo = matchOne(L, /Q\/?No\.?\s*[:：]?\s*([A-Za-z0-9\-_/]+)/i);
  const date = matchOne(L, /Date\s*[:：]?\s*([0-9]{4}[\/\-.][0-9]{1,2}[\/\-.][0-9]{1,2})/i);

  let start = L.findIndex((l) => /unit\s*price/i.test(l));
  if (start < 0) start = L.findIndex((l) => /description/i.test(l));
  const after = start < 0 ? 0 : start;
  let end = L.findIndex(
    (l, i) => i > after && /(other\s+terms|terms\s+and\s+conditions|payment\s+term|^remarks?[:：])/i.test(l)
  );
  const from = start >= 0 ? start + 1 : 0;
  const to = end >= 0 ? end : L.length;
  const region = L.slice(from, to);

  const items: QuoteItem[] = [];
  let cur: QuoteItem | null = null;
  for (const line of region) {
    const hit = firstPrice(line);
    if (hit) {
      const desc = cleanDesc(line, hit);
      const moq = parseMoq(line);
      cur = {
        description: desc || "(名称未取得)",
        spec: "",
        currency: hit.currency,
        unitPrice: hit.value,
        moq: moq.text,
        moqQty: moq.qty,
      };
      items.push(cur);
    } else if (cur && isSpecLine(line)) {
      cur.spec = cur.spec ? cur.spec + " / " + line : line;
    }
  }

  const currencies = Array.from(new Set(items.map((i) => i.currency)));
  return { supplier, quoteNo, date, items, currencies, lines: L };
}

// 換算（原貨→円）
export function toJpy(amount: number, currency: Currency, rates: Rates): number {
  const r = rates[currency] ?? 1;
  return amount * r;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// 最新レートを取得（無料・キー不要の公開API、CORS対応）。失敗時は例外。
export async function fetchRates(): Promise<Rates> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error("為替レートの取得に失敗しました");
  const j = (await res.json()) as { rates?: Record<string, number> };
  const r = j.rates || {};
  const jpy = r.JPY;
  if (!jpy || !Number.isFinite(jpy)) throw new Error("為替レートを取得できませんでした");
  return {
    USD: round2(jpy),
    CNY: r.CNY ? round2(jpy / r.CNY) : DEFAULT_RATES.CNY,
    EUR: r.EUR ? round2(jpy / r.EUR) : DEFAULT_RATES.EUR,
    JPY: 1,
  };
}

// PDF からテキスト行を抽出（pdfjs はここで遅延ロード）
export async function extractLinesFromPdf(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const rows: { y: number; items: { x: number; s: string }[] }[] = [];

    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const s = it.str;
      if (!s) continue;
      const tr = it.transform as number[];
      const x = tr[4];
      const y = tr[5];
      let row = rows.find((r) => Math.abs(r.y - y) <= 2.5);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, s });
    }

    rows.sort((a, b) => b.y - a.y); // 上から下へ
    for (const row of rows) {
      const line = row.items
        .sort((a, b) => a.x - b.x)
        .map((i) => i.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) lines.push(line);
    }
  }

  await doc.destroy();
  return lines;
}
