import { useState } from "react";
import { useSettings } from "../lib/settings";

// アプリ設定にロゴURL（Supabase 公開URL）があれば表示。無ければ何も描画しない。
// white=true でダーク背景用に白く表示する。
export default function Logo({ height = 28, white = false }: { height?: number; white?: boolean }) {
  const { logoUrl } = useSettings();
  const [errored, setErrored] = useState(false);
  if (!logoUrl || errored) return null;
  return (
    <img
      src={logoUrl}
      alt="SHOWA"
      onError={() => setErrored(true)}
      crossOrigin="anonymous"
      style={{
        height,
        width: "auto",
        display: "block",
        ...(white ? { filter: "brightness(0) invert(1)" } : {}),
      }}
    />
  );
}
