import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../lib/types";
import { buildBlocks } from "./PrintDocument";

// A4 カード寸法（出力時と同じ比率で算出）
const CARD_W = 800;
const PADDING = 26;
const INNER_W = CARD_W - PADDING * 2; // 748
const INNER_H = Math.round((INNER_W * 281) / 194); // A4 本文領域 ≒ 1083px
const CARD_H = INNER_H + PADDING * 2;
const GAP = (INNER_W * 2.5) / 194;

const MAX_PAGES = 2;
const MIN_SCALE = 0.6;

// ブロック高さの配列から、指定スケールでのページ区切りを求める（pdf.ts と同じ考え方）
function packBreaks(heights: number[], s: number): Set<number> {
  const brk = new Set<number>();
  let cursor = 0;
  let firstOnPage = true;
  heights.forEach((h0, i) => {
    const h = h0 * s;
    if (h > INNER_H) {
      if (!firstOnPage) brk.add(i);
      cursor = INNER_H + 1;
      firstOnPage = false;
      return;
    }
    if (!firstOnPage && cursor + h > INNER_H) {
      brk.add(i);
      cursor = 0;
      firstOnPage = true;
    }
    cursor += h + GAP * s;
    firstOnPage = false;
  });
  return brk;
}

export default function LayoutPreview({
  product,
  includeCost,
  onToggleIncludeCost,
}: {
  product: Product;
  includeCost?: boolean;
  onToggleIncludeCost?: () => void;
}) {
  const blocks = buildBlocks(product, { includeCost, media: "embed" });
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);
  const [screenScale, setScreenScale] = useState(1);
  const [tick, setTick] = useState(0);

  // 各ブロックの実寸を測定
  useLayoutEffect(() => {
    const c = measureRef.current;
    if (!c) return;
    const els = Array.from(c.querySelectorAll<HTMLElement>("[data-pdf-block]"));
    setHeights(els.map((el) => el.offsetHeight));
  }, [product, includeCost, tick]);

  // 画像の読み込み後に再計測
  useEffect(() => {
    const c = measureRef.current;
    if (!c) return;
    const imgs = Array.from(c.querySelectorAll("img"));
    const onLoad = () => setTick((t) => t + 1);
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", onLoad); });
    return () => imgs.forEach((im) => im.removeEventListener("load", onLoad));
  }, [product, includeCost]);

  // 画面幅に合わせて縮小
  useEffect(() => {
    function fit() {
      const w = wrapRef.current?.clientWidth ?? CARD_W;
      setScreenScale(Math.min(1, (w - 8) / CARD_W));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // なるべく MAX_PAGES 枚に収まるスケールとページ区切りを決定（pdf.ts と同じ）
  const { scale, breaks } = useMemo(() => {
    if (!heights.length) return { scale: 1, breaks: new Set<number>() };
    let brk = packBreaks(heights, 1);
    if (brk.size + 1 <= MAX_PAGES) return { scale: 1, breaks: brk };
    let s = MIN_SCALE;
    for (let t = 1; t >= MIN_SCALE; t -= 0.02) {
      const bb = packBreaks(heights, t);
      if (bb.size + 1 <= MAX_PAGES) { s = Math.round(t * 100) / 100; brk = bb; break; }
      brk = bb;
      s = Math.round(t * 100) / 100;
    }
    return { scale: s, breaks: brk };
  }, [heights]);

  // ブロックをページごとに分割
  const pages: React.ReactElement[][] = [];
  let cur: React.ReactElement[] = [];
  blocks.forEach((b, i) => {
    if (breaks.has(i) && cur.length) { pages.push(cur); cur = []; }
    cur.push(b);
  });
  if (cur.length) pages.push(cur);

  return (
    <div ref={wrapRef} className="preview-scroll">
      <div className="preview-bar">
        <label className="prev-toggle">
          <input type="checkbox" checked={includeCost !== false} onChange={() => onToggleIncludeCost?.()} />
          原価表を含める
        </label>
        <span className="prev-bar-note">
          A4 ページ割りプレビュー（なるべく {MAX_PAGES} 枚以内）
          {scale < 1 && <>・<b>{Math.round(scale * 100)}%</b> に縮小中</>}
        </span>
      </div>
      <div style={{ zoom: screenScale } as React.CSSProperties}>
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="a4-page"
            style={{ width: CARD_W, height: CARD_H, padding: PADDING, boxSizing: "border-box", overflow: "hidden", fontFamily: '"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif', color: "#243029" }}
          >
            <span className="page-no">ページ {pi + 1} / {pages.length}</span>
            <div style={{ width: INNER_W, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top center" }}>
              {page}
            </div>
          </div>
        ))}
      </div>
      {/* 計測用（非表示・等倍） */}
      <div ref={measureRef} aria-hidden style={{ position: "absolute", left: -10000, top: 0, width: CARD_W, padding: PADDING, boxSizing: "border-box" }}>
        {blocks}
      </div>
    </div>
  );
}
