import type { Product } from "./types";
import { uid } from "./format";

export const SCHEMA_VERSION = 1;

// 空の明細行
export function emptyLine() {
  return {
    id: uid(),
    category: "",
    item: "",
    spec: "",
    qtyPerSet: 1,
    unitPrice: 0,
    orderQty: 0,
    supplier: "",
    status: "未発注",
    note: "",
  };
}

export const COST_STATUSES = ["未発注", "発注済", "入荷済", "検討中", "確定"];

// 提供サンプル（27SS 新型ペルチェ空調服 / 原価表）をもとにしたテンプレート
export function makeTemplateProduct(): Product {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: "新規商品",
    category: "",
    layout: "standard",
    cost: {
      setTotal: 10000,
      sellingPrice: 27800,
      moldTotal: 4000000,
      targetGrossMarginRate: 0.5,
      taxRate: 0.1,
      moq: 10000,
      items: [
        line("服地", "服地", "", 1, 2200, 5000),
        line("デバイス", "ペルチェデバイス", "L1S2", 1, 2100, 10000),
        line("バッテリー", "バッテリー", "28V対応", 1, 5650, 10000),
        line("ケーブル", "コントローラーケーブル", "L字Type-C / DC", 1, 975, 10000),
        line("ファン", "ファン", "金型代400円計算込み", 1, 2100, 10000),
        line("梱包", "パッケージ", "", 1, 0, 10000),
        line("梱包", "カートン", "", 1, 25, 10000),
        line("梱包", "セット組＋チャーター", "FTM負担", 1, 200, 10000),
      ],
    },
    planning: {
      releasePeriod: "4-5月",
      person: "",
      mainImages: [],
      sellingPoints:
        "・モバイルバッテリーで稼働\n・押し込むだけで取り付けできる簡単着脱リング（特許申請中）\n・ペルチェとファンを１本のケーブル、コントローラーで操作",
      headCopy:
        "65W出力の半固体モバイルバッテリーで稼働し、新設計のクイックロック機能付き空調ファンを搭載",
      specSections: [
        {
          id: uid(),
          heading: "【空調ファン】",
          bullets: [
            "100L/s以上の風量",
            "押し込むだけで固定できるクイックロックリング™",
            "低いV数で28V長信ファンと同等性能を実現",
          ],
        },
        {
          id: uid(),
          heading: "【65W半固体バッテリー】",
          bullets: [
            "発熱・発火のリスクを低減した高い安全性",
            "リン酸鉄バッテリー比約40%の大容量",
            "PD65Wの高出力",
          ],
        },
        {
          id: uid(),
          heading: "【ペルチェデバイス】",
          bullets: [
            "新形状ペルチェを採用",
            "特許申請中のスペーサーリング™",
            "ファンと同じ1つのコントローラーで操作可能",
            "昨年より冷却能力、稼働時間が向上",
          ],
        },
      ],
      color: "ー",
      includedItems: "空調ファン、ペルチェSx2、半固体モバイルバッテリー",
      specText:
        "・品名：空調ファン\n・材質：本体／PC＋ABS　羽根／PP\n・風量モード：4段階\n・連続使用時間：\nペルチェ強+ファンMAX：4.5h 以上／ペルチェ強+ファンTURBO：5h以上／\nペルチェ強+ファンHIGH：5.5h以上／ペルチェ強+ファンLOW：7.5h以上\n\n・品名：半固体モバイルバッテリー\n・材質：ABS　・最大出力：PD65W\n\n・品名：ペルチェデバイス\n・材質：ABS+PC",
      power: "半固体モバイルバッテリー 24,000mAh(88.8Wh)",
      material: "",
      origin: "中国",
      approvals: "PSE,CE",
      barcodes: [{ id: uid(), model: "", color: "", jan: "" }],
      sizes: [
        { id: uid(), label: "本体", w: "", d: "", h: "", qty: "", weight: "" },
        { id: uid(), label: "パッケージ", w: "", d: "", h: "", qty: "", weight: "" },
        { id: uid(), label: "インナー", w: "", d: "", h: "", qty: "", weight: "" },
        { id: uid(), label: "アウター", w: "", d: "", h: "", qty: "", weight: "" },
      ],
      remarks: "",
      testInfo: "",
      separateItems: "",
      notes: "",
      detailImages: [],
      footerNote: "※企画中商品のため、仕様など変更になる可能性がございます",
      company:
        "株式会社昭和商会　〒141-0031 東京都品川区西五反田1-16-5　TEL.03-6303-9614　FAX.03-6303-9615",
    },
  };
}

function line(
  category: string,
  item: string,
  spec: string,
  qtyPerSet: number,
  unitPrice: number,
  orderQty: number
) {
  return { id: uid(), category, item, spec, qtyPerSet, unitPrice, orderQty, supplier: "", status: "未発注", note: "" };
}
