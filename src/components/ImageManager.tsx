import { useRef, useState } from "react";
import type { ProductImage } from "../lib/types";
import { uploadImage, removeImage } from "../lib/api";
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
  const [err, setErr] = useState("");

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      const added: ProductImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const { url, path } = await uploadImage(file);
        added.push({ id: uid(), url, path, caption: "" });
      }
      onChange([...images, ...added]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function del(img: ProductImage) {
    onChange(images.filter((i) => i.id !== img.id));
    removeImage(img.path).catch(() => {});
  }

  return (
    <div>
      {err && <div className="help" style={{ color: "var(--red)" }}>{err}</div>}
      <div className="images-grid">
        {images.map((img) => (
          <div className="img-tile" key={img.id}>
            <button className="del" onClick={() => del(img)} title="削除">✕</button>
            <img src={img.url} alt={img.caption || ""} />
            <input
              className="cap"
              placeholder="キャプション"
              value={img.caption || ""}
              onChange={(e) => onChange(images.map((i) => (i.id === img.id ? { ...i, caption: e.target.value } : i)))}
            />
          </div>
        ))}
        <div className="img-add" onClick={() => !busy && inputRef.current?.click()}>
          {busy ? "アップロード中…" : `＋ ${label}を追加`}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </div>
  );
}
