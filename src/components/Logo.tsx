// SHOWA ロゴ（インライン SVG・色変更可）。
// ※正式ロゴ画像が手元に無いため再現版。public に正式 PNG を置けば差し替え可能。
export default function Logo({ color = "#2d4c3b", height = 30 }: { color?: string; height?: number }) {
  return (
    <svg height={height} viewBox="0 0 372 100" fill="none" role="img" aria-label="SHOWA">
      {/* ヘルメット（ドーム＋つば＋S） */}
      <path d="M20 62 a36 36 0 0 1 72 0 Z" fill={color} />
      <rect x="9" y="62" width="94" height="15" rx="7.5" fill={color} />
      <text x="56" y="57" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="30" fill="#ffffff">S</text>
      {/* ワードマーク */}
      <text x="120" y="74" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="58" letterSpacing="2" fill={color}>SHOWA</text>
    </svg>
  );
}
