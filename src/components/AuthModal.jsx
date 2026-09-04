import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Phone, User, ArrowRight, CheckCircle2, MessageCircle, QrCode, ExternalLink, Sparkles } from 'lucide-react';
import { matchPatient } from '../utils/patientService';
import { getFacilityProfile } from '../utils/facilityService';

export default function AuthModal({ isOpen, onAuthenticated }) {
  const [patientType, setPatientType] = useState('new'); // 'new' | 'returning'
  const [authMethod, setAuthMethod] = useState(null); // 'line' | 'apple' | 'google' | 'email' | null
  const [lineOfficialId, setLineOfficialId] = useState('@776cdsuy');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [matchResult, setMatchResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showLineQR, setShowLineQR] = useState(false);

  // 施設情報（line_official_id）取得
  useEffect(() => {
    getFacilityProfile().then((profile) => {
      if (profile?.line_official_id) {
        setLineOfficialId(profile.line_official_id);
      }
    });
  }, []);

  const lineAddFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(lineOfficialId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lineAddFriendUrl)}`;

  // ブラウザ保存の前回情報（再診用）
  useEffect(() => {
    try {
      const saved = localStorage.getItem('last_patient_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.phone) {
          setFormData((prev) => ({
            ...prev,
            name: parsed.name,
            phone: parsed.phone,
            email: parsed.email || '',
          }));
        }
      }
    } catch (e) {}
  }, []);

  // プロバイダ選択時の処理
  const handleSelectProvider = async (provider) => {
    setAuthMethod(provider);

    if (provider === 'line') {
      // LINE: 友だち追加URLを開きつつ、LINE認証ユーザーとして即時ログイン
      window.open(lineAddFriendUrl, '_blank');
      const isRet = patientType === 'returning';
      const patientName = isRet ? (formData.name || '大塚') : 'LINE ゲスト患者';
      const patientPhone = isRet ? (formData.phone || '090-7549-8513') : '090-0000-0000';
      const result = await matchPatient(patientName, patientPhone);

      onAuthenticated({
        name: patientName,
        phone: patientPhone,
        email: 'line-user@line.me',
        authProvider: 'line',
        isReturning: isRet,
        ...result,
      });
    } else if (provider === 'apple') {
      // Apple: 1タップ即時ログイン
      const isRet = patientType === 'returning';
      const patientName = isRet ? (formData.name || '佐藤 健') : '山田 花子';
      const patientPhone = isRet ? (formData.phone || '080-1234-5678') : '090-9999-8888';
      const result = await matchPatient(patientName, patientPhone);

      onAuthenticated({
        name: patientName,
        phone: patientPhone,
        email: isRet ? 'sato.apple@icloud.com' : 'hanako.apple@icloud.com',
        authProvider: 'apple',
        isReturning: isRet,
        ...result,
      });
    } else if (provider === 'google') {
      // Google: 1タップ即時ログイン
      const isRet = patientType === 'returning';
      const patientName = isRet ? (formData.name || '大塚 一樹') : '鈴木 一郎';
      const patientPhone = isRet ? (formData.phone || '090-7549-8513') : '090-4444-5555';
      const result = await matchPatient(patientName, patientPhone);

      onAuthenticated({
        name: patientName,
        phone: patientPhone,
        email: isRet ? 'otsuka@gmail.com' : 'suzuki@gmail.com',
        authProvider: 'google',
        isReturning: isRet,
        ...result,
      });
    } else if (provider === 'email') {
      // メール / 直接入力: 入力フォームを表示
      if (patientType === 'returning' && formData.name && formData.phone) {
        matchPatient(formData.name, formData.phone).then(setMatchResult);
      }
    }
  };

  const handlePhoneOrNameChange = async (field, val) => {
    const nextData = { ...formData, [field]: val };
    setFormData(nextData);

    if (patientType === 'returning' && (nextData.phone.length >= 10 || nextData.name.length >= 2)) {
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
    let result = null;
    if (patientType === 'returning') {
      result = await matchPatient(formData.name, formData.phone);
    }
    setIsVerifying(false);

    try {
      localStorage.setItem('last_patient_info', JSON.stringify({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
      }));
    } catch (e) {}

    onAuthenticated({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || 'user@example.com',
      authProvider: 'email',
      isReturning: patientType === 'returning',
      ...(result || {}),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 md:p-7 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-lg shadow-green-900/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block">
                PATIENT VERIFICATION
              </span>
              <h2 className="text-xl font-bold font-serif">患者認証 &amp; カルテ照合</h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            ご希望のログイン方法をお選びください。アカウント連携でスムーズにご予約いただけます。
          </p>
        </div>

        {/* 患者区分セレクター（新患 / 再診） */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">
            受診区分:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPatientType('new');
                setMatchResult(null);
              }}
              className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                patientType === 'new'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-500'
              }`}
            >
              新患
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientType('returning');
                if (formData.name && formData.phone) {
                  matchPatient(formData.name, formData.phone).then(setMatchResult);
                }
              }}
              className={`px-4 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                patientType === 'returning'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
              }`}
            >
              再診
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          {/* 1. 認証方法を選択（LINE, Apple, Google, メール の4つ） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                ログイン・予約方法を選択
              </label>
              <button
                type="button"
                onClick={() => setShowLineQR(!showLineQR)}
                className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <QrCode size={13} />
                <span>{showLineQR ? 'QRを閉じる' : 'PC用LINE QR'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* LINE */}
              <button
                type="button"
                onClick={() => handleSelectProvider('line')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-[#06C755] bg-white hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
              >
                <MessageCircle size={22} className="text-[#06C755]" />
                <span className="text-slate-800">LINE</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSelectProvider('apple')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-black bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
              >
                <svg className="w-5 h-5 fill-current text-slate-900" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.45c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.7-1.12 1.83-.98 2.94 1.08.08 2.18-.55 2.79-1.28z" />
                </svg>
                <span className="text-slate-800">Apple</span>
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => handleSelectProvider('google')}
                className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer active:scale-95 shadow-2xs"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-slate-800">Google</span>
              </button>

              {/* Email / 手動入力 */}
              <button
                type="button"
                onClick={() => handleSelectProvider('email')}
                className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer active:scale-95 shadow-2xs ${
                  authMethod === 'email'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Mail size={20} className={authMethod === 'email' ? 'text-white' : 'text-slate-600'} />
                <span>メール</span>
              </button>
            </div>

            {/* LINE QRコード表示（PCの場合） */}
            {showLineQR && (
              <div className="text-center py-3 space-y-2 bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100">
                <img
                  src={qrCodeUrl}
                  alt="LINE QR"
                  className="w-32 h-32 mx-auto rounded-xl border border-slate-100 shadow-xs"
                />
                <p className="text-[10px] text-slate-500 font-mono">
                  LINEアプリのカメラで読み取って友だち追加
                </p>
              </div>
            )}
          </div>

          {/* メール（手動入力）を選択した場合のみ入力フォームを展開 */}
          <AnimatePresence>
            {authMethod === 'email' && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="space-y-3.5 pt-2 border-t border-slate-100"
              >
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    お名前 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={17} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="山田 太郎"
                      value={formData.name}
                      onChange={(e) => handlePhoneOrNameChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    電話番号（カルテ照合用） <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone size={17} />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="090-1234-5678"
                      value={formData.phone}
                      onChange={(e) => handlePhoneOrNameChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    メールアドレス（予約確認用）
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={17} />
                    </div>
                    <input
                      type="email"
                      placeholder="example@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* 新患の案内 */}
                {patientType === 'new' && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>初診（新規カルテを発行します）</span>
                  </div>
                )}

                {/* 再診でカルテ照合できた場合のバッジ */}
                {patientType === 'returning' && matchResult?.isReturning && matchResult.customerCode && (
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold block">
                        診察券番号 {matchResult.customerCode} のカルテと照合しました
                      </span>
                      <span className="text-[10px] opacity-80">前回の診療履歴・担当医を引き継いで予約します。</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !formData.name.trim() || !formData.phone.trim()}
                  className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                >
                  <span>問診・予約日時の選択へ進む</span>
                  <ArrowRight size={16} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* 説明テキスト */}
          {!authMethod && (
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              ※LINE/Apple/Googleボタンを押すとアカウント連携でワンタップ予約が可能です。<br />
              アカウント連携を行わない場合は「メール」からお名前・電話番号を入力してください。
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
