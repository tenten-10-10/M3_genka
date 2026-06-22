import { useState } from "react";
import type { Product } from "../lib/types";
import { calcCost } from "../lib/calc";
import { yen, num, pct } from "../lib/format";
import { emptyLine, COST_STATUSES } from "../lib/defaults";
import QuoteImportModal from "./QuoteImportModal";

type Mutate = (fn: (p: Product) => void) => void;

export default function CostEditor({ product, mutate }: { product: Product; mutate: Mutate }) {
  const c = product.cost;
  const calc = calcCost(c);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");
  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const setNum = (key: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Number(e.target.value);
    mutate((p) => {
      (p.cost[key] as number) = Number.isFinite(v) ? v : 0;
    });
  };

  return (
    <div>
      <div className="section-title">入力項目（黄色セルを編集すると自動計算されます）</div>
      <div className="inputs-row">
        <Pill label="セット総数（生産予定数）" value={c.setTotal} onChange={setNum("setTotal")} />
        <Pill label="売価（税別）" value={c.sellingPrice} onChange={setNum("sellingPrice")} />
        <Pill label="金型総額" value={c.moldTotal} onChange={setNum("moldTotal")} />
        <Pill label="粗利率目標（%）" value={Math.round(c.targetGrossMarginRate * 1000) / 10} onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value) / 100;
          mutate((p) => { p.cost.targetGrossMarginRate = Number.isFinite(v) ? v : 0; });
        }} />
        <Pill label="消費税率（%）" value={Math.round(c.taxRate * 1000) / 10} onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value) / 100;
          mutate((p) => { p.cost.taxRate = Number.isFinite(v) ? v : 0; });
        }} />
        <Pill label="MOQ" value={c.moq} onChange={setNum("moq")} />
      </div>

      <div className="section-title">サマリー</div>
      <div className="summary-grid">
        <Cell k="セット原価" v={yen(calc.setCost)} accent />
        <Cell k="売価" v={yen(calc.sellingPrice)} />
        <Cell k="粗利額" v={yen(calc.grossProfit)} />
        <Cell k="粗利率" v={pct(calc.grossMarginRate)} warn={calc.grossMarginRate < c.targetGrossMarginRate} />
        <Cell k="原価率" v={pct(calc.costRate)} />
        <Cell k="総発注金額" v={yen(calc.totalOrderAmount)} />
        <Cell k="金型償却/セット" v={yen(calc.moldPerSet)} />
        <Cell k="金型償却込原価" v={yen(calc.costWithMold)} />
        <Cell k="損益分岐原価" v={yen(calc.breakEvenCost)} />
        <Cell k="粗利率目標差" v={pct(calc.marginGap)} warn={calc.marginGap < 0} />
      </div>

      <div className="section-title">原価明細</div>
      <div className="help">セット原価＝数量/セット×単価、発注金額＝単価×発注数（自動計算）</div>
      <div style={{ overflowX: "auto" }}>
        <table className="cost-table resp-cards">
          <thead>
            <tr>
              <th style={{ width: 92 }}>区分</th>
              <th style={{ width: 150 }}>品目</th>
              <th>仕様・メモ</th>
              <th style={{ width: 72 }}>数量/ｾｯﾄ</th>
              <th style={{ width: 90 }}>単価</th>
              <th style={{ width: 96 }}>セット原価</th>
              <th style={{ width: 84 }}>発注数</th>
              <th style={{ width: 116 }}>発注金額</th>
              <th style={{ width: 110 }}>仕入先</th>
              <th style={{ width: 96 }}>ステータス</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {c.items.map((it, i) => {
              const line = calc.lines[i];
              return (
                <tr key={it.id}>
                  <td data-label="区分"><input value={it.category} onChange={(e) => mutate((p) => { p.cost.items[i].category = e.target.value; })} /></td>
                  <td data-label="品目"><input value={it.item} onChange={(e) => mutate((p) => { p.cost.items[i].item = e.target.value; })} /></td>
                  <td data-label="仕様・メモ"><input value={it.spec} onChange={(e) => mutate((p) => { p.cost.items[i].spec = e.target.value; })} /></td>
                  <td data-label="数量/ｾｯﾄ"><input className="num-input" type="number" value={it.qtyPerSet} onFocus={selOnFocus} onChange={(e) => mutate((p) => { p.cost.items[i].qtyPerSet = numv(e); })} /></td>
                  <td data-label="単価"><input className="num-input" type="number" value={it.unitPrice} onFocus={selOnFocus} onChange={(e) => mutate((p) => { p.cost.items[i].unitPrice = numv(e); })} /></td>
                  <td className="calc" data-label="セット原価">{num(line.setCost)}</td>
                  <td data-label="発注数"><input className="num-input" type="number" value={it.orderQty} onFocus={selOnFocus} onChange={(e) => mutate((p) => { p.cost.items[i].orderQty = numv(e); })} /></td>
                  <td className="calc" data-label="発注金額">{num(line.orderAmount)}</td>
                  <td data-label="仕入先"><input value={it.supplier} onChange={(e) => mutate((p) => { p.cost.items[i].supplier = e.target.value; })} /></td>
                  <td data-label="ステータス">
                    <select value={it.status} onChange={(e) => mutate((p) => { p.cost.items[i].status = e.target.value; })}>
                      {COST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="rm-cell" data-label="操作" style={{ textAlign: "center" }}>
                    <button className="btn-ghost btn-sm" title="削除" onClick={() => mutate((p) => { p.cost.items.splice(i, 1); })}>✕ 削除</button>
                  </td>
                </tr>
              );
            })}
            <tr className="totals-row">
              <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, padding: "8px" }}>合計</td>
              <td className="calc" style={{ fontWeight: 800 }}>{num(calc.setCost)}</td>
              <td></td>
              <td className="calc" style={{ fontWeight: 800 }}>{num(calc.totalOrderAmount)}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn-secondary btn-sm" onClick={() => mutate((p) => { p.cost.items.push(emptyLine()); })}>
          ＋ 明細を追加
        </button>
        <button className="btn-secondary btn-sm" onClick={() => setShowImport(true)}>
          📄 見積もりPDFから取込
        </button>
      </div>

      {showImport && (
        <QuoteImportModal mutate={mutate} onClose={() => setShowImport(false)} onDone={flash} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function numv(e: React.ChangeEvent<HTMLInputElement>): number {
  const v = e.target.value === "" ? 0 : Number(e.target.value);
  return Number.isFinite(v) ? v : 0;
}
function selOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}

function Pill({ label, value, onChange }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="input-pill">
      <label>{label}</label>
      <input type="number" value={value} onFocus={selOnFocus} onChange={onChange} />
    </div>
  );
}

function Cell({ k, v, accent, warn }: { k: string; v: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`summary-cell ${accent ? "accent" : ""} ${warn ? "warnv" : ""}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
