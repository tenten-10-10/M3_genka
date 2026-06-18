import { forwardRef } from "react";
import type { Product } from "../lib/types";
import { calcCost } from "../lib/calc";
import { yen, num, pct } from "../lib/format";

// PDF / 印刷用の固定レイアウト（800px 幅）。html2canvas で画像化される。
const PrintDocument = forwardRef<HTMLDivElement, { product: Product }>(({ product }, ref) => {
  const p = product.planning;
  const calc = calcCost(product.cost);
  const band: React.CSSProperties = {
    background: "#497160",
    color: "#fff",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textAlign: "center",
    padding: "7px",
    margin: "16px 0 8px",
    fontSize: 14,
  };
  const th: React.CSSProperties = { background: "#dae5d8", padding: "5px 7px", fontSize: 12, border: "1px solid #cfdccf", textAlign: "center" };
  const td: React.CSSProperties = { padding: "5px 7px", fontSize: 12, border: "1px solid #e0e6e2" };
  const label: React.CSSProperties = { ...td, background: "#eaf4ef", fontWeight: 700, width: 150, verticalAlign: "top" };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 800,
        background: "#fff",
        color: "#243029",
        padding: 28,
        fontFamily: '"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif',
      }}
    >
      <div style={{ background: "#243e33", color: "#fff", textAlign: "center", fontSize: 26, fontWeight: 700, padding: "14px", letterSpacing: "0.15em" }}>
        商 品 企 画 書
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
        <tbody>
          <tr>
            <td style={{ ...label, background: "#497160", color: "#fff", width: 110 }}>商 品 名</td>
            <td style={{ ...td, background: "#dae5d8", fontWeight: 700, fontSize: 15 }}>{product.name}</td>
            <td style={{ ...label, width: 80, textAlign: "right" }}>発売時期</td>
            <td style={td}>{p.releasePeriod}</td>
            <td style={{ ...label, width: 60, textAlign: "right" }}>担当</td>
            <td style={td}>{p.person}</td>
          </tr>
        </tbody>
      </table>

      {/* 画像 + 訴求点 */}
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={band}>商 品 画 像</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.mainImages.length === 0 ? (
              <div style={{ ...td, color: "#aaa", width: "100%", textAlign: "center", padding: 24 }}>（画像なし）</div>
            ) : (
              p.mainImages.map((img) => (
                <img key={img.id} src={img.url} crossOrigin="anonymous" style={{ width: p.mainImages.length > 1 ? "48%" : "100%", border: "1px solid #ddd", objectFit: "contain" }} />
              ))
            )}
          </div>
        </div>
        <div style={{ width: 300 }}>
          <div style={{ ...band, background: "#497160" }}>他社にない訴求点</div>
          <div style={{ background: "#dae5d8", padding: 10, fontSize: 12, color: "#cc0000", fontWeight: 700, whiteSpace: "pre-wrap", minHeight: 80 }}>
            {p.sellingPoints}
          </div>
          <div style={{ ...band }}>ヘッドコピー</div>
          <div style={{ background: "#dae5d8", padding: 10, fontSize: 13, whiteSpace: "pre-wrap", textAlign: "center" }}>{p.headCopy}</div>
        </div>
      </div>

      {/* 商品説明 */}
      <div style={band}>商 品 説 明</div>
      {p.specSections.map((s) => (
        <div key={s.id} style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 13, margin: "4px 0" }}>{s.heading}</div>
          {s.bullets.map((b, i) => (
            <div key={i} style={{ fontSize: 12, paddingLeft: 12 }}>● {b}</div>
          ))}
        </div>
      ))}

      {/* 価格 */}
      <div style={band}>商 品 価 格</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row a="目標売価（税別）" b={yen(calc.sellingPrice)} c="目標売価（税込）" d={yen(calc.priceInclTax)} />
          <Row a="粗利額（税別）" b={yen(calc.grossProfit)} c="粗利額（税込）" d={yen(calc.grossProfitInclTax)} />
          <Row a="掛け率" b={pct(calc.rateOnPrice)} c="MOQ" d={yen(product.cost.moq)} />
        </tbody>
      </table>

      {/* 仕様 */}
      <div style={band}>商 品 仕 様</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr><td style={label}>カラー</td><td style={td} colSpan={3}>{p.color}</td></tr>
          <tr><td style={label}>同梱品</td><td style={td} colSpan={3}>{p.includedItems}</td></tr>
          <tr><td style={label}>仕様</td><td style={{ ...td, whiteSpace: "pre-wrap" }} colSpan={3}>{p.specText}</td></tr>
          <tr><td style={label}>電源</td><td style={td}>{p.power}</td><td style={label}>素材</td><td style={td}>{p.material}</td></tr>
          <tr><td style={label}>原産地</td><td style={td}>{p.origin}</td><td style={label}>承認等</td><td style={td}>{p.approvals}</td></tr>
        </tbody>
      </table>

      {/* バーコード */}
      <div style={band}>商品バーコード・JAN</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>型番</th><th style={th}>カラー</th><th style={th}>JAN</th></tr></thead>
        <tbody>
          {p.barcodes.map((b) => (
            <tr key={b.id}><td style={{ ...td, textAlign: "center" }}>{b.model || "ー"}</td><td style={{ ...td, textAlign: "center" }}>{b.color || "ー"}</td><td style={{ ...td, textAlign: "center" }}>{b.jan || "ー"}</td></tr>
          ))}
        </tbody>
      </table>

      {/* サイズ */}
      <div style={band}>サイズ・梱包・重量</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>区分</th><th style={th}>W</th><th style={th}>D</th><th style={th}>H</th><th style={th}>入数</th><th style={th}>重量</th></tr></thead>
        <tbody>
          {p.sizes.map((s) => (
            <tr key={s.id}>
              <td style={{ ...label, width: "auto", textAlign: "center" }}>{s.label}</td>
              <td style={{ ...td, textAlign: "center" }}>{s.w}</td><td style={{ ...td, textAlign: "center" }}>{s.d}</td>
              <td style={{ ...td, textAlign: "center" }}>{s.h}</td><td style={{ ...td, textAlign: "center" }}>{s.qty}</td><td style={{ ...td, textAlign: "center" }}>{s.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(p.testInfo || p.separateItems || p.notes || p.remarks) && (
        <>
          <div style={band}>その他・特記事項</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {p.testInfo && <tr><td style={label}>試験情報</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.testInfo}</td></tr>}
              {p.separateItems && <tr><td style={label}>別売品</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.separateItems}</td></tr>}
              {p.remarks && <tr><td style={label}>備考</td><td style={td}>{p.remarks}</td></tr>}
              {p.notes && <tr><td style={label}>特記事項</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.notes}</td></tr>}
            </tbody>
          </table>
        </>
      )}

      {p.detailImages.length > 0 && (
        <>
          <div style={band}>詳細画像</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.detailImages.map((img) => (
              <div key={img.id} style={{ width: "48%" }}>
                <img src={img.url} crossOrigin="anonymous" style={{ width: "100%", border: "1px solid #ddd", objectFit: "contain" }} />
                {img.caption && <div style={{ fontSize: 11, textAlign: "center", color: "#666" }}>{img.caption}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 10, color: "#888", marginTop: 10 }}>{p.footerNote}</div>

      {/* 原価表 */}
      <div style={{ background: "#243e33", color: "#fff", textAlign: "center", fontSize: 18, fontWeight: 700, padding: "10px", margin: "24px 0 0", letterSpacing: "0.1em" }}>
        原 価 表
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr>
            {["区分", "品目", "仕様・メモ", "数量/ｾｯﾄ", "単価", "セット原価", "発注数", "発注金額"].map((h) => (
              <th key={h} style={{ ...th, background: "#4285f4", color: "#fff" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {product.cost.items.map((it, i) => (
            <tr key={it.id}>
              <td style={td}>{it.category}</td>
              <td style={td}>{it.item}</td>
              <td style={td}>{it.spec}</td>
              <td style={{ ...td, textAlign: "right" }}>{num(it.qtyPerSet)}</td>
              <td style={{ ...td, textAlign: "right" }}>{num(it.unitPrice)}</td>
              <td style={{ ...td, textAlign: "right", background: "#f3f7f4" }}>{num(calc.lines[i].setCost)}</td>
              <td style={{ ...td, textAlign: "right" }}>{num(it.orderQty)}</td>
              <td style={{ ...td, textAlign: "right" }}>{num(calc.lines[i].orderAmount)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...td, textAlign: "right", fontWeight: 700 }} colSpan={5}>合計</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{num(calc.setCost)}</td>
            <td style={td}></td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{num(calc.totalOrderAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <Mini k="セット原価" v={yen(calc.setCost)} />
        <Mini k="売価" v={yen(calc.sellingPrice)} />
        <Mini k="粗利額" v={yen(calc.grossProfit)} />
        <Mini k="粗利率" v={pct(calc.grossMarginRate)} />
        <Mini k="原価率" v={pct(calc.costRate)} />
        <Mini k="金型償却込原価" v={yen(calc.costWithMold)} />
        <Mini k="損益分岐原価" v={yen(calc.breakEvenCost)} />
      </div>

      <div style={{ textAlign: "right", fontSize: 11, color: "#497160", marginTop: 18 }}>{p.company}</div>
    </div>
  );
});

function Row({ a, b, c, d }: { a: string; b: string; c: string; d: string }) {
  const label: React.CSSProperties = { background: "#b1c4bc", padding: "6px 8px", fontSize: 12, fontWeight: 700, border: "1px solid #cfdccf" };
  const val: React.CSSProperties = { background: "#dae5d8", padding: "6px 8px", fontSize: 13, textAlign: "center", border: "1px solid #cfdccf", fontWeight: 700 };
  return (
    <tr>
      <td style={label}>{a}</td><td style={val}>{b}</td>
      <td style={label}>{c}</td><td style={val}>{d}</td>
    </tr>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: "#eaf4ef", borderRadius: 8, padding: "8px 12px", minWidth: 110 }}>
      <div style={{ fontSize: 11, color: "#6b7c74" }}>{k}</div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
    </div>
  );
}

export default PrintDocument;
