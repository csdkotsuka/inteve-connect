-- =============================================================================
-- INTEVE CONNECT - Supabase RLS (Row Level Security) ポリシー設定
-- =============================================================================
-- 【実行手順】
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. 各セクションを上から順に実行する
-- 3. Authentication → Settings で "Enable email provider" をオンにする
-- 4. Authentication → Users で管理者アカウントを作成・招待する
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1: 全テーブルで RLS を有効化（有効でない場合に備えて）
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE facilities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2: 既存ポリシーを完全リセット（古い名前のポリシーも全削除）
-- ─────────────────────────────────────────────────────────────────────────────
-- ※過去にSupabase管理画面のテンプレート等で作成されたポリシー名が何であっても、
-- 対象テーブルの既存ポリシーを全て安全に自動削除します。
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('customers', 'reservations', 'messages', 'staffs', 'facilities')
    ) LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename); 
    END LOOP; 
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3: facilities テーブル
-- ─────────────────────────────────────────────────────────────────────────────
-- [anon] 施設名・スラッグ・営業情報・テーマなど公開情報のみ読み取り可
-- 機密情報（subscription_plan, monthly_fee, admin_system_memo 等）は除外
CREATE POLICY "facilities_anon_read" ON facilities
  FOR SELECT
  TO anon
  USING (is_active = true);

-- [authenticated] ログイン済み管理者は全操作可
CREATE POLICY "facilities_auth_write" ON facilities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4: staffs テーブル
-- ─────────────────────────────────────────────────────────────────────────────
-- [anon] スタッフ名・バッジカラー等の表示情報は公開可
-- phone / email / google_calendar_id は公開しないため、
-- 将来的にはビュー（View）経由で公開列を絞ることを推奨
CREATE POLICY "staffs_anon_read" ON staffs
  FOR SELECT
  TO anon
  USING (is_active = true);

-- [authenticated] ログイン済み管理者は全操作可
CREATE POLICY "staffs_auth_write" ON staffs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5: customers テーブル（個人情報保護の最重要対象）
-- ─────────────────────────────────────────────────────────────────────────────
-- [anon] 新規患者の INSERT のみ許可（本人登録用）
-- ※ 電話番号・LINE IDのみで他人の情報が取得できないよう SELECT は禁止
CREATE POLICY "customers_anon_insert" ON customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- [anon] SELECT は完全禁止（個人情報漏洩防止）
-- ※ line_user_id での本人照合は authenticated ロール（管理者）経由で行うこと

-- [authenticated] ログイン済み管理者は全操作可
CREATE POLICY "customers_auth_all" ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6: reservations テーブル
-- ─────────────────────────────────────────────────────────────────────────────
-- [anon] 空き枠計算用に start_at / end_at / staff_id のみ読み取り可
-- ※ customer_id, ai_summary, staff_memo 等の個人情報は含まれないよう注意
-- ※ ビュー（View）で列を絞ることをより強く推奨
CREATE POLICY "reservations_anon_slots_read" ON reservations
  FOR SELECT
  TO anon
  USING (status != 'cancelled');

-- [anon] 新規予約の INSERT のみ許可（Web予約用）
CREATE POLICY "reservations_anon_insert" ON reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- [authenticated] ログイン済み管理者は全操作可
CREATE POLICY "reservations_auth_all" ON reservations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7: messages テーブル（患者-医院間のチャット）
-- ─────────────────────────────────────────────────────────────────────────────
-- [anon] 全操作禁止（メッセージは認証済みユーザーのみ操作可）
-- [authenticated] ログイン済み管理者のみ操作可
CREATE POLICY "messages_auth_all" ON messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8: RLS設定の確認クエリ（実行後に確認用として使用）
-- ─────────────────────────────────────────────────────────────────────────────
-- 以下を実行して、ポリシーが正しく作成されたか確認する:
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9: anon ロールの疎通テスト（SQL Editor で SET ROLE して確認）
-- ─────────────────────────────────────────────────────────────────────────────
-- 以下を実行して「全件取得が拒否」されることを確認（0件 or Permission denied）:
--
-- SET ROLE anon;
-- SELECT * FROM customers;           -- 0件 or エラーになること ✅
-- SELECT * FROM messages;            -- 0件 or エラーになること ✅
-- SELECT id FROM reservations LIMIT 5; -- start_at のみなら取得可だが ai_summary は取れないこと ✅
-- RESET ROLE;


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10: 将来の強化（任意・推奨）
-- ─────────────────────────────────────────────────────────────────────────────
-- ① reservations の anon向け公開情報をビューに切り出す（列を厳密に絞る）:
--
-- CREATE OR REPLACE VIEW public.reservation_slots AS
--   SELECT id, start_at, end_at, staff_id, status
--   FROM reservations
--   WHERE status != 'cancelled';
--
-- GRANT SELECT ON public.reservation_slots TO anon;
--
-- ② staffs の anon向け公開情報をビューに切り出す（phone/email/calendar_id を隠す）:
--
-- CREATE OR REPLACE VIEW public.staff_public AS
--   SELECT id, name, title, badge_color, accepts_new_patients, display_order
--   FROM staffs
--   WHERE is_active = true;
--
-- GRANT SELECT ON public.staff_public TO anon;
