import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import CostEditor from "../components/CostEditor";
import PlanningEditor from "../components/PlanningEditor";
import PrintDocument from "../components/PrintDocument";
import { getProduct, updateProduct } from "../lib/api";
import type { Product } from "../lib/types";

type Tab = "planning" | "cost";

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [tab, setTab] = useState<Tab>("planning");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((rec) => {
        setProduct(rec.data);
        setName(rec.name);
        setSavedAt(rec.updated_at);
      })
      .catch((e) => setToast(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const doSave = useCallback(
    async (silent = false) => {
      if (!id || !product) return;
      setSaving(true);
      try {
        const rec = await updateProduct(id, name || product.name, product);
        setSavedAt(rec.updated_at);
        setDirty(false);
        if (!silent) showToast("保存しました");
      } catch (e) {
        showToast("保存に失敗: " + (e instanceof Error ? e.message : String(e)));
      } finally {
        setSaving(false);
      }
    },
    [id, product, name]
  );

  // 自動保存（変更の2.5秒後）
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(true), 2500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, doSave]);

  // 離脱前の警告
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

  const mutate = useCallback((fn: (p: Product) => void) => {
    setProduct((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  async function onExcel() {
    if (!product) return;
    setExporting(true);
    try {
      const { exportExcel } = await import("../lib/excel");
      await exportExcel({ ...product, name: name || product.name });
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
      await exportPdf(printRef.current, `${(name || product.name).replace(/[\\/:*?"<>|]/g, "_")}_企画書.pdf`);
      showToast("PDF を書き出しました");
    } catch (e) {
      showToast("PDF 出力に失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  }

  if (loading) return (<><Header /><div className="center-loading">読み込み中…</div></>);
  if (!product) return (<><Header /><div className="center-loading">商品が見つかりません</div></>);

  return (
    <>
      <Header />
      <div className="editor-bar">
        <button className="btn-ghost" onClick={() => nav("/")}>← 一覧</button>
        <input
          className="name-input"
          value={name}
          onChange={(e) => { setName(e.target.value); setDirty(true); }}
          placeholder="商品名"
        />
        <span className="saved">
          {saving ? "保存中…" : dirty ? "● 未保存の変更" : savedAt ? `保存済み ${new Date(savedAt).toLocaleTimeString("ja-JP")}` : ""}
        </span>
        <span className="spacer" />
        <button className="btn-secondary" onClick={onExcel} disabled={exporting}>📊 Excel 出力</button>
        <button className="btn-secondary" onClick={onPdf} disabled={exporting}>📄 PDF 出力</button>
        <button className="btn-primary" onClick={() => doSave(false)} disabled={saving || !dirty}>保存</button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "planning" ? "active" : ""}`} onClick={() => setTab("planning")}>商品企画書</button>
        <button className={`tab ${tab === "cost" ? "active" : ""}`} onClick={() => setTab("cost")}>原価表</button>
      </div>

      <div className="panel" style={{ marginBottom: 40 }}>
        {tab === "planning" ? <PlanningEditor product={product} mutate={mutate} /> : <CostEditor product={product} mutate={mutate} />}
      </div>

      {/* PDF キャプチャ用（画面外） */}
      <PrintDocument ref={printRef} product={{ ...product, name: name || product.name }} />

      {toast && <div className="toast">{toast}</div>}
      {exporting && <div className="toast">書き出し中…</div>}
    </>
  );
}
