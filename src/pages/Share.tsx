import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getShare } from "../lib/api";

// 公開ビューア：保存された企画書HTMLを iframe で表示する（ログイン不要）。
export default function Share() {
  const { id } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    getShare(id)
      .then((s) => {
        setHtml(s.html);
        if (s.name) document.title = s.name;
      })
      .catch(() => setErr("共有が見つかりませんでした（削除済み、またはURLが正しくない可能性があります）"));
  }, [id]);

  if (err) return <div className="center-loading">{err}</div>;
  if (html === null) return <div className="center-loading">読み込み中…</div>;

  return (
    <iframe
      title="企画書"
      srcDoc={html}
      sandbox="allow-same-origin allow-popups allow-downloads"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }}
    />
  );
}
