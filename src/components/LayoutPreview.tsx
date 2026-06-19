import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Product } from "../lib/types";
import { buildBlocks } from "./PrintDocument";

// A4 カード寸法（出力時と同じ比率で算出）
const CARD_W = 800;
const PADDING = 26;
const INNER_W = CARD_W - PADDING * 2; // 748
const INNER_H = Math.round((INNER_W * 281) / 194); // A4 本文領域 ≒ 1083px
const CARD_H = INNER_H + PADDING * 2;
const GAP = (INNER_W * 2.5) / 194;

export default function LayoutPreview({ product }: { product: Product }) {
  const blocks = buildBlocks(product);
  const measureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState(1);
  const [tick, setTick] = useState(0);

  // 各ブロックの実寸からページ割りを計算（出力側 pdf.ts と同じロジック）
  useLayoutEffect(() => {
    const c = measureRef.current;
    if (!c) return;
    const els = Array.from(c.querySelectorAll<HTMLElement>("[data-pdf-block]"));
    const brk = new Set<number>();
    let cursor = 0;
    let firstOnPage = true;
    els.forEach((el, i) => {
      const h = el.offsetHeight;
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
      cursor += h + GAP;
      firstOnPage = false;
    });
    setBreaks(brk);
  }, [product, tick]);

  // 画像の読み込み後に再計測
  useEffect(() => {
    const c = measureRef.current;
    if (!c) return;
    const imgs = Array.from(c.querySelectorAll("img"));
    const onLoad = () => setTick((t) => t + 1);
    imgs.forEach((im) => { if (!im.complete) im.addEventListener("load", onLoad); });
    return () => imgs.forEach((im) => im.removeEventListener("load", onLoad));
  }, [product]);

  // 画面幅に合わせて縮小
  useEffect(() => {
    function fit() {
      const w = wrapRef.current?.clientWidth ?? CARD_W;
      setScale(Math.min(1, (w - 8) / CARD_W));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

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
      <div className="help" style={{ marginTop: 0, marginBottom: 12 }}>
        A4 で出力した際のページ割りプレビューです。レイアウトはツールバーの「レイアウト」で切り替えできます。
      </div>
      <div style={{ zoom: scale } as React.CSSProperties}>
        {pages.map((page, pi) => (
          <div
            key={pi}
            className="a4-page"
            style={{ width: CARD_W, minHeight: CARD_H, padding: PADDING, boxSizing: "border-box", fontFamily: '"Noto Sans JP","Hiragino Sans",Meiryo,sans-serif', color: "#243029" }}
          >
            <span className="page-no">ページ {pi + 1} / {pages.length}</span>
            {page}
          </div>
        ))}
      </div>
      {/* 計測用（非表示） */}
      <div ref={measureRef} aria-hidden style={{ position: "absolute", left: -10000, top: 0, width: CARD_W, padding: PADDING, boxSizing: "border-box" }}>
        {blocks}
      </div>
    </div>
  );
}
