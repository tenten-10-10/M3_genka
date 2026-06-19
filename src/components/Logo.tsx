import { useState } from "react";

// 正式ロゴ（public/showa-logo.png）が存在すれば表示。無ければ何も描画しない（仮ロゴは表示しない）。
// white=true でダーク背景用に白く表示する。
export default function Logo({ height = 28, white = false }: { height?: number; white?: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src="/showa-logo.png"
      alt="SHOWA"
      onError={() => setOk(false)}
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
