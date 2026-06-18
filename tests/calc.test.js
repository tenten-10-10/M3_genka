/**
 * 原価計算エンジンの検証（元スプレッドシートの値と一致するか）
 *   node tests/calc.test.js
 * 追加の依存なしで実行できる。
 */
'use strict';
const path = require('path');

// public/js/calc.js は window に登録する形式なので、window を用意して読み込む
global.window = {};
require(path.join(__dirname, '..', 'public', 'js', 'calc.js'));
const { computeCost } = global.window.GENKA.calc;

const rows = [
  { qtyPerSet: 1, unitPrice: 2200, orderQty: 5000 },
  { qtyPerSet: 1, unitPrice: 2100, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 5650, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 975, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 2100, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 0, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 25, orderQty: 10000 },
  { qtyPerSet: 1, unitPrice: 200, orderQty: 10000 },
];
const c = computeCost({
  inputs: { setTotal: 10000, price: 27800, moldTotal: 4000000, targetGrossRate: 0.5, taxRate: 0.1, moq: 10000 },
  rows,
});

const cases = [
  ['セット原価合計', c.setCostTotal, 13250],
  ['粗利額', c.grossProfit, 14550],
  ['粗利率(%)', +(c.grossRate * 100).toFixed(1), 52.3],
  ['原価率(%)', +(c.costRate * 100).toFixed(1), 47.7],
  ['金型償却/セット', c.moldPerSet, 400],
  ['金型償却込原価', c.costWithMold, 13650],
  ['総発注金額', c.totalOrderAmount, 121500000],
  ['損益分岐原価', c.breakEvenCost, 13900],
  ['粗利率目標差(%)', +(c.grossRateVsTarget * 100).toFixed(1), 2.3],
  ['目標売価(税込)', c.priceBox.retailIncl, 30580],
  ['粗利額(税込)', c.priceBox.grossIncl, 16005],
];

let failed = 0;
for (const [label, got, want] of cases) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}: ${got}${ok ? '' : ' (期待 ' + want + ')'}`);
}

if (failed) {
  console.error(`\n${failed} 件失敗`);
  process.exit(1);
}
console.log('\nすべてのテストに合格しました');
