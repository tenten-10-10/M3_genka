/* 原価計算エンジン（元スプレッドシートの計算式を再現）
 *
 * 検証済みの計算式:
 *   行・セット原価   = 数量/セット × 単価
 *   行・発注金額     = 単価 × 発注数
 *   セット原価合計   = Σ(行セット原価)                      … 例 13,250
 *   金型償却/セット  = 金型総額 ÷ セット総数                 … 例 4,000,000 ÷ 10,000 = 400
 *   金型償却込原価   = セット原価合計 + 金型償却/セット       … 例 13,650
 *   粗利額           = 売価 − セット原価合計                 … 例 27,800 − 13,250 = 14,550
 *   粗利率           = 粗利額 ÷ 売価                         … 例 52.3%
 *   原価率           = セット原価合計 ÷ 売価                 … 例 47.7%
 *   総発注金額       = Σ(行発注金額)                         … 例 121,500,000
 *   損益分岐原価     = 売価 × (1 − 目標粗利率)               … 例 27,800 × 0.5 = 13,900
 *   粗利率目標差     = 粗利率 − 目標粗利率                   … 例 2.3%
 * 価格欄（企画書側）:
 *   目標売価(税込)   = round(売価 × (1 + 税率))
 *   粗利額(税込)     = round(粗利額 × (1 + 税率))
 *   掛け率           = 粗利率（本書式では粗利率と同義で運用）
 */
(function (global) {
  'use strict';

  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/[, ¥%]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function computeCost(model) {
    model = model || {};
    const inputs = model.inputs || {};
    const rows = Array.isArray(model.rows) ? model.rows : [];

    const setTotal = num(inputs.setTotal);
    const price = num(inputs.price);
    const moldTotal = num(inputs.moldTotal);
    const targetGrossRate = num(inputs.targetGrossRate); // 0〜1
    const taxRate = inputs.taxRate == null ? 0.1 : num(inputs.taxRate); // 0〜1
    const moq = num(inputs.moq);

    const rowCalc = rows.map(function (r) {
      const qtyPerSet = num(r.qtyPerSet);
      const unitPrice = num(r.unitPrice);
      const orderQty = num(r.orderQty);
      return {
        setCost: qtyPerSet * unitPrice,
        orderAmount: unitPrice * orderQty,
      };
    });

    const setCostTotal = rowCalc.reduce(function (s, r) { return s + r.setCost; }, 0);
    const totalOrderAmount = rowCalc.reduce(function (s, r) { return s + r.orderAmount; }, 0);
    const moldPerSet = setTotal > 0 ? moldTotal / setTotal : 0;
    const costWithMold = setCostTotal + moldPerSet;
    const grossProfit = price - setCostTotal;
    const grossProfitWithMold = price - costWithMold;
    const grossRate = price > 0 ? grossProfit / price : 0;
    const grossRateWithMold = price > 0 ? grossProfitWithMold / price : 0;
    const costRate = price > 0 ? setCostTotal / price : 0;
    const breakEvenCost = price * (1 - targetGrossRate);
    const grossRateVsTarget = grossRate - targetGrossRate;

    return {
      inputs: { setTotal, price, moldTotal, targetGrossRate, taxRate, moq },
      rows: rowCalc,
      setCostTotal,
      totalOrderAmount,
      moldPerSet,
      costWithMold,
      grossProfit,
      grossProfitWithMold,
      grossRate,
      grossRateWithMold,
      costRate,
      breakEvenCost,
      grossRateVsTarget,
      // 企画書の価格欄
      priceBox: {
        retailExcl: price,
        retailIncl: Math.round(price * (1 + taxRate)),
        grossExcl: grossProfit,
        grossIncl: Math.round(grossProfit * (1 + taxRate)),
        kakeritsu: grossRate,
        moq: moq,
      },
    };
  }

  // 表示ヘルパ
  function yen(v) {
    return '¥' + Math.round(num(v)).toLocaleString('ja-JP');
  }
  function int(v) {
    return Math.round(num(v)).toLocaleString('ja-JP');
  }
  function pct(v, digits) {
    if (digits == null) digits = 1;
    return (num(v) * 100).toFixed(digits) + '%';
  }

  global.GENKA = global.GENKA || {};
  global.GENKA.calc = { computeCost: computeCost, num: num };
  global.GENKA.fmt = { yen: yen, int: int, pct: pct };
})(window);
