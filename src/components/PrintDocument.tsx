import { forwardRef } from "react";
import type { Product, SizeRow } from "../lib/types";
import { calcCost } from "../lib/calc";
import { yen, num, pct } from "../lib/format";
import Logo from "./Logo";

// PDF / 印刷 / HTML 用の固定レイアウト（800px 幅）。
// 各セクションを data-pdf-block で囲み、出力側でブロック単位にページ送りする。
const PrintDocument = forwardRef<HTMLDivElement, { product: Product }>(({ product }, ref) => {
  const p = product.planning;
  const calc = calcCost(product.cost);
  const layout = product.layout || "standard";
  const compact = layout === "compact";
  const big = layout === "imageLarge";

  const fTd = compact ? 10.5 : 11.5;
  const fBand = compact ? 12 : 13.5;
  const pad = compact ? "3px 6px" : "5px 7px";
  const blockGap = compact ? 8 : 12;

  const band: React.CSSProperties = {
    background: "#497160",
    color: "#fff",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textAlign: "center",
    padding: compact ? "5px" : "7px",
    margin: "0 0 6px",
    fontSize: fBand,
  };
  const th: React.CSSProperties = { background: "#dae5d8", padding: pad, fontSize: fTd, border: "1px solid #cfdccf", textAlign: "center", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: pad, fontSize: fTd, border: "1px solid #e0e6e2", verticalAlign: "top" };
  const label: React.CSSProperties = { ...td, background: "#eaf4ef", fontWeight: 700, width: 130, whiteSpace: "nowrap" };
  const blk: React.CSSProperties = { breakInside: "avoid", marginTop: blockGap };

  // 画像サイズ（レイアウトに応じて変化）
  const mainW = big ? "100%" : p.mainImages.length > 1 ? "48%" : "100%";
  const mainMax = big ? 460 : 280;
  const detailW = big ? "100%" : "48%";

  return (
    <div
      ref={ref}
      className="print-doc"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 800,
        background: "#fff",
        color: "#243029",
        padding: 26,
        fontFamily: '"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif',
      }}
    >
      {/* タイトル + 商品名 */}
      <div data-pdf-block style={{ breakInside: "avoid" }}>
        <div style={{ background: "#243e33", color: "#fff", textAlign: "center", fontSize: 24, fontWeight: 700, padding: "12px", letterSpacing: "0.15em" }}>
          商 品 企 画 書
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <tbody>
            <tr>
              <td style={{ ...label, background: "#497160", color: "#fff", width: 100 }}>商 品 名</td>
              <td style={{ ...td, background: "#dae5d8", fontWeight: 700, fontSize: fTd + 3 }}>{product.name}</td>
              <td style={{ ...label, width: 76, textAlign: "right" }}>発売時期</td>
              <td style={td}>{p.releasePeriod}</td>
              <td style={{ ...label, width: 56, textAlign: "right" }}>担当</td>
              <td style={td}>{p.person}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 画像 + 訴求点（画像大レイアウトでは画像を上に大きく、訴求点は下） */}
      {big ? (
        <>
          <div data-pdf-block style={blk}>
            <div style={band}>商 品 画 像</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {p.mainImages.length === 0 ? (
                <div style={{ ...td, color: "#aaa", width: "100%", textAlign: "center", padding: 24 }}>（画像なし）</div>
              ) : (
                p.mainImages.map((img) => (
                  <img key={img.id} src={img.url} crossOrigin="anonymous" style={{ width: "100%", maxHeight: 520, border: "1px solid #ddd", objectFit: "contain" }} />
                ))
              )}
            </div>
          </div>
          <div data-pdf-block style={blk}>
            <div style={band}>他社にない訴求点</div>
            <div style={{ background: "#dae5d8", padding: 10, fontSize: fTd + 0.5, color: "#cc0000", fontWeight: 700, whiteSpace: "pre-wrap" }}>{p.sellingPoints}</div>
            <div style={{ ...band, marginTop: 8 }}>ヘッドコピー</div>
            <div style={{ background: "#dae5d8", padding: 10, fontSize: fTd + 1.5, whiteSpace: "pre-wrap", textAlign: "center" }}>{p.headCopy}</div>
          </div>
        </>
      ) : (
        <div data-pdf-block style={{ ...blk, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={band}>商 品 画 像</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {p.mainImages.length === 0 ? (
                <div style={{ ...td, color: "#aaa", width: "100%", textAlign: "center", padding: 24 }}>（画像なし）</div>
              ) : (
                p.mainImages.map((img) => (
                  <img key={img.id} src={img.url} crossOrigin="anonymous" style={{ width: mainW, maxHeight: mainMax, border: "1px solid #ddd", objectFit: "contain" }} />
                ))
              )}
            </div>
          </div>
          <div style={{ width: 300 }}>
            <div style={band}>他社にない訴求点</div>
            <div style={{ background: "#dae5d8", padding: 10, fontSize: fTd + 0.5, color: "#cc0000", fontWeight: 700, whiteSpace: "pre-wrap", minHeight: 70 }}>{p.sellingPoints}</div>
            <div style={{ ...band, marginTop: 8 }}>ヘッドコピー</div>
            <div style={{ background: "#dae5d8", padding: 10, fontSize: fTd + 1.5, whiteSpace: "pre-wrap", textAlign: "center" }}>{p.headCopy}</div>
          </div>
        </div>
      )}

      {/* 商品説明 */}
      <div data-pdf-block style={blk}>
        <div style={band}>商 品 説 明</div>
        {p.specSections.map((s) => (
          <div key={s.id} style={{ marginBottom: 5 }}>
            <div style={{ fontWeight: 700, fontSize: fTd + 1, margin: "3px 0" }}>{s.heading}</div>
            {s.bullets.map((b, i) => (
              <div key={i} style={{ fontSize: fTd, paddingLeft: 12, lineHeight: 1.5 }}>● {b}</div>
            ))}
          </div>
        ))}
      </div>

      {/* 価格 */}
      <div data-pdf-block style={blk}>
        <div style={band}>商 品 価 格</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <Row a="目標売価（税別）" b={yen(calc.sellingPrice)} c="目標売価（税込）" d={yen(calc.priceInclTax)} f={fTd} />
            <Row a="粗利額（税別）" b={yen(calc.grossProfit)} c="粗利額（税込）" d={yen(calc.grossProfitInclTax)} f={fTd} />
            <Row a="掛け率" b={pct(calc.rateOnPrice)} c="MOQ" d={yen(product.cost.moq)} f={fTd} />
          </tbody>
        </table>
      </div>

      {/* 仕様 */}
      <div data-pdf-block style={blk}>
        <div style={band}>商 品 仕 様</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={label}>カラー</td><td style={td} colSpan={3}>{p.color}</td></tr>
            <tr><td style={label}>同梱品</td><td style={td} colSpan={3}>{p.includedItems}</td></tr>
            <tr><td style={label}>仕様</td><td style={{ ...td, whiteSpace: "pre-wrap", lineHeight: 1.45 }} colSpan={3}>{p.specText}</td></tr>
            <tr><td style={label}>電源</td><td style={td}>{p.power}</td><td style={label}>素材</td><td style={td}>{p.material}</td></tr>
            <tr><td style={label}>原産地</td><td style={td}>{p.origin}</td><td style={label}>承認等</td><td style={td}>{p.approvals}</td></tr>
          </tbody>
        </table>
      </div>

      {/* バーコード */}
      <div data-pdf-block style={blk}>
        <div style={band}>商品バーコード・JAN</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>型番</th><th style={th}>カラー</th><th style={th}>JAN</th></tr></thead>
          <tbody>
            {p.barcodes.map((b) => (
              <tr key={b.id}><td style={{ ...td, textAlign: "center" }}>{b.model || "ー"}</td><td style={{ ...td, textAlign: "center" }}>{b.color || "ー"}</td><td style={{ ...td, textAlign: "center" }}>{b.jan || "ー"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* サイズ（W×D×H を 1 列に統合し、区分は横組み固定幅） */}
      <div data-pdf-block style={blk}>
        <div style={band}>サイズ・梱包・重量</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ ...th, width: 96 }}>区分</th><th style={th}>サイズ（W×D×H mm）</th><th style={{ ...th, width: 90 }}>入数</th><th style={{ ...th, width: 110 }}>重量</th></tr></thead>
          <tbody>
            {p.sizes.map((s) => (
              <tr key={s.id}>
                <td style={{ ...label, width: 96, textAlign: "center" }}>{s.label}</td>
                <td style={{ ...td, textAlign: "center" }}>{sizeStr(s)}</td>
                <td style={{ ...td, textAlign: "center" }}>{s.qty}</td>
                <td style={{ ...td, textAlign: "center" }}>{s.weight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(p.testInfo || p.separateItems || p.notes || p.remarks) && (
        <div data-pdf-block style={blk}>
          <div style={band}>その他・特記事項</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {p.testInfo && <tr><td style={label}>試験情報</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.testInfo}</td></tr>}
              {p.separateItems && <tr><td style={label}>別売品</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.separateItems}</td></tr>}
              {p.remarks && <tr><td style={label}>備考</td><td style={td}>{p.remarks}</td></tr>}
              {p.notes && <tr><td style={label}>特記事項</td><td style={{ ...td, whiteSpace: "pre-wrap" }}>{p.notes}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {p.detailImages.length > 0 && (
        <div data-pdf-block style={blk}>
          <div style={band}>詳細画像</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: big ? "center" : "flex-start" }}>
            {p.detailImages.map((img) => (
              <div key={img.id} style={{ width: detailW }}>
                <img src={img.url} crossOrigin="anonymous" style={{ width: "100%", maxHeight: big ? 520 : 300, border: "1px solid #ddd", objectFit: "contain" }} />
                {img.caption && <div style={{ fontSize: fTd - 1, textAlign: "center", color: "#666" }}>{img.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div data-pdf-block style={{ breakInside: "avoid", marginTop: 8 }}>
        <div style={{ fontSize: 10, color: "#888" }}>{p.footerNote}</div>
      </div>

      {/* 原価表 */}
      <div data-pdf-block style={{ breakInside: "avoid", marginTop: 16 }}>
        <div style={{ background: "#243e33", color: "#fff", textAlign: "center", fontSize: 17, fontWeight: 700, padding: "9px", letterSpacing: "0.1em" }}>
          原 価 表
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
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
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <Mini k="セット原価" v={yen(calc.setCost)} />
          <Mini k="売価" v={yen(calc.sellingPrice)} />
          <Mini k="粗利額" v={yen(calc.grossProfit)} />
          <Mini k="粗利率" v={pct(calc.grossMarginRate)} />
          <Mini k="原価率" v={pct(calc.costRate)} />
          <Mini k="金型償却込原価" v={yen(calc.costWithMold)} />
          <Mini k="損益分岐原価" v={yen(calc.breakEvenCost)} />
        </div>
      </div>

      <div data-pdf-block style={{ breakInside: "avoid", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #969696", paddingTop: 8 }}>
        <Logo color="#2d4c3b" height={22} />
        <div style={{ textAlign: "right", fontSize: 11, color: "#497160" }}>{p.company}</div>
      </div>
    </div>
  );
});

function sizeStr(s: SizeRow): string {
  if (!s.w && !s.d && !s.h) return "";
  return [s.w || "-", s.d || "-", s.h || "-"].join(" × ");
}

function Row({ a, b, c, d, f }: { a: string; b: string; c: string; d: string; f: number }) {
  const label: React.CSSProperties = { background: "#b1c4bc", padding: "6px 8px", fontSize: f, fontWeight: 700, border: "1px solid #cfdccf" };
  const val: React.CSSProperties = { background: "#dae5d8", padding: "6px 8px", fontSize: f + 1, textAlign: "center", border: "1px solid #cfdccf", fontWeight: 700 };
  return (
    <tr>
      <td style={label}>{a}</td><td style={val}>{b}</td>
      <td style={label}>{c}</td><td style={val}>{d}</td>
    </tr>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: "#eaf4ef", borderRadius: 8, padding: "7px 11px", minWidth: 104 }}>
      <div style={{ fontSize: 10.5, color: "#6b7c74" }}>{k}</div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{v}</div>
    </div>
  );
}

export default PrintDocument;
