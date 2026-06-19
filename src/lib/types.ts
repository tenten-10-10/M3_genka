// ===== 商品データモデル =====
// 商品企画書（planning）と原価表（cost）を 1 つの商品レコードとして保持する。

export interface CostLineItem {
  id: string;
  category: string; // 区分
  item: string; // 品目
  spec: string; // 仕様・メモ
  qtyPerSet: number; // 数量/セット
  unitPrice: number; // 単価
  orderQty: number; // 発注数
  supplier: string; // 仕入先
  status: string; // ステータス
  note: string; // 備考
}

export interface CostSheet {
  setTotal: number; // セット総数（生産予定数）
  sellingPrice: number; // 売価（税別）
  moldTotal: number; // 金型総額
  targetGrossMarginRate: number; // 粗利率目標（0〜1）
  taxRate: number; // 消費税率（例: 0.1）
  moq: number; // MOQ
  items: CostLineItem[];
}

export interface ProductImage {
  id: string;
  url: string;
  path?: string; // Supabase Storage 上のパス
  caption?: string;
}

export interface SpecSection {
  id: string;
  heading: string; // 例: 【空調ファン】
  bullets: string[]; // ● 項目
}

export interface BarcodeRow {
  id: string;
  model: string; // 型番
  color: string; // カラー
  jan: string; // JAN
}

export interface SizeRow {
  id: string;
  label: string; // 本体 / パッケージ / インナー / アウター
  w: string;
  d: string;
  h: string;
  qty: string; // 入数
  weight: string; // 重量
}

export interface PlanningSheet {
  releasePeriod: string; // 発売時期
  person: string; // 担当
  mainImages: ProductImage[]; // 商品画像（メイン枠）
  sellingPoints: string; // 他社にない訴求点
  headCopy: string; // ヘッドコピー
  specSections: SpecSection[]; // 商品説明
  color: string; // カラー
  includedItems: string; // 同梱品
  specText: string; // 仕様（自由記述）
  power: string; // 電源
  material: string; // 素材
  origin: string; // 原産地
  approvals: string; // 承認等
  barcodes: BarcodeRow[]; // 商品バーコード・JAN
  sizes: SizeRow[]; // サイズ・梱包・重量
  remarks: string; // 備考
  testInfo: string; // 試験情報
  separateItems: string; // 別売品
  notes: string; // その他・特記事項
  detailImages: ProductImage[]; // 詳細画像
  footerNote: string; // ※企画中商品のため…
  company: string; // 会社情報フッター
}

export interface Product {
  schemaVersion: number;
  name: string; // 商品名
  category: string; // 任意の分類タグ
  layout: LayoutMode; // 出力レイアウト
  cost: CostSheet;
  planning: PlanningSheet;
}

// 企画書の出力レイアウト
export type LayoutMode = "standard" | "imageLarge" | "compact";

// Supabase 上の 1 行
export interface ProductRecord {
  id: string;
  name: string;
  data: Product;
  owner_id: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
}
