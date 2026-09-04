import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, MapPin, Menu, X, CheckCircle, UserCheck, RefreshCw, Sparkles, Calendar, Clock, Settings, HeartHandshake, Megaphone, ShieldCheck } from 'lucide-react';
import AuthModal from './components/AuthModal';
import AIChat from './components/AIChat';
import AdminScheduleModal from './components/AdminScheduleModal';
import FacilityAdminDashboard from './components/FacilityAdmin/FacilityAdminDashboard';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import { getThemeById, getCurrentTheme, applyTheme } from './utils/themeService';
import { getFacilityProfile } from './utils/facilityService';

const STEPS = {
  CHAT: 'chat',         // 一体型問診・カレンダー空き枠提案・即確定チャット
  COMPLETE: 'complete', // 予約確定
};

const VIEW_MODES = {
  BOOKING: 'booking',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
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
  const getViewModeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;

      if (pathname === '/super-admin' || hash === '#super-admin' || search.includes('mode=super-admin')) {
        return VIEW_MODES.SUPER_ADMIN;
      }
      if (pathname === '/admin' || hash === '#admin' || search.includes('mode=admin')) {
        return VIEW_MODES.ADMIN;
      }
    }
    return VIEW_MODES.BOOKING;
  };

  const [viewMode, setViewModeState] = useState(getViewModeFromUrl);

  const setViewMode = (mode) => {
    setViewModeState(mode);
    try {
      if (mode === VIEW_MODES.SUPER_ADMIN) {
        window.history.pushState(null, '', '/super-admin');
      } else if (mode === VIEW_MODES.ADMIN) {
        window.history.pushState(null, '', '/admin');
      } else {
        window.history.pushState(null, '', '/');
      }
    } catch (e) {}
  };

  // ブラウザの戻る・進むボタンやURL直接変更に対応
  useEffect(() => {
    const handlePopState = () => {
      setViewModeState(getViewModeFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);


  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [step, setStep] = useState(STEPS.CHAT);
  const [finalReservation, setFinalReservation] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [facilityProfile, setFacilityProfile] = useState(null);
  const [activeTheme, setActiveTheme] = useState(getCurrentTheme());

  // 初期化時にSupabase施設情報からテーマと施設情報を取得
  useEffect(() => {
    getFacilityProfile().then((data) => {
      setFacilityProfile(data);
      const themePresetId = data.theme_colors?.preset_id || data.theme_id || 'terracotta';
      const theme = getThemeById(themePresetId);
      setActiveTheme(theme);
      applyTheme(theme);
    });
  }, [viewMode]);

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

  if (viewMode === VIEW_MODES.SUPER_ADMIN) {
    return (
      <SuperAdminDashboard
        onSwitchView={(mode) =>
          setViewMode(mode === 'admin' ? VIEW_MODES.ADMIN : VIEW_MODES.BOOKING)
        }
      />
    );
  }

  if (viewMode === VIEW_MODES.ADMIN) {
    return <FacilityAdminDashboard onBackToBooking={() => setViewMode(VIEW_MODES.BOOKING)} />;
  }

  const facilityName = facilityProfile?.name || 'つばき歯科クリニック';
  const facilityPhone = facilityProfile?.phone || '089-000-0000';

  return (
    <div
      className="min-h-screen font-sans text-slate-700 border-t-4"
      style={{
        backgroundColor: activeTheme.background || '#FAF7EF',
        borderTopColor: activeTheme.primary,
      }}
    >
      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onAuthenticated={handleAuthenticated}
      />

      {/* Patient Status Bar */}
      <div
        className="text-white/95 text-xs md:text-sm py-2.5 px-6 md:px-10 flex justify-between items-center font-serif shadow-xs"
        style={{ backgroundColor: activeTheme.secondary }}
      >
        <div className="flex items-center gap-3">
          <span
            className="tracking-wider font-bold text-xs uppercase flex items-center gap-1.5"
            style={{ color: activeTheme.accent }}
          >
            <Sparkles size={14} style={{ color: activeTheme.primary }} />
            24時間 WEB受付システム
          </span>
          <span className="hidden md:inline opacity-40">|</span>
          <span className="hidden md:inline opacity-90 text-xs text-white/80">
            {facilityName} オンライン予約
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {currentUser && (
            <div className="flex items-center gap-2">
              <UserCheck size={16} style={{ color: activeTheme.primary }} />
              <span className="font-bold text-white text-xs md:text-sm">{currentUser.name} 様</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentUser.isReturning ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {currentUser.isReturning ? '再診' : '新患'}
              </span>
              <button
                onClick={handleSwitchPatient}
                className="text-[11px] underline flex items-center gap-0.5 cursor-pointer opacity-80 hover:opacity-100 ml-1"
                style={{ color: activeTheme.accent }}
              >
                <RefreshCw size={11} />
                切替
              </button>
            </div>
          )}

          <span className="opacity-30 hidden sm:inline">|</span>

          {/* 施設管理者画面への切り替えボタン */}
          <button
            onClick={() => setViewMode(VIEW_MODES.ADMIN)}
            className="text-xs text-white font-bold flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-full transition-all border border-white/20 hover:bg-white/20 shadow-xs"
            style={{ backgroundColor: `${activeTheme.primary}40` }}
            title="施設管理画面（テーマカラー・お知らせ・スケジュール設定）を開く"
          >
            <ShieldCheck size={14} style={{ color: activeTheme.accent }} />
            <span>施設管理画面</span>
          </button>
        </div>
      </div>

      {/* トップお知らせ告知バナー（施設管理で設定された文面） */}
      {facilityProfile?.top_announcement && (
        <div
          className="py-2.5 px-6 md:px-10 border-b text-xs flex items-center justify-between gap-3 shadow-2xs"
          style={{
            backgroundColor: activeTheme.primaryLight,
            borderColor: `${activeTheme.primary}30`,
            color: activeTheme.secondary,
          }}
        >
          <div className="max-w-6xl mx-auto w-full flex items-center gap-2.5">
            <Megaphone size={16} className="shrink-0" style={{ color: activeTheme.primary }} />
            <p className="font-medium leading-relaxed truncate">
              {facilityProfile.top_announcement}
            </p>
          </div>
        </div>
      )}

      {/* 管理者用スケジュール設定モーダル（旧モーダル） */}
      <AdminScheduleModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onConfigSaved={() => setScheduleVersion((v) => v + 1)}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={reset}>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: activeTheme.primary }}
          >
            <DentalToothLogo className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col -gap-0.5">
            <span
              className="text-[9px] font-serif italic leading-none tracking-widest uppercase font-bold"
              style={{ color: activeTheme.accent }}
            >
              {facilityProfile?.slug ? facilityProfile.slug.replace('-', ' ') : 'FACILITY RESERVATION'}
            </span>
            <span
              className="text-lg md:text-xl font-bold font-serif leading-none mt-1"
              style={{ color: activeTheme.secondary }}
            >
              {facilityName}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <a
            href={`tel:${facilityPhone}`}
            className="text-white px-5 py-2 rounded-full transition-all shadow-md font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: activeTheme.primary }}
          >
            <Phone size={14} />
            <span>{facilityPhone}</span>
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
                つばき歯科クリニックでは、患者様のお悩みやご希望に寄り添い、痛みの少ない丁寧な診療を心がけております。WEBより24時間いつでも簡単にご予約いただけます。
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
                  <p className="font-bold text-xs text-brand-brown">椿神社前 徒歩1分 / 駐車場完備</p>
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
      <footer
        className="mt-16 py-12 text-white/80 px-6 relative overflow-hidden"
        style={{ backgroundColor: activeTheme.secondary }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: `${activeTheme.primary}40` }}
            >
              <DentalToothLogo className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span
                className="text-[10px] font-serif italic leading-none uppercase font-bold"
                style={{ color: activeTheme.accent }}
              >
                {facilityProfile?.slug ? facilityProfile.slug.replace('-', ' ') : 'ONLINE RESERVATION'}
              </span>
              <span className="text-lg font-bold font-serif text-white">{facilityName}</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs">
              {facilityProfile?.address_line1
                ? `〒${facilityProfile.postal_code || ''} ${facilityProfile.prefecture || ''}${facilityProfile.address_line1} ${facilityProfile.address_line2 || ''}`
                : '〒790-0000 愛媛県松山市居相 1-2-3'}
            </p>
            <p className="text-xs mt-1 opacity-60">© 2026 {facilityName}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
