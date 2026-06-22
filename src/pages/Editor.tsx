import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import CostEditor from "../components/CostEditor";
import PlanningEditor from "../components/PlanningEditor";
import PrintDocument from "../components/PrintDocument";
import LayoutPreview from "../components/LayoutPreview";
import { getProduct, updateProduct, createShare } from "../lib/api";
import type { LayoutMode, Product } from "../lib/types";

type Tab = "planning" | "cost" | "preview";

const safeName = (s: string) => (s || "product").replace(/[\\/:*?"<>|]/g, "_");

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("planning");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const [includeCost, setIncludeCost] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // 編集リビジョンで「未保存」を厳密判定する
  const [editRev, setEditRev] = useState(0);
  const [savedRev, setSavedRev] = useState(0);
  const editRevRef = useRef(0);
  const savedRevRef = useRef(0);
  const dirty = editRev !== savedRev;

  const productRef = useRef<Product | null>(null);
  const nameRef = useRef("");
  const skipFlushRef = useRef(false);
  useEffect(() => { productRef.current = product; }, [product]);
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { savedRevRef.current = savedRev; }, [savedRev]);

  function bumpEdit() {
    editRevRef.current += 1;
    setEditRev(editRevRef.current);
  }

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((rec) => {
        const data = rec.data;
        if (!data.layout) data.layout = "standard";
        setProduct(data);
        setName(rec.name);
        productRef.current = data;
        nameRef.current = rec.name;
        setSavedAt(rec.updated_at);
      })
      .catch((e) => setToast(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const doSave = useCallback(
    async (silent = false): Promise<void> => {
      if (!id || !productRef.current) return;
      if (savingRef.current) {
        pendingRef.current = true;
        return;
      }
      savingRef.current = true;
      setSaving(true);
      try {
        do {
          pendingRef.current = false;
          const revBeingSaved = editRevRef.current;
          const snapshot = productRef.current;
          if (!snapshot) break;
          const rec = await updateProduct(id, nameRef.current || snapshot.name, snapshot);
          setSavedAt(rec.updated_at);
          setSavedRev((prev) => Math.max(prev, revBeingSaved));
        } while (pendingRef.current);
        if (!silent) showToast("保存しました");
      } catch (e) {
        showToast("保存に失敗: " + (e instanceof Error ? e.message : String(e)));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [id]
  );

  // 自動保存（変更の2.5秒後）
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => doSave(true), 2500);
    return () => clearTimeout(t);
  }, [dirty, editRev, doSave]);

  // ページ離脱前の警告（タブを閉じる／リロード）
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // アンマウント時の安全網（明示的に破棄した場合は除く）
  const doSaveRef = useRef(doSave);
  useEffect(() => { doSaveRef.current = doSave; }, [doSave]);
  useEffect(() => {
    return () => {
      if (!skipFlushRef.current && editRevRef.current !== savedRevRef.current) {
        void doSaveRef.current(true);
      }
    };
  }, []);

  const mutate = useCallback((fn: (p: Product) => void) => {
    setProduct((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      productRef.current = next;
      return next;
    });
    bumpEdit();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  // ===== 画面遷移ガード（未保存確認） =====
  function guardedNav(to: string) {
    if (dirty) setNavTarget(to);
    else nav(to);
  }
  async function saveAndGo() {
    const to = navTarget;
    setNavTarget(null);
    skipFlushRef.current = true;
    await doSave(false);
    if (to) nav(to);
  }
  function discardAndGo() {
    const to = navTarget;
    setNavTarget(null);
    skipFlushRef.current = true;
    if (to) nav(to);
  }

  async function onExcel() {
    if (!product) return;
    setExporting(true);
    try {
      const { exportExcel } = await import("../lib/excel");
      await exportExcel({ ...product, name: name || product.name }, { includeCost });
      showToast("Excel を書き出しました");
    } catch (e) {
      showToast("Excel 出力に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  }

  async function onPdf() {
    if (!product || !printRef.current) return;
    setExporting(true);
    try {
      const { exportPdf } = await import("../lib/pdf");
      await exportPdf(printRef.current, `${safeName(name || product.name)}_企画書.pdf`);
      showToast("PDF を書き出しました");
    } catch (e) {
      showToast("PDF 出力に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  }

  async function onHtml() {
    if (!product) return;
    setExporting(true);
    try {
      const { exportHtml } = await import("../lib/html");
      exportHtml({ ...product, name: name || product.name }, includeCost, `${safeName(name || product.name)}_企画書.html`, name || product.name);
      showToast("HTML を書き出しました");
    } catch (e) {
      showToast("HTML 出力に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  }

  async function onShare() {
    if (!product) return;
    setSharing(true);
    try {
      const { renderShareableHtml } = await import("../lib/html");
      const html = renderShareableHtml({ ...product, name: name || product.name }, includeCost, name || product.name);
      const id = await createShare(html, name || product.name);
      setShareUrl(`${window.location.origin}/share/${id}`);
    } catch (e) {
      showToast("共有リンクの作成に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSharing(false);
    }
  }

  if (loading) return (<><Header /><div className="center-loading">読み込み中…</div></>);
  if (!product) return (<><Header /><div className="center-loading">商品が見つかりません</div></>);

  return (
    <>
      <Header onBrandClick={() => guardedNav("/")} />
      <div className="editor-bar">
        <button className="btn-ghost" onClick={() => guardedNav("/")}>← 一覧</button>
        <input
          className="name-input"
          value={name}
          onChange={(e) => { setName(e.target.value); nameRef.current = e.target.value; bumpEdit(); }}
          placeholder="商品名"
        />
        <span className="saved">
          {saving ? "保存中…" : dirty ? "● 未保存の変更" : savedAt ? `保存済み ${new Date(savedAt).toLocaleTimeString("ja-JP")}` : ""}
        </span>
        <span className="spacer" />
        <select
          className="layout-select"
          value={product.layout || "standard"}
          onChange={(e) => mutate((p) => { p.layout = e.target.value as LayoutMode; })}
          title="出力レイアウト（PDF・HTML）"
        >
          <option value="standard">レイアウト：標準</option>
          <option value="imageLarge">レイアウト：画像を大きく</option>
          <option value="compact">レイアウト：コンパクト</option>
        </select>
        <label className="incl-cost" title="PDF / HTML / Excel / プレビューに原価表を含めるか">
          <input type="checkbox" checked={includeCost} onChange={(e) => setIncludeCost(e.target.checked)} />
          原価表を含める
        </label>
        <button className="btn-secondary" onClick={onExcel} disabled={exporting}>📊 Excel</button>
        <button className="btn-secondary" onClick={onPdf} disabled={exporting}>📄 PDF</button>
        <button className="btn-secondary" onClick={onHtml} disabled={exporting}>🌐 HTML</button>
        <button className="btn-secondary" onClick={onShare} disabled={sharing || exporting} title="企画書HTMLを公開URLにして共有">
          {sharing ? "共有準備中…" : "🔗 共有リンク"}
        </button>
        <button className="btn-primary" onClick={() => doSave(false)} disabled={saving || !dirty}>保存</button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "planning" ? "active" : ""}`} onClick={() => setTab("planning")}>商品企画書</button>
        <button className={`tab ${tab === "cost" ? "active" : ""}`} onClick={() => setTab("cost")}>原価表</button>
        <button className={`tab ${tab === "preview" ? "active" : ""}`} onClick={() => setTab("preview")}>🔍 プレビュー</button>
      </div>

      <div className="panel" style={{ marginBottom: 40 }}>
        {tab === "planning" && <PlanningEditor product={product} mutate={mutate} />}
        {tab === "cost" && <CostEditor product={product} mutate={mutate} />}
        {tab === "preview" && <LayoutPreview product={{ ...product, name: name || product.name }} includeCost={includeCost} />}
      </div>

      {/* PDF / HTML 出力用（画面外） */}
      <PrintDocument ref={printRef} product={{ ...product, name: name || product.name }} includeCost={includeCost} />

      {toast && <div className="toast">{toast}</div>}
      {exporting && <div className="toast">書き出し中…</div>}

      {shareUrl && (
        <div className="modal-overlay" onClick={() => setShareUrl(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔗 共有リンクを作成しました</h3>
            <p>
              このURLを開くと、ブラウザで企画書（HTML）を閲覧できます。
              {includeCost ? "※ 原価表を含みます。" : "※ 原価表は含みません。"}
            </p>
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{ width: "100%" }}
            />
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setShareUrl(null)}>閉じる</button>
              <button className="btn-secondary" onClick={() => window.open(shareUrl, "_blank", "noopener")}>開く</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast("URLをコピーしました");
                  } catch {
                    showToast("コピーできませんでした。URLを長押し/選択してコピーしてください");
                  }
                }}
              >
                URLをコピー
              </button>
            </div>
          </div>
        </div>
      )}

      {navTarget !== null && (
        <div className="modal-overlay" onClick={() => setNavTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>保存していない変更があります</h3>
            <p>このページを離れると、保存していない変更が失われる可能性があります。どうしますか？</p>
            <div className="actions">
              <button className="btn-ghost" onClick={() => setNavTarget(null)}>キャンセル</button>
              <button className="btn-danger" onClick={discardAndGo}>保存せず移動</button>
              <button className="btn-primary" onClick={saveAndGo}>保存して移動</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
