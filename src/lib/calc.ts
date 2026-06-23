import type { CostLineItem, CostSheet } from "./types";

// 1 明細行の計算
export interface LineCalc {
  setCost: number; // セット原価 = 数量/セット × 単価
  orderAmount: number; // 発注金額 = 単価 × 発注数
}

export function calcLine(item: CostLineItem): LineCalc {
  const setCost = num(item.qtyPerSet) * num(item.unitPrice);
  const orderAmount = num(item.unitPrice) * num(item.orderQty);
  return { setCost, orderAmount };
}

// 原価表全体の計算（Excel の数式を忠実に再現）
export interface CostCalc {
  lines: LineCalc[];
  setCost: number; // Σ セット原価
  totalOrderAmount: number; // Σ 発注金額（総発注金額）
  sellingPrice: number; // 売価（税別）
  grossProfit: number; // 粗利額（税別）= 売価 − セット原価
  grossMarginRate: number; // 粗利率 = 粗利額 / 売価
  costRate: number; // 原価率 = 1 − 粗利率
  moldPerSet: number; // 金型償却/セット = 金型総額 / セット総数
  costWithMold: number; // 金型償却込原価 = セット原価 + 金型償却/セット
  breakEvenCost: number; // 損益分岐原価 = 売価 ×（1 − 粗利率目標）
  marginGap: number; // 粗利率目標差 = 粗利率 − 粗利率目標
  // 税込・企画書用
  taxRate: number;
  priceInclTax: number; // 売価（税込）
  grossProfitInclTax: number; // 粗利額（税込）
  rateOnPrice: number; // 掛け率（テンプレート定義 = 粗利額 / 売価）
}

export function calcCost(cost: CostSheet): CostCalc {
  const lines = cost.items.map(calcLine);
  const setCost = lines.reduce((s, l) => s + l.setCost, 0);
  const totalOrderAmount = lines.reduce((s, l) => s + l.orderAmount, 0);

  const sellingPrice = num(cost.sellingPrice);
  const grossProfit = sellingPrice - setCost;
  const grossMarginRate = sellingPrice > 0 ? grossProfit / sellingPrice : 0;
  const costRate = sellingPrice > 0 ? setCost / sellingPrice : 0;

  const moldPerSet = num(cost.setTotal) > 0 ? num(cost.moldTotal) / num(cost.setTotal) : 0;
  const costWithMold = setCost + moldPerSet;

  const target = num(cost.targetGrossMarginRate);
  const breakEvenCost = sellingPrice * (1 - target);
  const marginGap = grossMarginRate - target;

  const taxRate = num(cost.taxRate);
  const priceInclTax = sellingPrice * (1 + taxRate);
  const grossProfitInclTax = grossProfit * (1 + taxRate);
  const rateOnPrice = grossMarginRate; // 掛け率＝粗利率（提供テンプレートの定義に準拠）

  return {
    lines,
    setCost,
    totalOrderAmount,
    sellingPrice,
    grossProfit,
    grossMarginRate,
    costRate,
    moldPerSet,
    costWithMold,
    breakEvenCost,
    marginGap,
    taxRate,
    priceInclTax,
    grossProfitInclTax,
    rateOnPrice,
  };
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
