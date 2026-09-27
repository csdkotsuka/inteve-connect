import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

/**
 * AdminAuthGuard
 * 管理者画面（施設管理 / スーパー管理者）へのアクセスを Supabase Auth で保護するガードコンポーネント。
 * ログイン済みユーザーのみ children を表示し、未認証の場合はログインフォームを表示する。
 *
 * 【Supabase側の設定】
 * - Authentication → Settings → "Enable email provider" をオン
 * - Authentication → Users で管理者のメールアドレスを手動招待/作成する
 * - RLSポリシーで authenticated ロールに管理者用権限を付与する
 *
 * @param {React.ReactNode} children - 認証後に表示するダッシュボード
 * @param {string} [adminRole] - 'super_admin' | 'facility_admin'（ラベル表示用）
 */
export default function AdminAuthGuard({ children, adminRole = 'facility_admin' }) {
  const [session, setSession]       = useState(undefined); // undefined = 初期化中
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');

  const isSuperAdmin = adminRole === 'super_admin';
  const roleLabel    = isSuperAdmin ? 'スーパー管理者' : '施設管理者';

  // --- セッション初期化 & 変更監視 ---
  useEffect(() => {
    if (!supabase) {
      // Supabase未設定の場合は開発モードとして通過（警告を出す）
      console.warn('[AdminAuthGuard] Supabase未接続のため認証をスキップします（開発モード）');
      setSession({ user: { email: 'dev-mode@localhost', role: 'dev' }, isDev: true });
      return;
    }

    // 現在のセッションを確認
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    // セッション変化を監視（ログイン・ログアウト・トークン更新）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- ログイン処理 ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setIsLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setErrorMsg(
        error.message.includes('Invalid login credentials')
          ? 'メールアドレスまたはパスワードが正しくありません。'
          : error.message
      );
    }
    setIsLoading(false);
  };

  // --- ログアウト処理 ---
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  // --- 初期化中（セッション確認前）---
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // --- 認証済み → ダッシュボードを表示（ログアウトボタン付き）---
  if (session) {
    return (
      <div className="relative">
        {/* ログアウトバー */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-emerald-300">
              {session.isDev ? '⚠ 開発モード（認証スキップ）' : session.user?.email}
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">
              {roleLabel}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium"
          >
            ログアウト
          </button>
        </div>
        {/* ダッシュボード本体（ログアウトバーの高さ分だけパディング） */}
        <div className="pt-9">
          {children}
        </div>
      </div>
    );
  }

  // --- 未認証 → ログインフォームを表示 ---
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* カードヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-800 shadow-lg shadow-indigo-900/40 mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">
            {roleLabel}ログイン
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            このページは管理者専用です
          </p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* メールアドレス */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* エラーメッセージ */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950/60 border border-red-900 text-red-300 text-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-lg shadow-indigo-900/40"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isLoading ? '認証中...' : 'ログイン'}
          </button>
        </form>

        {/* フッター注記 */}
        <p className="text-center text-slate-600 text-xs mt-6">
          パスワードを忘れた場合はシステム管理者にお問い合わせください
        </p>
      </motion.div>
    </div>
  );
}
