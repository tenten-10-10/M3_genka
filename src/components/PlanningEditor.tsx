import type { Product, ProductImage } from "../lib/types";
import { calcCost } from "../lib/calc";
import { yen, pct, uid } from "../lib/format";
import ImageManager from "./ImageManager";

type Mutate = (fn: (p: Product) => void) => void;

export default function PlanningEditor({ product, mutate }: { product: Product; mutate: Mutate }) {
  const p = product.planning;
  const calc = calcCost(product.cost);

  const T = (label: string, value: string, set: (p: Product, v: string) => void, area = false) => (
    <div className="field">
      <label>{label}</label>
      {area ? (
        <textarea rows={3} value={value} onChange={(e) => mutate((pp) => set(pp, e.target.value))} />
      ) : (
        <input value={value} onChange={(e) => mutate((pp) => set(pp, e.target.value))} />
      )}
    </div>
  );

  return (
    <div>
      <div className="section-title">基本情報</div>
      <div className="grid3">
        {T("発売時期", p.releasePeriod, (pp, v) => (pp.planning.releasePeriod = v))}
        {T("担当", p.person, (pp, v) => (pp.planning.person = v))}
        {T("分類タグ（任意）", product.category, (pp, v) => (pp.category = v))}
      </div>

      <div className="section-title">商品画像</div>
      <ImageManager
        label="商品画像"
        images={p.mainImages}
        onChange={(next) => mutate((pp) => (pp.planning.mainImages = next))}
      />

      <div className="section-title">ヘッドコピー / 訴求点</div>
      {T("ヘッドコピー", p.headCopy, (pp, v) => (pp.planning.headCopy = v), true)}
      {T("他社にない訴求点", p.sellingPoints, (pp, v) => (pp.planning.sellingPoints = v), true)}

      <div className="section-title">商品説明</div>
      {p.specSections.map((s, si) => (
        <div className="spec-section" key={s.id}>
          <div className="head">
            <input
              style={{ fontWeight: 700 }}
              placeholder="見出し（例：【空調ファン】）"
              value={s.heading}
              onChange={(e) => mutate((pp) => (pp.planning.specSections[si].heading = e.target.value))}
            />
            <button className="btn-danger btn-sm" onClick={() => mutate((pp) => pp.planning.specSections.splice(si, 1))}>
              節を削除
            </button>
          </div>
          <div className="bullets-list">
            {s.bullets.map((b, bi) => (
              <div className="bullet-row" key={bi}>
                <input
                  value={b}
                  onChange={(e) => mutate((pp) => (pp.planning.specSections[si].bullets[bi] = e.target.value))}
                />
                <button className="btn-ghost btn-sm" onClick={() => mutate((pp) => pp.planning.specSections[si].bullets.splice(bi, 1))}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => mutate((pp) => pp.planning.specSections[si].bullets.push(""))}>
            ＋ 項目
          </button>
        </div>
      ))}
      <button className="btn-secondary btn-sm" onClick={() => mutate((pp) => pp.planning.specSections.push({ id: uid(), heading: "", bullets: [""] }))}>
        ＋ 説明の節を追加
      </button>

      <div className="section-title">商品価格（原価表から自動計算）</div>
      <div className="summary-grid">
        <PriceCell k="目標売価（税別）" v={yen(calc.sellingPrice)} accent />
        <PriceCell k="目標売価（税込）" v={yen(calc.priceInclTax)} accent />
        <PriceCell k="粗利額（税別）" v={yen(calc.grossProfit)} />
        <PriceCell k="粗利額（税込）" v={yen(calc.grossProfitInclTax)} />
        <PriceCell k="掛け率" v={pct(calc.rateOnPrice)} />
        <PriceCell k="MOQ" v={yen(product.cost.moq)} />
      </div>

      <div className="section-title">商品仕様</div>
      <div className="grid2">
        {T("カラー", p.color, (pp, v) => (pp.planning.color = v))}
        {T("同梱品", p.includedItems, (pp, v) => (pp.planning.includedItems = v))}
      </div>
      {T("仕様（自由記述）", p.specText, (pp, v) => (pp.planning.specText = v), true)}
      <div className="grid2">
        {T("電源", p.power, (pp, v) => (pp.planning.power = v))}
        {T("素材", p.material, (pp, v) => (pp.planning.material = v))}
        {T("原産地", p.origin, (pp, v) => (pp.planning.origin = v))}
        {T("承認等", p.approvals, (pp, v) => (pp.planning.approvals = v))}
      </div>

      <div className="section-title">商品バーコード・JAN</div>
      <table className="cost-table">
        <thead>
          <tr><th>型番</th><th>カラー</th><th>JAN</th><th style={{ width: 40 }}></th></tr>
        </thead>
        <tbody>
          {p.barcodes.map((b, bi) => (
            <tr key={b.id}>
              <td><input value={b.model} onChange={(e) => mutate((pp) => (pp.planning.barcodes[bi].model = e.target.value))} /></td>
              <td><input value={b.color} onChange={(e) => mutate((pp) => (pp.planning.barcodes[bi].color = e.target.value))} /></td>
              <td><input value={b.jan} onChange={(e) => mutate((pp) => (pp.planning.barcodes[bi].jan = e.target.value))} /></td>
              <td style={{ textAlign: "center" }}><button className="btn-ghost btn-sm" onClick={() => mutate((pp) => pp.planning.barcodes.splice(bi, 1))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => mutate((pp) => pp.planning.barcodes.push({ id: uid(), model: "", color: "", jan: "" }))}>＋ 行を追加</button>

      <div className="section-title">サイズ・梱包・重量</div>
      <table className="cost-table">
        <thead>
          <tr><th style={{ width: 120 }}>区分</th><th>W</th><th>D</th><th>H</th><th>入数</th><th>重量</th><th style={{ width: 40 }}></th></tr>
        </thead>
        <tbody>
          {p.sizes.map((s, si) => (
            <tr key={s.id}>
              <td><input value={s.label} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].label = e.target.value))} /></td>
              <td><input value={s.w} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].w = e.target.value))} /></td>
              <td><input value={s.d} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].d = e.target.value))} /></td>
              <td><input value={s.h} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].h = e.target.value))} /></td>
              <td><input value={s.qty} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].qty = e.target.value))} /></td>
              <td><input value={s.weight} onChange={(e) => mutate((pp) => (pp.planning.sizes[si].weight = e.target.value))} /></td>
              <td style={{ textAlign: "center" }}><button className="btn-ghost btn-sm" onClick={() => mutate((pp) => pp.planning.sizes.splice(si, 1))}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => mutate((pp) => pp.planning.sizes.push({ id: uid(), label: "", w: "", d: "", h: "", qty: "", weight: "" }))}>＋ 行を追加</button>

      <div className="section-title">試験情報 / 別売品 / 特記事項</div>
      {T("試験情報", p.testInfo, (pp, v) => (pp.planning.testInfo = v), true)}
      {T("別売品", p.separateItems, (pp, v) => (pp.planning.separateItems = v), true)}
      {T("備考", p.remarks, (pp, v) => (pp.planning.remarks = v))}
      {T("その他・特記事項", p.notes, (pp, v) => (pp.planning.notes = v), true)}

      <div className="section-title">詳細画像</div>
      <ImageManager
        label="詳細画像"
        images={p.detailImages}
        onChange={(next: ProductImage[]) => mutate((pp) => (pp.planning.detailImages = next))}
      />
    </div>
  );
}

function PriceCell({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`summary-cell ${accent ? "accent" : ""}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
