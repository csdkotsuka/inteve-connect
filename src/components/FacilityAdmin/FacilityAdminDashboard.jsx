import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Megaphone,
  Clock,
  ListOrdered,
  Users,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  X,
  Calendar,
  Layers,
  MessageCircle,
  UserRound,
  ArrowRight,
} from 'lucide-react';

import { getThemeById, getCurrentTheme, applyTheme } from '../../utils/themeService';
import {
  getFacilityProfile,
  saveFacilityProfile,
  getFacilityServices,
  saveFacilityServices,
  getFacilityStaffs,
  saveFacilityStaffs,
  saveSingleStaff,
  deleteSingleStaff,
} from '../../utils/facilityService';
import { getClinicScheduleConfig, saveClinicScheduleConfig } from '../../utils/clinicSchedule';
import ReservationLedger from './ReservationLedger';
import PatientList from './PatientList';
import MessagingPanel from './MessagingPanel';


const DAYS_OF_WEEK = [
  { day: 0, label: '日' },
  { day: 1, label: '月' },
  { day: 2, label: '火' },
  { day: 3, label: '水' },
  { day: 4, label: '木' },
  { day: 5, label: '金' },
  { day: 6, label: '土' },
];

const TIME_OPTIONS_10MIN = [];
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 10) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    TIME_OPTIONS_10MIN.push(`${hh}:${mm}`);
  }
}

export default function FacilityAdminDashboard({ onBackToBooking }) {
  // デフォルトタブを「予約台帳（reservations）」に設定
  const [activeTab, setActiveTab] = useState('reservations');
  const [selectedTheme, setSelectedTheme] = useState(getCurrentTheme());
  const [facilityProfile, setFacilityProfile] = useState(null);
  const [scheduleConfig, setScheduleConfig] = useState(getClinicScheduleConfig());
  const [services, setServices] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [saveStatus, setSaveStatus] = useState({ show: false, message: '' });

  // 独自休診日用State
  const [newSpecialDate, setNewSpecialDate] = useState('');
  const [newSpecialName, setNewSpecialName] = useState('');

  // モーダル用State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // 初期ロード
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const profile = await getFacilityProfile();
    const srvs = await getFacilityServices();
    const stfs = await getFacilityStaffs();
    setFacilityProfile(profile);
    setServices(srvs);
    setStaffs(stfs);
    const theme = getThemeById(profile?.theme_colors?.preset_id || profile?.theme_id || 'terracotta');
    setSelectedTheme(theme);
    applyTheme(theme);
  };

  const showToast = (message) => {
    setSaveStatus({ show: true, message });
    setTimeout(() => {
      setSaveStatus({ show: false, message: '' });
    }, 2500);
  };

  // 1. お知らせ保存
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    await saveFacilityProfile(facilityProfile);
    showToast('トップお知らせを更新しました');
  };

  // 2. スケジュール保存
  const handleSaveSchedule = () => {
    saveClinicScheduleConfig(scheduleConfig);
    showToast('診療スケジュール・休診日設定を保存しました');
  };

  const toggleClosedDay = (dayNum) => {
    setScheduleConfig((prev) => {
      const exists = prev.closedDays.includes(dayNum);
      const nextClosedDays = exists
        ? prev.closedDays.filter((d) => d !== dayNum)
        : [...prev.closedDays, dayNum];
      return { ...prev, closedDays: nextClosedDays };
    });
  };

  // 3. サービスメニュー管理
  const handleSaveService = (serviceData) => {
    let updated;
    if (serviceData.id) {
      updated = services.map((s) => (s.id === serviceData.id ? serviceData : s));
    } else {
      updated = [...services, { ...serviceData, id: `srv-${Date.now()}` }];
    }
    setServices(updated);
    saveFacilityServices(updated);
    setIsServiceModalOpen(false);
    setEditingService(null);
    showToast('診療・サービスメニューを保存しました');
  };

  const handleDeleteService = (id) => {
    if (window.confirm('このメニューを削除してもよろしいですか？')) {
      const updated = services.filter((s) => s.id !== id);
      setServices(updated);
      saveFacilityServices(updated);
      showToast('メニューを削除しました');
    }
  };

  // 4. スタッフ・Googleカレンダー連携管理
  const handleSaveStaff = async (staffData) => {
    await saveSingleStaff(staffData);
    const refreshed = await getFacilityStaffs();
    setStaffs(refreshed);
    setIsStaffModalOpen(false);
    setEditingStaff(null);
    showToast('スタッフ・カレンダー設定をSupabaseに保存しました');
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm('このスタッフを削除してもよろしいですか？')) {
      await deleteSingleStaff(id);
      const refreshed = await getFacilityStaffs();
      setStaffs(refreshed);
      showToast('スタッフを削除しました');
    }
  };

  if (!facilityProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      {/* トースト通知 */}
      <AnimatePresence>
        {saveStatus.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-medium text-sm border border-emerald-500"
          >
            <CheckCircle2 size={18} />
            <span>{saveStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 左側サイドバー（施設専用メニュー） */}
      <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shadow-xs shrink-0">
        {/* ヘッダーブランド */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: selectedTheme.primary }}
              />
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                Facility Admin
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-800 mt-1.5 truncate font-serif">
              {facilityProfile.name}
            </h1>
          </div>
        </div>

        {/* 施設専用ナビゲーション（文字サイズ1.5倍・ゆったり間隔） */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {[
            { id: 'reservations', label: '予約台帳・カレンダー', icon: CalendarDays },
            { id: 'patients', label: '患者情報一覧', icon: UserRound },
            { id: 'messages', label: 'メッセージ・連絡', icon: MessageCircle },
            { id: 'announcement', label: 'トップお知らせ告知', icon: Megaphone },
            { id: 'schedule', label: '診療時間・休診日設定', icon: Clock },
            { id: 'services', label: 'メニュー・診療科目', icon: ListOrdered },
            { id: 'staffs', label: 'スタッフ・カレンダー設定', icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'text-white shadow-md shadow-slate-300/40'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                style={isActive ? { backgroundColor: selectedTheme.primary } : {}}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 予約画面プレビューへ戻るボタン */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onBackToBooking}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>患者用予約画面へ</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </aside>

      {/* メインコンテンツエリア */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: 予約台帳・カレンダー統合ビュー (Reservation Ledger) */}
          {/* ========================================================================= */}
          {activeTab === 'reservations' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">
                  予約台帳・タイムライン管理
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  縦軸に時間、横軸にスタッフを配置した日別タイムライン、週間空き状況、月間ナビゲーションで予約を直感的に管理できます。
                </p>
              </div>

              {/* 予約台帳コンポーネント */}
              <ReservationLedger
                facilityId={facilityProfile?.id}
                staffs={staffs}
                scheduleConfig={scheduleConfig}
                theme={selectedTheme}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 患者情報一覧 */}
          {/* ========================================================================= */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <PatientList
                facilityId={facilityProfile?.id}
                staffs={staffs}
                theme={selectedTheme}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: メッセージ・患者連絡 */}
          {/* ========================================================================= */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <MessagingPanel
                facilityId={facilityProfile?.id}
                theme={selectedTheme}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: トップお知らせ告知 (Announcements) */}
          {/* ========================================================================= */}
          {activeTab === 'announcement' && (

            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">
                  トップお知らせ告知の管理
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  WEB予約画面のトップやヘッダー下に表示するお知らせ文面を自由に編集できます。休診告知やキャンペーン案内にご利用ください。
                </p>
              </div>

              <form onSubmit={handleSaveAnnouncement} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">お知らせ文面</label>
                  <textarea
                    rows={4}
                    value={facilityProfile.top_announcement || ''}
                    onChange={(e) =>
                      setFacilityProfile({ ...facilityProfile, top_announcement: e.target.value })
                    }
                    placeholder="例: 【お知らせ】土曜日の診療時間を変更いたしました。WEB予約は24時間受け付けております。"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    ※空欄にすると、予約画面のトップお知らせ枠は非表示になります。
                  </p>
                </div>

                {/* プレビュー枠 */}
                {facilityProfile.top_announcement && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      予約受付画面での表示イメージ:
                    </span>
                    <div
                      className="p-3.5 rounded-xl text-xs flex items-start gap-2 border"
                      style={{
                        backgroundColor: selectedTheme.primaryLight,
                        borderColor: `${selectedTheme.primary}40`,
                        color: selectedTheme.secondary,
                      }}
                    >
                      <Megaphone size={16} className="shrink-0 mt-0.5" style={{ color: selectedTheme.primary }} />
                      <span className="leading-relaxed font-medium">{facilityProfile.top_announcement}</span>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: selectedTheme.primary }}
                  >
                    <Save size={15} />
                    お知らせを保存・即時反映
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 診療時間・休診日設定 (Schedule) */}
          {/* ========================================================================= */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">
                  診療時間・休診日・予約枠間隔
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  定期休診曜日、祝祭日設定、医院独自の特別休診日（夏季・年末年始等）、受付時間帯、予約スロット間隔を設定します。
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                {/* 1. 曜日別休診設定 */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" />
                    休診曜日の設定（赤色が休診）
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const isClosed = scheduleConfig.closedDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => toggleClosedDay(d.day)}
                          className={`py-3 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all border cursor-pointer ${
                            isClosed
                              ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-inner'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs hover:border-emerald-500'
                          }`}
                        >
                          <span className="text-sm font-bold">{d.label}</span>
                          <span className="text-[10px] mt-0.5">{isClosed ? '休診' : '診療'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. 祝祭日休診設定 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 block">日本の祝祭日を休診にする</span>
                    <span className="text-[11px] text-slate-500">祝祭日・振替休日を自動検知し、カレンダー上で薄赤色で休診表示します</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleConfig.isHolidayClosed !== false}
                      onChange={(e) =>
                        setScheduleConfig({ ...scheduleConfig, isHolidayClosed: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* 3. 医院独自の休診日（夏季休暇・年末年始・研修日など） */}
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">医院独自の休診日（夏季休暇・年末年始・院内研修日など）</label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      指定した日付をカレンダー上で薄赤色で強調し、休診理由を表示します。
                    </p>
                  </div>

                  {/* 休診日追加フォーム */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={newSpecialDate}
                      onChange={(e) => setNewSpecialDate(e.target.value)}
                      className="px-3.5 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="休診名（例: 夏季休暇・年末年始休診・院内研修）"
                      value={newSpecialName}
                      onChange={(e) => setNewSpecialName(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSpecialDate) return;
                        const newSpecial = {
                          date: newSpecialDate,
                          name: newSpecialName.trim() || '特別休診日',
                        };
                        const updated = [
                          ...(scheduleConfig.specialClosedDays || []).filter((s) => s.date !== newSpecialDate),
                          newSpecial,
                        ].sort((a, b) => a.date.localeCompare(b.date));
                        setScheduleConfig({ ...scheduleConfig, specialClosedDays: updated });
                        setNewSpecialDate('');
                        setNewSpecialName('');
                      }}
                      disabled={!newSpecialDate}
                      className="px-4 py-2.5 h-11 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={15} />
                      <span>休診日を追加</span>
                    </button>
                  </div>

                  {/* 登録済み特別休診日一覧 */}
                  <div className="space-y-1.5 pt-1">
                    {(scheduleConfig.specialClosedDays || []).length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-2">※現在登録されている特別休診日はありません</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {(scheduleConfig.specialClosedDays || []).map((sp) => (
                          <div
                            key={sp.date}
                            className="p-2.5 bg-white rounded-xl border border-rose-200/80 shadow-2xs flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono font-bold text-slate-700">{sp.date}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 truncate">
                                {sp.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (scheduleConfig.specialClosedDays || []).filter((s) => s.date !== sp.date);
                                setScheduleConfig({ ...scheduleConfig, specialClosedDays: updated });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="削除"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. 診療時間帯（10分刻みプルダウン選択） */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">午前診療 時間帯</span>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={scheduleConfig.morningStart || '09:30'}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, morningStart: e.target.value })
                        }
                        className="flex-1 px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {TIME_OPTIONS_10MIN.map((t) => (
                          <option key={`ms-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold">〜</span>
                      <select
                        value={scheduleConfig.morningEnd || '13:00'}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, morningEnd: e.target.value })
                        }
                        className="flex-1 px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {TIME_OPTIONS_10MIN.map((t) => (
                          <option key={`me-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">午後診療（平日）時間帯</span>
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={scheduleConfig.afternoonStart || '14:30'}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, afternoonStart: e.target.value })
                        }
                        className="flex-1 px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {TIME_OPTIONS_10MIN.map((t) => (
                          <option key={`as-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold">〜</span>
                      <select
                        value={scheduleConfig.afternoonEnd || '18:00'}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, afternoonEnd: e.target.value })
                        }
                        className="flex-1 px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {TIME_OPTIONS_10MIN.map((t) => (
                          <option key={`ae-${t}`} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. 土曜午後・予約スロット間隔（ゆとりのある高さ） */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">土曜日の午後終了時間</label>
                    <select
                      value={scheduleConfig.saturdayAfternoonEnd || '16:30'}
                      onChange={(e) =>
                        setScheduleConfig({ ...scheduleConfig, saturdayAfternoonEnd: e.target.value })
                      }
                      className="w-full px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {TIME_OPTIONS_10MIN.map((t) => (
                        <option key={`sat-${t}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">予約枠の間隔（スロット）</label>
                    <select
                      value={scheduleConfig.slotInterval || 30}
                      onChange={(e) =>
                        setScheduleConfig({ ...scheduleConfig, slotInterval: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2.5 h-11 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value={10}>10分間隔（細枠）</option>
                      <option value={15}>15分間隔</option>
                      <option value={20}>20分間隔</option>
                      <option value={30}>30分間隔（標準）</option>
                      <option value={45}>45分間隔</option>
                      <option value={60}>60分間隔</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSchedule}
                    className="px-6 py-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: selectedTheme.primary }}
                  >
                    <Save size={15} />
                    スケジュール設定を保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: メニュー・診療科目管理 (Services & Menus) */}
          {/* ========================================================================= */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">
                    診療・施術メニュー管理
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    WEB予約時に顧客が選択できるメニュー、所要時間、料金を設定します。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingService({
                      name: '',
                      category: '保険診療',
                      duration_minutes: 30,
                      price: 0,
                      is_online_bookable: true,
                    });
                    setIsServiceModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: selectedTheme.primary }}
                >
                  <Plus size={16} />
                  新規メニュー追加
                </button>
              </div>

              {/* メニューリスト */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">メニュー名</th>
                      <th className="p-4">カテゴリ</th>
                      <th className="p-4">所要時間</th>
                      <th className="p-4">参考料金</th>
                      <th className="p-4">WEB公開</th>
                      <th className="p-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{srv.name}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                            {srv.category}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{srv.duration_minutes} 分</td>
                        <td className="p-4 font-mono text-slate-700">
                          {srv.price === 0 ? '無料' : `¥${Number(srv.price).toLocaleString()}`}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              srv.is_online_bookable
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {srv.is_online_bookable ? '公開中' : '非公開'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingService(srv);
                              setIsServiceModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(srv.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: スタッフ・カレンダー連携設定 (Staffs & Calendars) */}
          {/* ========================================================================= */}
          {activeTab === 'staffs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">
                    スタッフ管理 & Googleカレンダー連携
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1施設あたり最大10名（10個のGoogleカレンダー）まで対応。スタッフごとに対応するカレンダーIDを割り当ててタイムラインで同期できます。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff({
                      name: '',
                      role: 'staff',
                      title: 'スタッフ',
                      badge_color: selectedTheme.primary,
                      phone: '',
                      email: '',
                      google_calendar_id: '',
                      accepts_new_patients: false,
                      is_active: true,
                    });
                    setIsStaffModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                  style={{ backgroundColor: selectedTheme.primary }}
                >
                  <Plus size={16} />
                  スタッフを追加
                </button>
              </div>

              {/* 担当制（指名・担当スタッフ制）の運用切り替え設定 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">担当制（スタッフ指名制）の運用</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${facilityProfile.is_staff_assignment_enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {facilityProfile.is_staff_assignment_enabled !== false ? '担当制: 有効' : '担当制: 無効（一括受付）'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {facilityProfile.is_staff_assignment_enabled !== false
                      ? '【有効中】患者一覧で割り当てた担当スタッフが存在する場合、再診予約はその担当者のGoogleカレンダーに自動追加されます。新患や担当未設定の場合は「新患受付カレンダー」へ登録されます。'
                      : '【無効中】すべての予約（新患・再診）を、指定された「新患受付カレンダー」へ一括登録します。'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const nextVal = facilityProfile.is_staff_assignment_enabled === false ? true : false;
                    const updated = { ...facilityProfile, is_staff_assignment_enabled: nextVal };
                    setFacilityProfile(updated);
                    await saveFacilityProfile(updated);
                    showToast(nextVal ? '担当制運用を【有効】に設定しました' : '担当制運用を【無効】に設定しました');
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 border flex items-center gap-2 ${
                    facilityProfile.is_staff_assignment_enabled !== false
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>{facilityProfile.is_staff_assignment_enabled !== false ? '担当制を無効にする' : '担当制を有効にする'}</span>
                </button>
              </div>

              {/* スタッフカード一覧 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffs.map((staff) => (
                  <div
                    key={staff.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-10 h-10 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0"
                          style={{ backgroundColor: staff.badge_color || '#3B82F6' }}
                        >
                          {staff.name.slice(0, 1)}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-800">{staff.name}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {staff.title}
                            </span>
                            {staff.accepts_new_patients && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                                ★ 新患受付カレンダー
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {staff.email && <p>連絡先: {staff.email}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStaff(staff);
                            setIsStaffModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Google Calendar ID表示枠 */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-500" />
                        GoogleカレンダーID:
                      </span>
                      <span className="font-mono text-slate-700 font-bold text-[11px] truncate max-w-[200px]">
                        {staff.google_calendar_id || <span className="text-slate-400 font-normal">未設定（個別入力可能）</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* サービスメニュー追加・編集モーダル */}
      {/* ========================================================================= */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingService.id ? 'メニュー編集' : '新規メニュー追加'}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">メニュー名</label>
                <input
                  type="text"
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="例: 定期検診・クリーニング"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">カテゴリ</label>
                  <input
                    type="text"
                    value={editingService.category}
                    onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">所要時間 (分)</label>
                  <input
                    type="number"
                    value={editingService.duration_minutes}
                    onChange={(e) =>
                      setEditingService({ ...editingService, duration_minutes: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">参考料金 (円・任意)</label>
                <input
                  type="number"
                  value={editingService.price}
                  onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chk_online"
                  checked={editingService.is_online_bookable}
                  onChange={(e) =>
                    setEditingService({ ...editingService, is_online_bookable: e.target.checked })
                  }
                  className="rounded text-slate-800"
                />
                <label htmlFor="chk_online" className="font-medium text-slate-700 cursor-pointer">
                  WEB予約で選択可能にする（公開）
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleSaveService(editingService)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* スタッフ・Googleカレンダー連携追加・編集モーダル */}
      {/* ========================================================================= */}
      {isStaffModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">
                {editingStaff.id ? 'スタッフ・カレンダー設定' : '新規スタッフ追加'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">スタッフ氏名</label>
                <input
                  type="text"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  placeholder="例: 佐藤 医師"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">役職・肩書</label>
                  <input
                    type="text"
                    value={editingStaff.title}
                    onChange={(e) => setEditingStaff({ ...editingStaff, title: e.target.value })}
                    placeholder="例: 歯科医師 / 衛生士"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">カレンダー表示色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingStaff.badge_color || '#3B82F6'}
                      onChange={(e) => setEditingStaff({ ...editingStaff, badge_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-slate-500">
                      {editingStaff.badge_color || '#3B82F6'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1スタッフ1カレンダー連携フィールド */}
              <div className="space-y-1 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
                <label className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar size={13} className="text-blue-600" />
                  担当GoogleカレンダーID
                </label>
                <input
                  type="text"
                  value={editingStaff.google_calendar_id || ''}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, google_calendar_id: e.target.value })
                  }
                  placeholder="例: staff1@group.calendar.google.com"
                  className="w-full p-2 bg-white border border-blue-200 rounded-lg font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  ※このスタッフの予約枠と同期するGoogleカレンダーのIDを入力します（1施設あたり最大10カレンダーまで設定可能）。
                </p>
              </div>

              {/* 新規患者（新患）受け入れカレンダーフラグ */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.accepts_new_patients || false}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, accepts_new_patients: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 text-xs">
                    新規患者（新患）を受け入れるカレンダーとして設定
                  </span>
                </label>
                <p className="text-[10px] text-slate-500 pl-6 leading-relaxed">
                  ※初診の患者様や担当未定の予約は、このカレンダーに自動登録されます（後から患者一覧で担当者を変更できます）。
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">連絡先メールアドレス</label>
                <input
                  type="email"
                  value={editingStaff.email || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 text-slate-500 font-bold text-xs"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleSaveStaff(editingStaff)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
