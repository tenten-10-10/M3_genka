/* 新規企画書の初期データ（元の「27SS 新型ペルチェ空調服」企画書を再現）。 */
(function (global) {
  'use strict';

  function defaultPlan() {
    return {
      title: '商　品　企　画　書',
      productName: '27SS 新型ペルチェ空調服（デバイス類）',
      releaseDate: '4-5月',
      person: '麦倉',

      // 商品画像エリアに配置される画像（「＋ 画像を追加」でアップロードして配置）
      images: [],

      sellingPoints:
        '・モバイルバッテリーで稼働\n' +
        '・押し込むだけで取り付けできる簡単着脱リング（特許申請中）\n' +
        '・ペルチェとファンを１本のケーブル、コントローラーで操作',

      headCopy:
        '65W出力の半固体モバイルバッテリーで稼働し、\n' +
        '新設計のクイックロック機能付き空調ファンを搭載',

      description:
        '【空調ファン】\n' +
        '● 100L/s以上の風量\n' +
        '● 押し込むだけで固定できるクイックロックリング™\n' +
        '● 低いV数で28V長信ファンと同等性能を実現\n' +
        '\n' +
        '【65W半固体バッテリー】\n' +
        '● 発熱・発火のリスクを低減した高い安全性\n' +
        '● リン酸鉄バッテリー比約40%の大容量\n' +
        '● PD65Wの高出力\n' +
        '\n' +
        '【ペルチェデバイス】\n' +
        '● 新形状ペルチェを採用\n' +
        '● 特許申請中のスペーサーリング™\n' +
        '● ファンと同じ1つのコントローラーで操作可能\n' +
        '● 昨年より冷却能力、稼働時間が向上',

      // 商品仕様
      color: 'ー',
      included: '空調ファン、ペルチェSx2、半固体モバイルバッテリー',
      specsText:
        '・品名：空調ファン\n' +
        '・材質：本体／PC＋ABS　羽根／PP\n' +
        '・風量モード：4段階\n' +
        '・連続使用時間：\n' +
        'ペルチェ強+ファンMAX：4.5h 以上／ペルチェ強+ファンTURBO：5h以上／\n' +
        'ペルチェ強+ファンHIGH：5.5h以上／ペルチェ強+ファンLOW：7.5h以上\n' +
        '\n' +
        '・品名：半固体モバイルバッテリー\n' +
        '・材質：ABS　・最大出力：PD65W\n' +
        '\n' +
        '・品名：ペルチェデバイス\n' +
        '・材質：ABS+PC',
      power: '半固体モバイルバッテリー 24,000mAh(88.8Wh)',
      material: '',
      origin: '中国',
      approval: 'PSE,CE',

      // JAN / バーコード
      jan: [
        { model: '', color: 'ー', jan: '' },
        { model: 'ー', color: 'ー', jan: 'ー' },
        { model: 'ー', color: 'ー', jan: 'ー' },
        { model: 'ー', color: 'ー', jan: 'ー' },
        { model: 'ー', color: 'ー', jan: 'ー' },
        { model: 'ー', color: 'ー', jan: 'ー' },
        { model: 'ー', color: 'ー', jan: 'ー' },
      ],

      // サイズ・梱包・重量
      sizeBody: { size: '', qty: '', weight: '' },
      sizePackage: { size: '', qty: '', weight: '' },
      sizeInner: { size: '', qty: '', weight: '' },
      sizeOuter: { size: '', qty: '', weight: '' },
      sizeRemark: '',

      testInfo: '',
      optional: '',
      notes: '',
      footerNote: '※企画中商品のため、仕様など変更になる可能性がございます',
      company: '株式会社昭和商会 〒141-0031 東京都品川区西五反田1-16-5　 TEL.03-6303-9614　 FAX.03-6303-9615',

      // 原価表
      cost: {
        inputs: {
          setTotal: 10000,
          price: 27800,
          moldTotal: 4000000,
          targetGrossRate: 0.5,
          taxRate: 0.1,
          moq: 10000,
        },
        rows: [
          { category: '服地', item: '服地', memo: '', qtyPerSet: 1, unitPrice: 2200, orderQty: 5000, supplier: '', status: '未発注', remark: '' },
          { category: 'デバイス', item: 'ペルチェデバイス', memo: 'L1S2', qtyPerSet: 1, unitPrice: 2100, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: 'バッテリー', item: 'バッテリー', memo: '28V対応', qtyPerSet: 1, unitPrice: 5650, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: 'ケーブル', item: 'コントローラーケーブル', memo: 'L字Type-C / DC', qtyPerSet: 1, unitPrice: 975, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: 'ファン', item: 'ファン', memo: '金型代400円計算込み', qtyPerSet: 1, unitPrice: 2100, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: '梱包', item: 'パッケージ', memo: '', qtyPerSet: 1, unitPrice: 0, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: '梱包', item: 'カートン', memo: '', qtyPerSet: 1, unitPrice: 25, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
          { category: '梱包', item: 'セット組＋チャーター', memo: 'FTM負担', qtyPerSet: 1, unitPrice: 200, orderQty: 10000, supplier: '', status: '未発注', remark: '' },
        ],
      },
    };
  }

  // マスタ（区分・ステータスの選択肢）
  const CATEGORIES = ['服地', 'デバイス', 'バッテリー', 'ケーブル', 'ファン', '梱包', 'その他'];
  const STATUSES = ['未発注', '見積中', '発注済', '入荷済', '不要'];

  global.GENKA = global.GENKA || {};
  global.GENKA.defaultPlan = defaultPlan;
  global.GENKA.master = { CATEGORIES: CATEGORIES, STATUSES: STATUSES };
})(window);
