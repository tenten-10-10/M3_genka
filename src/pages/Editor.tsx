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
  const [savedAt, setSavedAt] = useState<string>("");
  const [toast, setToast] = useState("");
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 編集リビジョンで「未保存」を厳密判定する。
  // 古い保存リクエストの完了で、新しい編集の dirty 状態を消さないようにするため。
  const [editRev, setEditRev] = useState(0);
  const [savedRev, setSavedRev] = useState(0);
  const editRevRef = useRef(0);
  const savedRevRef = useRef(0);
  const dirty = editRev !== savedRev;

  // 保存時に常に最新の値を参照するための ref ミラー（クロージャの陳腐化を防ぐ）
  const productRef = useRef<Product | null>(null);
  const nameRef = useRef("");
  useEffect(() => {
    productRef.current = product;
  }, [product]);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);
  useEffect(() => {
    savedRevRef.current = savedRev;
  }, [savedRev]);

  function bumpEdit() {
    editRevRef.current += 1;
    setEditRev(editRevRef.current);
  }

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((rec) => {
        setProduct(rec.data);
        setName(rec.name);
        productRef.current = rec.data;
        nameRef.current = rec.name;
        setSavedAt(rec.updated_at);
      })
      .catch((e) => setToast(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  // 保存。多重実行を防ぎ（古い snapshot による上書きを回避）、
  // 保存中に届いた編集は同じ実行内で続けて保存する。
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const doSave = useCallback(
    async (silent = false): Promise<void> => {
      if (!id || !productRef.current) return;
      if (savingRef.current) {
        // 進行中の保存に「もう一度保存して」と予約（並行リクエストによる順序逆転を防止）
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
          // 保存できたのは revBeingSaved 時点の内容。これより新しい編集があれば dirty のまま。
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

  // 自動保存（変更の2.5秒後）。編集のたびに再スケジュールする。
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

  // アプリ内遷移（「← 一覧」やヘッダーリンク）でアンマウントされる際、
  // デバウンス中の未保存分を取りこぼさないよう保存をフラッシュする。
  const doSaveRef = useRef(doSave);
  useEffect(() => {
    doSaveRef.current = doSave;
  }, [doSave]);
  useEffect(() => {
    return () => {
      if (editRevRef.current !== savedRevRef.current) {
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
          onChange={(e) => { setName(e.target.value); nameRef.current = e.target.value; bumpEdit(); }}
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
