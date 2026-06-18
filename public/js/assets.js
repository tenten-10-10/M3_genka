/* 画像アセット。ロゴはインライン SVG（ベクター・軽量・バイナリ非依存）。
   商品画像はユーザーがアップロードして配置する。 */
(function (global) {
  'use strict';

  const logoSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="130" viewBox="0 0 520 130">' +
    '<rect x="2" y="16" width="98" height="98" rx="20" fill="#1f4d3b"/>' +
    '<path d="M30 44 q-8 0 -8 9 q0 8 9 9 l8 2 q3 1 3 4 q0 4 -6 4 q-7 0 -10 -4 l-6 9 q6 7 16 7 q16 0 16 -16 q0 -8 -9 -10 l-8 -2 q-3 -1 -3 -3 q0 -3 5 -3 q5 0 9 3 l6 -9 q-6 -6 -14 -6 z" fill="#ffffff"/>' +
    '<path d="M58 30 l16 0 l-22 70 l-16 0 z" fill="#77a491" opacity="0.55"/>' +
    '<text x="116" y="50" font-family="\'Noto Sans JP\',sans-serif" font-size="25" fill="#1f4d3b">株式会社 昭和商会</text>' +
    '<text x="114" y="108" font-family="Arial,Helvetica,sans-serif" font-size="56" font-weight="bold" fill="#243e33" letter-spacing="3">SHOWA</text>' +
    '</svg>';

  global.GENKA = global.GENKA || {};
  global.GENKA.assets = {
    logo: 'data:image/svg+xml,' + encodeURIComponent(logoSvg),
    samples: [],
  };
})(window);
