import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Phone, User, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { matchPatient } from '../utils/patientService';

export default function AuthModal({ isOpen, onAuthenticated }) {
  const [authMethod, setAuthMethod] = useState(null); // 'apple' | 'google' | 'email' | null
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [matchResult, setMatchResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 開発・テスト用クイックログイン
  const handleQuickLogin = async (type) => {
    if (type === 'returning') {
      // 既存患者（Supabase実データ: 大塚様）
      const name = '大塚';
      const phone = '090-7549-8513';
      const email = 'otsuka@example.com';
      const result = await matchPatient(name, phone);
      onAuthenticated({
        name,
        phone,
        email,
        authProvider: 'google',
        ...result,
      });
    } else {
      // 初診（新患）
      const name = '山田 花子';
      const phone = '090-9999-8888';
      const email = 'hanako.yamada@example.com';
      const result = await matchPatient(name, phone);
      onAuthenticated({
        name,
        phone,
        email,
        authProvider: 'apple',
        ...result,
      });
    }
  };

  const handleSelectProvider = (provider) => {
    setAuthMethod(provider);
    if (provider === 'google') {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || '大塚',
        email: prev.email || 'otsuka@gmail.com',
        phone: prev.phone || '090-7549-8513',
      }));
    } else if (provider === 'apple') {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || '山田 花子',
        email: prev.email || 'hanako.apple@icloud.com',
        phone: prev.phone || '090-9999-8888',
      }));
    }
  };

  const handlePhoneOrNameChange = async (field, val) => {
    const nextData = { ...formData, [field]: val };
    setFormData(nextData);
    if (nextData.phone.length >= 10 || nextData.name.length >= 2) {
      const res = await matchPatient(nextData.name, nextData.phone);
      setMatchResult(res);
    } else {
      setMatchResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    setIsVerifying(true);
    const result = await matchPatient(formData.name, formData.phone);
    setIsVerifying(false);
    onAuthenticated({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || `${authMethod || 'user'}@example.com`,
      authProvider: authMethod || 'email',
      ...result,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-brand-gold/20"
      >
        {/* Header */}
        <div className="bg-brand-brown text-white p-6 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center text-white shadow-md">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] text-brand-gold font-serif italic tracking-wider block">
                PATIENT VERIFICATION
              </span>
              <h2 className="text-xl font-bold font-serif">本人認証 &amp; カルテ照合</h2>
            </div>
          </div>
          <p className="text-xs text-white/80 mt-2 font-serif">
            スムーズな予約とカルテ照合のため、認証とお名前・電話番号のご入力をお願いいたします。
          </p>
        </div>

        {/* Quick Test Bar */}
        <div className="bg-brand-ivory px-6 py-3 border-b border-brand-gold/15 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-brand-gold flex items-center gap-1">
            <Sparkles size={14} className="text-brand-orange" />
            動作テスト用クイックログイン:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('new')}
              className="px-2.5 py-1 text-xs rounded-full bg-white border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white transition-all font-bold shadow-xs"
            >
              新患（初診テスト）
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('returning')}
              className="px-2.5 py-1 text-xs rounded-full bg-white border border-brand-brown/30 text-brand-brown hover:bg-brand-brown hover:text-white transition-all font-bold shadow-xs"
            >
              再診（通院歴ありテスト）
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Provider Selection Buttons */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              1. 認証方法を選択
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSelectProvider('apple')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  authMethod === 'apple'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.45c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.7-1.12 1.83-.98 2.94 1.08.08 2.18-.55 2.79-1.28z" />
                </svg>
                <span>Apple</span>
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => handleSelectProvider('google')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  authMethod === 'google'
                    ? 'border-brand-orange bg-brand-orange text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill={authMethod === 'google' ? '#ffffff' : '#4285F4'}
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill={authMethod === 'google' ? '#ffffff' : '#34A853'}
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill={authMethod === 'google' ? '#ffffff' : '#FBBC05'}
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill={authMethod === 'google' ? '#ffffff' : '#EA4335'}
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => handleSelectProvider('email')}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold ${
                  authMethod === 'email'
                    ? 'border-brand-brown bg-brand-brown text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Mail size={20} />
                <span>メール</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                お名前 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="山田 太郎"
                  value={formData.name}
                  onChange={(e) => handlePhoneOrNameChange('name', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-ivory/50 border border-brand-gold/20 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                電話番号（カルテ照合用） <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="090-1234-5678"
                  value={formData.phone}
                  onChange={(e) => handlePhoneOrNameChange('phone', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-brand-ivory/50 border border-brand-gold/20 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 font-medium"
                />
              </div>
            </div>

            {authMethod === 'email' && (
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  メールアドレス
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="taro@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-brand-ivory/50 border border-brand-gold/20 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Match Status Preview */}
            <AnimatePresence>
              {matchResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3.5 rounded-2xl text-xs flex items-center gap-3 border ${
                    matchResult.isReturning
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <CheckCircle2 size={18} className="shrink-0 text-current" />
                  <div>
                    <span className="font-bold block">
                      照合結果: {matchResult.patientTypeLabel}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {matchResult.isReturning
                        ? `カルテ番号: ${matchResult.record.id}（前回来院: ${matchResult.record.last_visit}）`
                        : '当院のご利用は初めてとして登録いたします。'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!formData.name.trim() || !formData.phone.trim() || isVerifying}
              className="w-full mt-2 py-4 bg-brand-orange text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-brown transition-all shadow-lg shadow-brand-orange/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>照合中...</span>
                </>
              ) : (
                <>
                  <span>予約に進む（問診チャットへ）</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
