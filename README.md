# 商品企画書システム（M3_genka）

昭和商会の「商品企画書」をそのままの体裁で編集できる Web アプリです。
**画像配置・原価率の自動計算・PDF/Excel書き出し・保存・ログイン**に対応します。

- **フロントエンド**: 依存フレームワーク無しの静的サイト（Vercel ホスティング想定）
- **バックエンド**: Supabase（Edge Function による認証・保存 API ＋ Postgres）

原価表の入力から企画書の価格欄（目標売価・粗利・掛け率など）が自動連動します。
計算結果が元スプレッドシートと一致することを検証済みです（`npm test`）。

---

## アーキテクチャ

```
ブラウザ（静的フロント / Vercel）
   │  fetch（x-genka-token 認証）
   ▼
Supabase Edge Function  "genka-api"   ← 認証・プロジェクト CRUD（service_role で DB アクセス）
   │
   ▼
Supabase Postgres  genka_users / genka_projects（RLS 有効・サービスロールのみ）
```

- 認証は独自のユーザー名＋パスワード（PBKDF2 ハッシュ）。ログイン時に HMAC 署名トークンを発行し、
  クライアントは `localStorage` に保持して `x-genka-token` ヘッダで送信します。
- 画像はプロジェクトデータ（JSONB）に data URI として埋め込み保存されます。

### 主要ファイル

```
public/                     静的フロントエンド（Vercel の出力ディレクトリ）
  index.html
  css/style.css             企画書の体裁を再現
  js/
    config.js               API エンドポイント設定（Supabase）
    api.js                  バックエンド API ラッパー（トークン認証）
    calc.js                 原価計算エンジン
    defaults.js             新規企画書の初期データ
    sheet.js                企画書・原価表の描画とデータバインド
    export.js               PDF / Excel 書き出し
    app.js                  アプリ全体の制御
    assets.js               ロゴ（インライン SVG）
  vendor/                   jsPDF / html2canvas / SheetJS（静的配信）
supabase/functions/genka-api/index.ts   バックエンド（Deno Edge Function）
vercel.json                 静的サイト用 Vercel 設定
serve.js                    ローカル開発用の静的サーバー
tests/calc.test.js          原価計算の検証テスト
```

---

## ローカルでの起動

```bash
npm run serve     # http://localhost:8000 で静的フロントを配信
```

バックエンドは公開中の Supabase Edge Function（`public/js/config.js` の `apiBase`）を利用するため、
ローカルからでもログイン・保存が動作します。

```bash
npm test          # 原価計算が元スプレッドシートの値と一致するか検証
```

---

## デプロイ

### バックエンド（Supabase）

- テーブル: `genka_users` / `genka_projects`（マイグレーション適用済み、RLS 有効）
- Edge Function: `genka-api`（`verify_jwt=false`、独自認証）

  ```bash
  supabase functions deploy genka-api --no-verify-jwt
  ```

### フロントエンド（Vercel・静的）

`vercel.json` で出力ディレクトリを `public` に設定済み（ビルド不要）。

```bash
vercel deploy --prod        # プロジェクト m3-genka へ
```

または Vercel の GitHub 連携を有効化し、本番ブランチへマージするとデプロイされます。
プロジェクト設定で **Framework Preset = Other**、**Output Directory = public** を指定してください
（`vercel.json` でも上書きしています）。

---

## 使い方

1. ログイン画面で**新規登録**（ユーザー名＋6文字以上のパスワード）またはログイン。
2. 上部タブで **「企画書」** と **「原価表」** を切り替え。
3. 原価表の黄色セル（セット総数・売価・金型総額・目標粗利率・税率、各行の数量/単価/発注数）を編集すると、
   原価・粗利・**原価率**・発注金額・企画書の価格欄が即時に再計算されます。
4. 企画書の各項目は直接クリックして編集。商品画像は「＋ 画像を追加」で配置し、ドラッグで移動・サイズ変更。
5. 右上の **「保存」** で Supabase に保存（編集中は自動保存）。
6. **「PDF書き出し」「Excel書き出し」** でダウンロード。

---

## セキュリティ補足

- `public/js/config.js` の anon キーは RLS 保護下の公開鍵で、クライアント露出を前提とした値です。
- DB へはサービスロールを持つ Edge Function のみがアクセスし、所有者制御をコードで強制します
  （`genka_users` / `genka_projects` は RLS 有効・ポリシー無しのため anon からは不可）。
- パスワードは PBKDF2-SHA256（10万回）でハッシュ化して保存します。
