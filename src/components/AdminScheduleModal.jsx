import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Lock, CheckCircle2, Save, Clock, Calendar, AlertCircle } from 'lucide-react';
import { getClinicScheduleConfig, saveClinicScheduleConfig } from '../utils/clinicSchedule';

const DAYS_OF_WEEK = [
  { day: 0, label: '日' },
  { day: 1, label: '月' },
  { day: 2, label: '火' },
  { day: 3, label: '水' },
  { day: 4, label: '木' },
  { day: 5, label: '金' },
  { day: 6, label: '土' },
];

export default function AdminScheduleModal({ isOpen, onClose, onConfigSaved }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [config, setConfig] = useState(getClinicScheduleConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getClinicScheduleConfig());
      setSavedSuccess(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleLogin = (e) => {
    e.preventDefault();
    // 簡易管理者パスワード（初期値: admin または 1234）
    if (password === 'admin' || password === '1234' || password === '') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('パスワードが正しくありません（初期パスワード: admin）');
    }
  };

  const toggleClosedDay = (dayNum) => {
    setConfig((prev) => {
      const exists = prev.closedDays.includes(dayNum);
      const nextClosedDays = exists
        ? prev.closedDays.filter((d) => d !== dayNum)
        : [...prev.closedDays, dayNum];
      return { ...prev, closedDays: nextClosedDays };
    });
  };

  const handleSave = () => {
    saveClinicScheduleConfig(config);
    setSavedSuccess(true);
    if (onConfigSaved) onConfigSaved(config);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-brand-gold/20"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-brown to-[#563e26] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-md">
              <Settings size={22} />
            </div>
            <div>
              <span className="text-[10px] text-brand-gold font-serif italic tracking-wider block">
                ADMINISTRATION CONSOLE
              </span>
              <h2 className="text-xl font-bold font-serif">医院スケジュール・開院設定</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auth Gate or Settings Form */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
                <Lock size={28} />
              </div>
              <h3 className="font-serif font-bold text-lg text-slate-800">管理者パスワードを入力</h3>
              <p className="text-xs text-slate-500 font-serif">
                医院の開院曜日や診療時間を変更するには認証が必要です。
              </p>
            </div>

            <div className="space-y-2 max-w-xs mx-auto">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード（初期値: admin）"
                className="w-full px-4 py-3 bg-brand-ivory/50 border border-brand-gold/20 rounded-2xl text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
              />
              {errorMsg && <p className="text-xs text-rose-500 text-center">{errorMsg}</p>}
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-brand-orange text-white rounded-2xl font-bold hover:bg-brand-brown transition-all shadow-lg shadow-brand-orange/20 text-sm font-serif"
              >
                ログインして設定を開く
              </button>
              <button
                type="button"
                onClick={() => setIsAuthenticated(true)}
                className="w-full py-2 text-[11px] text-slate-400 hover:text-slate-600 underline text-center block"
              >
                （開発用）ワンクリックで開く
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* 1. 休診曜日の設定 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <Calendar size={16} className="text-brand-orange" />
                1. 診療曜日・休診日の設定（赤色が休診日）
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const isClosed = config.closedDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleClosedDay(d.day)}
                      className={`py-3 rounded-2xl flex flex-col items-center justify-center font-bold text-xs transition-all border ${
                        isClosed
                          ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-inner'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs hover:border-emerald-500'
                      }`}
                    >
                      <span className="text-sm font-serif">{d.label}</span>
                      <span className="text-[9px] mt-0.5 font-mono">
                        {isClosed ? '休診' : '診療'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                ※タップして「休診」に切り替えた曜日は、予約カレンダーの候補枠から完全に除外されます。
              </p>
            </div>

            {/* 2. 診療時間帯の設定 */}
            <div className="space-y-3 border-t border-brand-gold/15 pt-5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <Clock size={16} className="text-brand-orange" />
                2. 診療時間帯の設定（昼休みは自動除外）
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 午前 */}
                <div className="bg-brand-ivory/60 p-4 rounded-2xl border border-brand-gold/15 space-y-2">
                  <span className="text-xs font-bold text-brand-brown block font-serif">
                    午前診療
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={config.morningStart}
                      onChange={(e) => setConfig({ ...config, morningStart: e.target.value })}
                      className="px-3 py-2 bg-white border border-brand-gold/20 rounded-xl font-mono text-center"
                    />
                    <span className="text-slate-400">〜</span>
                    <input
                      type="time"
                      value={config.morningEnd}
                      onChange={(e) => setConfig({ ...config, morningEnd: e.target.value })}
                      className="px-3 py-2 bg-white border border-brand-gold/20 rounded-xl font-mono text-center"
                    />
                  </div>
                </div>

                {/* 午後 */}
                <div className="bg-brand-ivory/60 p-4 rounded-2xl border border-brand-gold/15 space-y-2">
                  <span className="text-xs font-bold text-brand-brown block font-serif">
                    午後診療（平日）
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="time"
                      value={config.afternoonStart}
                      onChange={(e) => setConfig({ ...config, afternoonStart: e.target.value })}
                      className="px-3 py-2 bg-white border border-brand-gold/20 rounded-xl font-mono text-center"
                    />
                    <span className="text-slate-400">〜</span>
                    <input
                      type="time"
                      value={config.afternoonEnd}
                      onChange={(e) => setConfig({ ...config, afternoonEnd: e.target.value })}
                      className="px-3 py-2 bg-white border border-brand-gold/20 rounded-xl font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* 土曜午後 */}
              <div className="bg-brand-ivory/40 p-3 rounded-xl border border-brand-gold/10 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 font-serif">土曜日の午後終了時間</span>
                <input
                  type="time"
                  value={config.saturdayAfternoonEnd}
                  onChange={(e) => setConfig({ ...config, saturdayAfternoonEnd: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-brand-gold/20 rounded-xl font-mono text-center"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-brand-gold/15">
              <button
                type="button"
                onClick={handleSave}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm font-serif ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-brand-orange text-white hover:bg-brand-brown shadow-brand-orange/20'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>設定を保存しました！</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>変更を保存して予約システムに即時反映</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
