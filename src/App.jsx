import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Stethoscope, Phone, MapPin, Menu, X, CheckCircle, UserCheck, RefreshCw, ShieldCheck, Sparkles, Calendar, Clock, Settings } from 'lucide-react';
import AuthModal from './components/AuthModal';
import AIChat from './components/AIChat';
import AdminScheduleModal from './components/AdminScheduleModal';

const STEPS = {
  CHAT: 'chat',         // 一体型問診・カレンダー空き枠提案・即確定チャット
  COMPLETE: 'complete', // 予約確定
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [step, setStep] = useState(STEPS.CHAT);
  const [finalReservation, setFinalReservation] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 認証完了時
  const handleAuthenticated = (userData) => {
    setCurrentUser(userData);
    setIsAuthModalOpen(false);
    setStep(STEPS.CHAT);
  };

  // 予約完了時
  const handleReservationComplete = (reservation) => {
    setFinalReservation(reservation);
    setStep(STEPS.COMPLETE);
  };

  // 最初からやり直す
  const reset = () => {
    setStep(STEPS.CHAT);
    setFinalReservation(null);
  };

  // 別の患者でログインし直す
  const handleSwitchPatient = () => {
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-ivory font-sans text-slate-700 border-t-4 border-brand-orange">
      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onAuthenticated={handleAuthenticated}
      />

      {/* Patient Status Bar */}
      <div className="bg-brand-brown text-white/90 text-[11px] py-1.5 px-6 flex justify-between items-center font-serif">
        <div className="flex items-center gap-2">
          <span className="text-brand-gold tracking-widest uppercase text-[10px]">Smart Dental Reception</span>
          <span className="hidden sm:inline opacity-60">|</span>
          <span className="hidden sm:inline opacity-90 text-[10px]">
            Googleカレンダー ＆ Supabase リアルタイム完全連動
          </span>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-brand-orange" />
              <span>{currentUser.name} 様</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  currentUser.isReturning ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {currentUser.isReturning ? '再診' : '新患'}
              </span>
            </span>
            <button
              onClick={handleSwitchPatient}
              className="text-[10px] text-brand-gold hover:text-white underline flex items-center gap-1 cursor-pointer ml-1"
            >
              <RefreshCw size={11} />
              患者切替
            </button>
            <span className="opacity-40">|</span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-[10px] text-white/80 hover:text-brand-orange flex items-center gap-1 cursor-pointer font-bold bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition-colors"
            >
              <Settings size={11} className="text-brand-orange" />
              開院・時間設定
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-brand-orange hover:text-white underline text-[10px] font-bold"
            >
              ログイン / 本人認証
            </button>
            <span className="opacity-40">|</span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-[10px] text-white/80 hover:text-brand-orange flex items-center gap-1 cursor-pointer font-bold bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full transition-colors"
            >
              <Settings size={11} className="text-brand-orange" />
              開院・時間設定
            </button>
          </div>
        )}
      </div>

      {/* 管理者用スケジュール設定モーダル */}
      <AdminScheduleModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onConfigSaved={() => setScheduleVersion((v) => v + 1)}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-brand-gold/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center text-white shadow-md">
            <Stethoscope size={24} />
          </div>
          <div className="flex flex-col -gap-1">
            <span className="text-[10px] text-brand-gold font-serif italic leading-none">
              MAEDA DENTAL CLINIC
            </span>
            <span className="text-xl font-bold font-serif text-brand-brown leading-none">
              前田歯科クリニック
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
          <div className="flex flex-col items-center group cursor-pointer">
            <span className="text-[9px] text-brand-gold font-serif italic opacity-0 group-hover:opacity-100 transition-opacity">
              About us
            </span>
            <a href="#" className="hover:text-brand-orange transition-colors">当院について</a>
          </div>
          <div className="flex flex-col items-center group cursor-pointer">
            <span className="text-[9px] text-brand-gold font-serif italic opacity-0 group-hover:opacity-100 transition-opacity">
              Medical
            </span>
            <a href="#" className="hover:text-brand-orange transition-colors">診療案内</a>
          </div>
          <div className="flex flex-col items-center group cursor-pointer">
            <span className="text-[9px] text-brand-gold font-serif italic opacity-0 group-hover:opacity-100 transition-opacity">
              Access
            </span>
            <a href="#" className="hover:text-brand-orange transition-colors">アクセス</a>
          </div>
          <button className="bg-brand-orange text-white px-8 py-3 rounded-full hover:bg-orange-600 transition-all shadow-lg shadow-brand-orange/20 font-bold">
            お電話はこちら
          </button>
        </div>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Clinic Info & Strengths */}
          <div className="space-y-6 pt-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-orange text-white text-[11px] font-bold rounded-full mb-4 shadow-sm">
                <Sparkles size={14} />
                <span>24時間 スマートAI予約システム</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight text-brand-brown mb-4 font-serif">
                お待たせしない、<br />
                <span className="text-brand-orange">対話と即時確定の</span><br />
                新しい歯科予約体験。
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-md font-serif">
                お困りごとをタップするだけで、Googleカレンダーの空き枠をリアルタイム検索。面倒な入力なしで、約1分で予約が完了します。
              </p>
            </motion.div>

            {/* Strengths Card */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-brand-gold/15 space-y-3">
              <h3 className="text-xs font-bold text-brand-gold uppercase tracking-wider font-serif">
                システムの特長
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-brand-ivory/60 rounded-2xl border border-brand-gold/10">
                  <span className="font-bold text-brand-brown block mb-1 font-serif flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-orange inline-block" />
                    カルテ自動照合
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block">
                    電話番号から過去の通院歴を瞬時に判定。診察券番号を探す手間がありません。
                  </span>
                </div>
                <div className="p-3 bg-brand-ivory/60 rounded-2xl border border-brand-gold/10">
                  <span className="font-bold text-brand-brown block mb-1 font-serif flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-orange inline-block" />
                    カレンダー直結
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block">
                    医院のGoogleカレンダーと完全連動。ダブルブッキングの心配が一切ありません。
                  </span>
                </div>
              </div>
            </div>

            {/* Access & Contact */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xs border border-brand-gold/10">
                <div className="w-10 h-10 bg-brand-ivory text-brand-gold rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-brand-gold font-serif italic uppercase">Access</p>
                  <p className="font-bold text-xs text-brand-brown">前田駅 徒歩1分 / 駐車場完備</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xs border border-brand-gold/10">
                <div className="w-10 h-10 bg-brand-ivory text-brand-orange rounded-full flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-brand-gold font-serif italic uppercase">Contact</p>
                  <p className="font-bold text-sm text-brand-brown">000-000-0000</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Area */}
          <div className="relative">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -z-10" />

            <AnimatePresence mode="wait">
              {/* STEP 1: シームレスAI予約チャット（問診 ＋ カレンダー提案 ＋ 即確定） */}
              {step === STEPS.CHAT && (
                <motion.div
                  key={`chat-${scheduleVersion}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AIChat
                    key={scheduleVersion}
                    patient={currentUser}
                    onReservationComplete={handleReservationComplete}
                  />
                </motion.div>
              )}

              {/* STEP 2: 予約完了画面 */}
              {step === STEPS.COMPLETE && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-brand-gold/15 text-center max-w-xl mx-auto"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 text-white">
                    <CheckCircle size={40} />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-full">
                    Calendar &amp; Database Synced
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-brand-brown mt-3 mb-3 font-serif">
                    ご予約が確定いたしました！
                  </h2>
                  <p className="text-slate-600 mb-6 text-xs md:text-sm leading-relaxed font-serif">
                    {currentUser?.name} 様のご来院をスタッフ一同、心よりお待ちしております。<br />
                    Googleカレンダーへの登録およびカルテの受付が完了しました。
                  </p>

                  <div className="bg-brand-ivory/80 p-5 rounded-2xl text-left border border-brand-gold/15 mb-6 space-y-2 text-xs">
                    <p className="font-bold text-brand-brown font-serif text-sm">予約詳細</p>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">予約日時</span>
                        <span className="font-bold text-brand-orange text-sm">{finalReservation?.scheduled_at}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">診療メニュー</span>
                        <span className="font-bold text-slate-800">{finalReservation?.menu_type}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">患者種別</span>
                        <span className="font-bold text-slate-800">
                          {finalReservation?.patient_type === 'returning' ? '再診（通院歴あり）' : '新患（初診）'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">ご連絡先</span>
                        <span className="font-bold text-slate-800">{finalReservation?.phone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="w-full py-4 bg-brand-orange text-white rounded-2xl font-bold hover:bg-brand-brown transition-all shadow-lg shadow-brand-orange/20 text-sm font-serif"
                  >
                    トップへ戻る（テストをもう一度行う）
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-12 bg-brand-brown text-white/80 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white">
              <Stethoscope size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-brand-gold font-serif italic leading-none">
                MAEDA DENTAL CLINIC
              </span>
              <span className="text-lg font-bold font-serif text-white">前田歯科クリニック</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs">〒000-0000 〇〇県〇〇市〇〇 1-2-3</p>
            <p className="text-xs mt-1 opacity-60">© 2026 Maeda Dental Clinic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
