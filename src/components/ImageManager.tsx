import { useRef, useState } from "react";
import type { ProductImage } from "../lib/types";
import { uploadImage, removeImage } from "../lib/api";
import { compressImage } from "../lib/media";
import { uid } from "../lib/format";

export default function ImageManager({
  images,
  onChange,
  label,
}: {
  images: ProductImage[];
  onChange: (next: ProductImage[]) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const dragDepth = useRef(0);

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      setErr("http(s):// で始まる直接URLを入力してください");
      return;
    }
    const kind: "image" | "video" = /\.(mp4|webm|mov|m4v|ogg|ogv)(\?|#|$)/i.test(u) ? "video" : "image";
    onChange([...images, { id: uid(), url: u, caption: "", kind }]);
    setUrlInput("");
    setErr("");
  }

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      const list = Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
      );
      if (list.length === 0) {
        setErr("画像または動画ファイルを選択してください");
        return;
      }
      const added: ProductImage[] = [];
      for (const file of list) {
        let f = file;
        if (file.type.startsWith("image/")) {
          setBusyMsg("画像を最適化中…");
          f = await compressImage(file);
        }
        // 動画は互換性優先のため圧縮せず、元ファイル（mp4等）のままアップロードする。
        setBusyMsg("アップロード中…");
        const { url, path } = await uploadImage(f);
        added.push({ id: uid(), url, path, caption: "", kind: f.type.startsWith("video/") ? "video" : "image" });
      }
      onChange([...images, ...added]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/maximum allowed size|payload too large|exceeded|413|too large/i.test(msg)) {
        setErr("ファイルサイズが大きすぎてアップロードできませんでした。動画は軽く（〜500MB目安）するか、下の「URLで追加」で外部URL（YouTube等にアップした動画の直接URL）を指定してください。");
      } else {
        setErr("アップロードに失敗しました: " + msg);
      }
    } finally {
      setBusy(false);
      setBusyMsg("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function del(img: ProductImage) {
    onChange(images.filter((i) => i.id !== img.id));
    removeImage(img.path).catch(() => {});
  }

  function onDragEnter(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setOver(true);
  }
  function onDragOver(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function onDragLeave(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setOver(false);
    if (!busy) onPick(e.dataTransfer.files);
  }

  return (
    <div
      className={"img-zone" + (over ? " over" : "")}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {err && <div className="help" style={{ color: "var(--red)" }}>{err}</div>}
      <div className="images-grid">
        {images.map((img) => (
          <div className="img-tile" key={img.id}>
            <button className="del" onClick={() => del(img)} title="削除">✕</button>
            {img.kind === "video" ? (
              <video src={img.url} controls preload="metadata" style={{ width: "100%", height: 130, objectFit: "contain", background: "#000", display: "block" }} />
            ) : (
              <img src={img.url} alt={img.caption || ""} />
            )}
            <input
              className="cap"
              placeholder="キャプション"
              value={img.caption || ""}
              onChange={(e) => onChange(images.map((i) => (i.id === img.id ? { ...i, caption: e.target.value } : i)))}
            />
          </div>
        ))}
        <div className={"img-add" + (over ? " over" : "")} onClick={() => !busy && inputRef.current?.click()}>
          {busy ? (
            busyMsg || "アップロード中…"
          ) : over ? (
            "ここにドロップ"
          ) : (
            <>
              ＋ {label}を追加
              <span className="img-add-hint">クリック / ドラッグ＆ドロップ（画像・動画）</span>
            </>
          )}
        </div>
      </div>
      <div className="img-url">
        <input
          type="url"
          placeholder="または画像・動画の直接URLを貼り付け（https://….mp4 など）"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
        />
        <button className="btn-secondary btn-sm" onClick={addUrl} disabled={!urlInput.trim()}>URLで追加</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}

// ドラッグ中のデータにファイルが含まれるか（テキスト等のドラッグでは反応しない）
function hasFiles(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  return !!types && Array.from(types).includes("Files");
}
