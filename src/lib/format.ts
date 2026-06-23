export function yen(v: number): string {
  return "¥" + Math.round(v).toLocaleString("ja-JP");
}

export function num(v: number): string {
  return Math.round(v).toLocaleString("ja-JP");
}

export function pct(v: number, digits = 1): string {
  return (v * 100).toFixed(digits) + "%";
}

// 文字列入力から数値を取り出す（カンマ・記号許容）
export function parseNum(v: string): number {
  const n = parseFloat(String(v ?? "").replace(/[,¥\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
