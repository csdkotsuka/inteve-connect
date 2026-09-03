import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, MapPin, Menu, X, CheckCircle, UserCheck, RefreshCw, Sparkles, Calendar, Clock, Settings, HeartHandshake, Shield, Sparkle } from 'lucide-react';
import AuthModal from './components/AuthModal';
import AIChat from './components/AIChat';
import AdminScheduleModal from './components/AdminScheduleModal';

const STEPS = {
  CHAT: 'chat',         // 一体型問診・カレンダー空き枠提案・即確定チャット
  COMPLETE: 'complete', // 予約確定
};

// 歯科医院らしい清潔でエレガントな歯のエムブレムロゴ
function DentalToothLogo({ className = "w-6 h-6 text-white" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3C4.23858 3 2 5.23858 2 8C2 12 4 16 7 21C7.8 19 8.5 15.5 9 13C9.5 10.5 10 9 12 9C14 9 14.5 10.5 15 13C15.5 15.5 16.2 19 17 21C20 16 22 12 22 8C22 5.23858 19.7614 3 17 3C15 3 13.5 4 12 5C10.5 4 9 3 7 3Z" />
    </svg>
  );
}

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

      {/* Patient Status Bar（高さを1.5倍、文字サイズを拡大） */}
      <div className="bg-brand-brown text-white/95 text-xs md:text-sm py-3 px-6 md:px-10 flex justify-between items-center font-serif shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-brand-gold tracking-wider font-bold text-xs uppercase flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-orange" />
            24時間 WEB受付システム
          </span>
          <span className="hidden md:inline opacity-40">|</span>
          <span className="hidden md:inline opacity-90 text-xs text-brand-ivory/80">
            まつやま城山歯科クリニック オンライン予約
          </span>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm font-medium">
              <UserCheck size={16} className="text-brand-orange" />
              <span className="font-bold text-white text-sm md:text-base">{currentUser.name} 様</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentUser.isReturning ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {currentUser.isReturning ? '再診' : '新患'}
              </span>
            </span>
            <button
              onClick={handleSwitchPatient}
              className="text-xs text-brand-gold hover:text-white underline flex items-center gap-1 cursor-pointer font-medium transition-colors"
            >
              <RefreshCw size={13} />
              患者切替
            </button>
            <span className="opacity-30">|</span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-xs text-white/90 hover:text-brand-orange flex items-center gap-1.5 cursor-pointer font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all border border-white/10"
            >
              <Settings size={13} className="text-brand-orange" />
              開院・時間設定
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-brand-orange hover:text-white underline text-xs font-bold"
            >
              ログイン / 本人認証
            </button>
            <span className="opacity-30">|</span>
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="text-xs text-white/90 hover:text-brand-orange flex items-center gap-1.5 cursor-pointer font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all border border-white/10"
            >
              <Settings size={13} className="text-brand-orange" />
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
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-brand-gold/10 px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
          <div className="w-11 h-11 bg-gradient-to-br from-brand-orange to-[#e08500] rounded-2xl flex items-center justify-center text-white shadow-md shadow-brand-orange/20">
            <DentalToothLogo className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col -gap-0.5">
            <span className="text-[10px] text-brand-gold font-serif italic leading-none tracking-widest">
              MATSUYAMA JOYAMA DENTAL CLINIC
            </span>
            <span className="text-xl md:text-2xl font-bold font-serif text-brand-brown leading-none mt-1">
              まつやま城山歯科クリニック
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
          <a
            href="tel:089-000-0000"
            className="bg-brand-orange text-white px-7 py-2.5 rounded-full hover:bg-orange-600 transition-all shadow-lg shadow-brand-orange/20 font-bold flex items-center gap-2 text-xs"
          >
            <Phone size={15} />
            <span>089-000-0000</span>
          </a>
        </div>

        <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Clinic Real Introduction & Guidance */}
          <div className="space-y-6 pt-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 text-xs font-bold rounded-full mb-4 shadow-2xs font-serif">
                <HeartHandshake size={15} />
                <span>生涯に寄り添う、やさしい歯科医療</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight text-brand-brown mb-4 font-serif">
                笑顔あふれる毎日を、<br />
                <span className="text-brand-orange">健康なお口から。</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-lg font-serif">
                まつやま城山歯科クリニックでは、患者様のお悩みやご希望に寄り添い、痛みの少ない丁寧な診療を心がけております。WEBより24時間いつでも簡単にご予約いただけます。
              </p>
            </motion.div>

            {/* Clinic Guidance Cards (実運用向けの案内) */}
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-2xl border border-brand-gold/15 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-ivory text-brand-gold flex items-center justify-center shrink-0 mt-0.5 border border-brand-gold/20">
                  <DentalToothLogo className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-brand-brown font-serif mb-1">
                    初めてご来院される患者様へ
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    健康保険証（またはマイナンバーカード）をご持参の上、ご予約日時の5分前にお越しください。事前のWEB問診により、当日はスムーズにご案内いたします。
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-brand-gold/15 shadow-xs flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-ivory text-brand-gold flex items-center justify-center shrink-0 mt-0.5 border border-brand-gold/20">
                  <Sparkles size={20} className="text-brand-gold" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-brand-brown font-serif mb-1">
                    定期検診・予防クリーニング
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    虫歯や歯周病の早期発見とプロによる歯石除去・着色汚れ落としで、いつまでも健やかで美しい歯を守るサポートをいたします。
                  </p>
                </div>
              </div>
            </div>

            {/* Access & Contact */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xs border border-brand-gold/10">
                <div className="w-10 h-10 bg-brand-ivory text-brand-gold rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-brand-gold font-serif italic uppercase">Access</p>
                  <p className="font-bold text-xs text-brand-brown">松山市駅 徒歩1分 / 提携駐車場完備</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-xs border border-brand-gold/10">
                <div className="w-10 h-10 bg-brand-ivory text-brand-orange rounded-full flex items-center justify-center shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-brand-gold font-serif italic uppercase">Contact</p>
                  <p className="font-bold text-sm text-brand-brown">089-000-0000</p>
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
                  <span className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-full font-serif">
                    Reservation Confirmed
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-brand-brown mt-3 mb-3 font-serif">
                    ご予約が確定いたしました！
                  </h2>
                  <p className="text-slate-600 mb-6 text-xs md:text-sm leading-relaxed font-serif">
                    {currentUser?.name} 様のご来院をスタッフ一同、心よりお待ちしております。<br />
                    ご予約内容の確認とお控えをご確認ください。
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
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
              <DentalToothLogo className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-brand-gold font-serif italic leading-none">
                MATSUYAMA JOYAMA DENTAL CLINIC
              </span>
              <span className="text-lg font-bold font-serif text-white">まつやま城山歯科クリニック</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs">〒790-0000 愛媛県松山市〇〇 1-2-3</p>
            <p className="text-xs mt-1 opacity-60">© 2026 Matsuyama Joyama Dental Clinic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
