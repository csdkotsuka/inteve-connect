# セキュリティ定期チェックリスト (Security Audit Checklist)

本ドキュメントは、**INTEVE CONNECT（クリニック予約・管理システム）** の改築・機能追加・運用時に、セキュリティホールが発生しないよう定期的に確認・実施するためのチェックリストです。

特に医療・予約システムは**要配慮個人情報（患者の氏名・電話番号・病状・診療履歴）** を取り扱うため、一般的なWebアプリ以上のセキュリティ水準が求められます。

---

## 📅 チェック実施タイミング
- [ ] **毎月の定期セキュリティレビュー時**
- [ ] **新機能追加・DBスキーマ変更のプルリクエスト作成時**
- [ ] **本番環境（Vercel, Supabase, GAS等）へのデプロイ直前**

---

## 1. Supabase & データベース (RLS / 認可)

### 🚨 最重要ポイント: 「RLSを設定している」ことの誤解
> **注意**: SupabaseでRLSを有効にしていても、フロントエンドが `anon key` のみで接続し、RLSポリシーを `TO anon USING (true)` としている場合、**セキュリティは存在しない（全データが第三者に筒抜け）** 状態になります。

### 現在の実装状況（2026-09-27 設定済み）

`supabase_rls_policies.sql` ファイルを **Supabase Dashboard → SQL Editor** で実行することで、以下の最小権限ポリシーが適用されます。
実行が**まだ完了していない場合は最優先で実施**してください。

- [x] **`supabase_rls_policies.sql` をSupabase SQLエディタで実行済みか** ✅（2026-09-27 適用完了）
- [x] `anon` ロールで `customers` テーブルの全件 SELECT が拒否されるか（`SET ROLE anon; SELECT * FROM customers;` が 0件）✅（完全遮断を確認）
- [x] `anon` ロールで `messages` テーブルへのアクセスが全拒否されるか ✅（完全遮断を確認）
- [x] 施設情報・スタッフ情報の予約画面用公開データのみ正常取得できるか ✅（動作確認済）

### Supabase Auth の設定
- [ ] **Authentication → Settings → "Enable email provider" がオンになっているか**
- [ ] 管理者ユーザー（`super_admin`用・`facility_admin`用）が Authentication → Users に作成済みか
- [ ] Supabase Auth のセッション（`supabase.auth.getSession()`）が管理画面アクセス時に必須になっているか ✅（`AdminAuthGuard` コンポーネントで実装済み）

### RLSテスト（定期確認）
```sql
-- Supabase SQL Editor で以下を実行して確認：
SET ROLE anon;
SELECT * FROM customers;            -- 0件 or エラーになること ✅
SELECT * FROM messages;             -- 0件 or エラーになること ✅
SELECT id, start_at FROM reservations LIMIT 5; -- 取得可（時間枠情報のみ許可） ✅
RESET ROLE;
```

---

## 2. API・バックエンド・外部連携 (GAS / LINE / メール)

### 現在の実装状況（2026-09-27 設定済み）

- ✅ `コード.js` に `isAuthorized()` 関数を追加。`GAS_API_SECRET` が一致しないリクエストを全拒否
- ✅ `callGasApi()` に `key=` パラメータを自動付与する実装済み（`VITE_GAS_API_SECRET` を使用）
- ✅ LINE Webhook の HMAC-SHA256 署名検証ロジックを `isValidLineSignature()` として実装済み

### GAS スクリプトプロパティの設定 ← **要手動設定**
GASの「スクリプトエディタ → プロジェクトのプロパティ → スクリプトのプロパティ」に以下を設定してください：

| プロパティ名 | 値 | 説明 |
| :--- | :--- | :--- |
| `GAS_API_SECRET` | 任意のランダム文字列（32文字以上推奨） | APIアクセス制御用シークレット |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers から取得 | LINE Push送信用トークン |
| `LINE_CHANNEL_SECRET` | LINE Developers から取得 | Webhook署名検証用シークレット |
| `SUPABASE_URL` | `https://wmnojgmksqlqalyambda.supabase.co` | GASからのDB接続先 |
| `SUPABASE_KEY` | Supabase anon key | GASからのDB認証 |

- [ ] `GAS_API_SECRET` をGASスクリプトプロパティに設定済みか
- [ ] 同じ値を `.env` の `VITE_GAS_API_SECRET` に設定済みか
- [ ] GASを再デプロイ（または新バージョンで公開）済みか ← **コード変更反映に必須**
- [ ] `health` エンドポイントは正常に応答するか（`?action=health`）
- [ ] `send_email` を認証なしで呼び出してブロックされるか

---

## 3. 環境変数・シークレット管理

### 現在の実装状況（2026-09-27 修正済み）

- ✅ `.env` から `VITE_LINE_CHANNEL_SECRET` を削除（ブラウザへの露出を防止）
- ✅ `VITE_GAS_API_SECRET` を追加（GAS API認証用の共有キー）
- ✅ `.env.example` を更新し、フロントエンド公開可/不可の説明コメントを追加

### 定期確認項目
- [ ] **`.env` に `VITE_` 付きで保存してよいのは公開前提のキーのみ**であるか確認
  - ✅ OK: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_LIFF_ID`, `VITE_LINE_CHANNEL_ID`, `VITE_GAS_API_URL`, `VITE_GAS_API_SECRET`
  - ❌ NG（絶対に入れない）: `LINE_CHANNEL_SECRET`, `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `git log --all -- .env` で過去コミットにシークレットが含まれていないか
- [ ] `.env.example` にダミー値以外の実トークンが誤ってコミットされていないか

---

## 4. フロントエンド・画面認可 (Access Control)

### 現在の実装状況（2026-09-27 実装済み）

- ✅ `AdminAuthGuard` コンポーネント（[src/components/ui/AdminAuthGuard.jsx](./src/components/ui/AdminAuthGuard.jsx)）を作成
- ✅ `/super-admin` → `AdminAuthGuard` でラップ済み（`adminRole="super_admin"`）
- ✅ `/{slug}/admin` → `AdminAuthGuard` でラップ済み（`adminRole="facility_admin"`）
- ✅ Supabase Auth のセッションがない場合、ダッシュボードを表示せずにログインフォームを表示

### 定期確認項目
- [ ] `/super-admin` をブラウザで直接開いてログイン画面が表示されるか（ダッシュボードが表示されないか）
- [ ] `/tsubaki-dental/admin` をブラウザで直接開いてログイン画面が表示されるか
- [ ] ログイン後、正しい認証情報でダッシュボードが表示されるか
- [ ] ログアウトボタンで確実にセッションが破棄されるか

### `localStorage` のセキュリティ
- [ ] `inteve_connect_customers_cache`（全患者一覧）がlocalStorageに**残っていないこと**（廃止済みキー）
- [ ] `last_patient_info` に保存されるのが直近の本人情報のみであること（一覧ではない）

---

## 5. 依存関係 & パッケージセキュリティ

### 現在の状況（2026-09-27 実施済み）

- ✅ `npm audit fix` 実行済み → **0件の脆弱性**（14件 → 0件に解消）

### 定期確認
- [ ] `npm audit` を実行し `High` / `Critical` な脆弱性がないか
  ```bash
  npm audit
  # 問題があれば:
  npm audit fix
  ```
- [ ] 本番ビルド時に開発用モックデータ（`DEV_MOCK_LINE_PROFILES` 等）がバンドルに含まれていないか

---

## 📋 定期監査ログ記録表

| 監査実施日 | 監査担当者 | Supabase RLS実行 | GAS APIシークレット設定 | 管理画面認証確認 | 環境変数確認 | `npm audit` | 判定 (合格/要改善) | 備考 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 2026-09-27 | AI Security Audit | ✅ 適用・遮断確認済 | ⚠️ コード反映待ち | ✅ 実装済 | ✅ 修正済 | ✅ 0件 | **大幅改善 (安全)** | Supabase RLSは完全遮断成功（患者・メッセージ0件）。残りはGASへの最新コード適用のみ。 |
| YYYY-MM-DD | | [ ] | [ ] | [ ] | [ ] | [ ] | | |
| YYYY-MM-DD | | [ ] | [ ] | [ ] | [ ] | [ ] | | |

---

## 📌 残タスク（要手動作業）

> [!IMPORTANT]
> 以下の2点はコードではなくダッシュボード/コンソール上での設定が必要です。必ず実施してください。

### A. GASスクリプトプロパティに `GAS_API_SECRET` を設定
1. [Google Apps Script](https://script.google.com) → このスクリプトを開く
2. 「プロジェクトのプロパティ」→「スクリプトのプロパティ」
3. `GAS_API_SECRET` = 任意の強いランダム文字列（例: `openssl rand -hex 32` で生成）を追加
4. `.env` の `VITE_GAS_API_SECRET=` に同じ値を設定
5. GASを**新バージョンとして再デプロイ**（既存のデプロイIDを更新する）

### B. Supabase RLS ポリシーの適用
1. [Supabase Dashboard](https://app.supabase.com) → このプロジェクト → SQL Editor
2. `supabase_rls_policies.sql` の内容をコピー＆ペーストして実行
3. 実行後、`SET ROLE anon; SELECT * FROM customers;` で0件またはエラーになることを確認
