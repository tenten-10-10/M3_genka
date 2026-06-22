import { useMemo, useState } from "react";
import type { Product, CostLineItem } from "../lib/types";
import { uid, yen } from "../lib/format";
import {
  CURRENCIES,
  DEFAULT_RATES,
  extractLinesFromPdf,
  fetchRates,
  parseQuote,
  type Currency,
  type ParsedQuote,
  type Rates,
} from "../lib/quote";

type Mutate = (fn: (p: Product) => void) => void;

interface Row {
  include: boolean;
  category: string;
  item: string;
  spec: string;
  qtyPerSet: number;
  currency: Currency;
  unitOrig: number;
  orderQty: number;
  note: string;
}

export default function QuoteImportModal({
  mutate,
  onClose,
  onDone,
}: {
  mutate: Mutate;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [stage, setStage] = useState<"pick" | "loading" | "review">("pick");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedQuote | null>(null);
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [ratesNote, setRatesNote] = useState("為替レートは自動取得を試みます。手動でも調整できます。");
  const [fetchingRates, setFetchingRates] = useState(false);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [fileName, setFileName] = useState("");

  const jpyOf = (row: Row) => Math.round(row.unitOrig * (rates[row.currency] ?? 1));
  const selected = rows.filter((r) => r.include);
  const totalSet = useMemo(
    () => selected.reduce((s, r) => s + jpyOf(r) * (r.qtyPerSet || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, rates]
  );

  async function onFile(file: File) {
    setError("");
    setStage("loading");
    setFileName(file.name);
    try {
      const lines = await extractLinesFromPdf(file);
      const pq = parseQuote(lines);
      if (!pq.items.length) {
        setError("見積もりの明細を読み取れませんでした。表形式のPDF（単価に $ / 元 などの通貨記号）をご確認ください。");
        setStage("pick");
        return;
      }
      setParsed(pq);
      setSupplier(pq.supplier);
      setRows(
        pq.items.map((it) => ({
          include: true,
          category: guessCategory(it.description),
          item: it.description,
          spec: it.spec,
          qtyPerSet: 1,
          currency: it.currency,
          unitOrig: it.unitPrice,
          orderQty: it.moqQty || 0,
          note: it.moq ? `MOQ ${it.moq}` : "",
        }))
      );
      setStage("review");
      void doFetchRates(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const loadFail = /MIME|dynamically imported module|Failed to fetch|Importing a module|chunk|worker/i.test(msg);
      setError(
        loadFail
          ? "アプリが更新された可能性があります。ページを再読み込み（リロード）してから、もう一度お試しください。"
          : "PDFの解析に失敗しました: " + msg
      );
      setStage("pick");
    }
  }

  async function doFetchRates(silent = false) {
    setFetchingRates(true);
    try {
      const r = await fetchRates();
      setRates(r);
      setRatesNote(`最新レートを取得しました（1USD=¥${r.USD} / 1CNY=¥${r.CNY} / 1EUR=¥${r.EUR}）`);
    } catch {
      if (!silent) setRatesNote("レート取得に失敗しました。既定値を使用中です（手動で調整してください）。");
    } finally {
      setFetchingRates(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function doImport() {
    if (!selected.length) {
      setError("取り込む明細を1件以上選択してください。");
      return;
    }
    const items: CostLineItem[] = selected.map((r) => {
      const rate = rates[r.currency] ?? 1;
      const origNote = r.currency !== "JPY" ? `${symbolOf(r.currency)}${r.unitOrig} @¥${rate}` : "";
      return {
        id: uid(),
        category: r.category,
        item: r.item,
        spec: r.spec,
        qtyPerSet: r.qtyPerSet || 1,
        unitPrice: Math.round(r.unitOrig * rate),
        orderQty: r.orderQty || 0,
        supplier,
        status: "未発注",
        note: [origNote, r.note].filter(Boolean).join(" / "),
      };
    });
    mutate((p) => {
      if (mode === "replace") p.cost.items = items;
      else p.cost.items.push(...items);
    });
    onDone(`見積もりから ${items.length} 件を${mode === "replace" ? "置き換え" : "追加"}ました`);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h3>📄 見積もりPDFから取込</h3>

        {stage !== "review" && (
          <>
            <p>
              US ドル・人民元などの単価を含む見積もりPDFを読み込み、選択した為替レートで円に換算して原価明細に追加します。
            </p>
            {error && <div className="q-err">{error}</div>}
            <label className="q-drop">
              <input
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              {stage === "loading" ? `解析中… ${fileName}` : "クリックして見積もりPDFを選択"}
            </label>
            <div className="q-foot">
              <span style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={onClose}>
                キャンセル
              </button>
            </div>
          </>
        )}

        {stage === "review" && parsed && (
          <>
            <div className="q-meta">
              <div className="q-supplier">
                <span>仕入先</span>
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="見積発行元" />
              </div>
              {parsed.quoteNo && <div className="q-tag">No. {parsed.quoteNo}</div>}
              {parsed.date && <div className="q-tag">{parsed.date}</div>}
            </div>

            <div className="q-rates">
              {(["USD", "CNY", "EUR"] as Currency[]).map((c) => (
                <label key={c} className="q-rate">
                  <span>1{c} = ¥</span>
                  <input
                    type="number"
                    value={rates[c]}
                    onChange={(e) => setRates((r) => ({ ...r, [c]: Number(e.target.value) || 0 }))}
                  />
                </label>
              ))}
              <button className="btn-secondary btn-sm" onClick={() => doFetchRates(false)} disabled={fetchingRates}>
                {fetchingRates ? "取得中…" : "最新レート取得"}
              </button>
            </div>
            <div className="q-note">{ratesNote}</div>
            {error && <div className="q-err">{error}</div>}

            <div className="q-tablewrap">
              <table className="q-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}></th>
                    <th style={{ width: 88 }}>区分</th>
                    <th>品目</th>
                    <th style={{ width: 70 }}>数量/ｾｯﾄ</th>
                    <th style={{ width: 92 }}>単価(原貨)</th>
                    <th style={{ width: 70 }}>通貨</th>
                    <th style={{ width: 100 }}>単価(円)</th>
                    <th style={{ width: 88 }}>発注数</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.include ? "" : "q-off"}>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
                      </td>
                      <td>
                        <input value={r.category} onChange={(e) => update(i, { category: e.target.value })} />
                      </td>
                      <td className="q-itemcell">
                        <input value={r.item} onChange={(e) => update(i, { item: e.target.value })} />
                      </td>
                      <td>
                        <input
                          className="num-input"
                          type="number"
                          value={r.qtyPerSet}
                          onChange={(e) => update(i, { qtyPerSet: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <input
                          className="num-input"
                          type="number"
                          value={r.unitOrig}
                          onChange={(e) => update(i, { unitOrig: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <select value={r.currency} onChange={(e) => update(i, { currency: e.target.value as Currency })}>
                          {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="q-jpy">{yen(jpyOf(r))}</td>
                      <td>
                        <input
                          className="num-input"
                          type="number"
                          value={r.orderQty}
                          onChange={(e) => update(i, { orderQty: Number(e.target.value) || 0 })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="q-summary">
              選択 <b>{selected.length}</b> 件 ・ セット原価合計（追加分）<b>{yen(totalSet)}</b>
            </div>

            <div className="q-foot">
              <select className="q-mode" value={mode} onChange={(e) => setMode(e.target.value as "append" | "replace")}>
                <option value="append">既存の明細に追加</option>
                <option value="replace">明細を置き換える</option>
              </select>
              <span style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={onClose}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={doImport}>
                原価表に取り込む
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function guessCategory(desc: string): string {
  if (/梱包|カートン|パッケージ|箱|包装/.test(desc)) return "梱包";
  if (/縁材|角部材|部材|パーツ|金具|ねじ|ビス/.test(desc)) return "部材";
  if (/マット|本体|製品|ファン|デバイス|バッテリー/.test(desc)) return "本体";
  return "部材";
}

function symbolOf(c: Currency): string {
  return CURRENCIES.find((x) => x.code === c)?.symbol ?? "";
}
