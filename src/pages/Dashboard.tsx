import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { listProducts, createProduct, deleteProduct, duplicateProduct, uploadImage } from "../lib/api";
import { setSetting, useSettings } from "../lib/settings";
import { makeTemplateProduct } from "../lib/defaults";
import { calcCost } from "../lib/calc";
import { yen, pct } from "../lib/format";
import type { ProductRecord } from "../lib/types";

export default function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { logoUrl, setLogoUrl } = useSettings();
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  async function onLogoPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLogoBusy(true);
    try {
      const { url } = await uploadImage(file);
      await setSetting("logo_url", url);
      setLogoUrl(url);
    } catch (e) {
      setError("ロゴ設定に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  async function load() {
    setLoading(true);
    try {
      setItems(await listProducts());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function newProduct() {
    setBusy(true);
    try {
      const tpl = makeTemplateProduct();
      tpl.name = "新規商品 " + new Date().toLocaleDateString("ja-JP");
      const rec = await createProduct(tpl.name, tpl);
      nav(`/products/${rec.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(rec: ProductRecord) {
    if (!confirm(`「${rec.name}」を削除しますか？この操作は取り消せません。`)) return;
    await deleteProduct(rec.id);
    load();
  }

  async function onDuplicate(rec: ProductRecord) {
    setBusy(true);
    try {
      await duplicateProduct(rec);
      load();
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return items;
    return items.filter(
      (i) => i.name.includes(s) || (i.data?.category || "").includes(s) || (i.owner_email || "").includes(s)
    );
  }, [items, q]);

  return (
    <>
      <Header />
      <div className="container">
        <div className="dash-top">
          <h1>商品一覧</h1>
          <span className="spacer" />
          {logoUrl && (
            <img src={logoUrl} alt="ロゴ" style={{ height: 26, width: "auto", marginRight: 4 }} />
          )}
          <button className="btn-secondary" onClick={() => logoInput.current?.click()} disabled={logoBusy} title="PDF・企画書に表示するロゴ画像を設定">
            {logoBusy ? "アップ中…" : logoUrl ? "🖼 ロゴ変更" : "🖼 ロゴ設定"}
          </button>
          <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => onLogoPick(e.target.files)} />
          <input className="search" placeholder="検索（商品名・分類）" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary" onClick={newProduct} disabled={busy}>
            ＋ 新規作成
          </button>
        </div>

        {error && <div className="login-card err" style={{ maxWidth: "none" }}>{error}</div>}

        {loading ? (
          <div className="center-loading">読み込み中…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {q ? "該当する商品がありません" : "まだ商品がありません。「＋ 新規作成」から追加してください。"}
          </div>
        ) : (
          <div className="cards">
            {filtered.map((rec) => (
              <ProductCard
                key={rec.id}
                rec={rec}
                onOpen={() => nav(`/products/${rec.id}`)}
                onDelete={() => onDelete(rec)}
                onDuplicate={() => onDuplicate(rec)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProductCard({
  rec,
  onOpen,
  onDelete,
  onDuplicate,
}: {
  rec: ProductRecord;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const calc = calcCost(rec.data.cost);
  const marginBadge =
    calc.grossMarginRate >= rec.data.cost.targetGrossMarginRate
      ? "good"
      : calc.grossMarginRate >= rec.data.cost.targetGrossMarginRate - 0.05
      ? "warn"
      : "bad";
  const thumb = rec.data.planning.mainImages[0]?.url;

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12 }}>
        {thumb && (
          <img
            src={thumb}
            alt=""
            style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8, background: "#fff", border: "1px solid #eee" }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 onClick={onOpen}>{rec.name}</h3>
          <div className="meta">
            更新: {new Date(rec.updated_at).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}
            {rec.owner_email ? ` ・ ${rec.owner_email}` : ""}
          </div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="v">{yen(calc.sellingPrice)}</div>
          <div className="k">売価</div>
        </div>
        <div className="metric">
          <div className="v">{yen(calc.setCost)}</div>
          <div className="k">セット原価</div>
        </div>
        <div className="metric">
          <div className="v">
            <span className={`badge ${marginBadge}`}>{pct(calc.grossMarginRate)}</span>
          </div>
          <div className="k">粗利率</div>
        </div>
      </div>

      <div className="actions">
        <button className="btn-secondary btn-sm" onClick={onOpen}>
          開く
        </button>
        <button className="btn-ghost btn-sm" onClick={onDuplicate}>
          複製
        </button>
        <span style={{ flex: 1 }} />
        <button className="btn-danger btn-sm" onClick={onDelete}>
          削除
        </button>
      </div>
    </div>
  );
}
