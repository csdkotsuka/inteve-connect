import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CalendarDays,
  CalendarRange,
  Layers,
  RefreshCw,
  GripVertical,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  isToday,
} from 'date-fns';
import { ja } from 'date-fns/locale';

import {
  fetchFacilityReservations,
  createReservationInDb,
  updateReservationStatusInDb,
} from '../../utils/reservationService';
import {
  moveOrUpdateCalendarReservation,
  createGoogleCalendarEvent,
  batchSyncGoogleCalendar,
} from '../../utils/googleCalendarSyncService';
import { getClosureInfo } from '../../utils/clinicSchedule';
import ReservationDetailModal from './ReservationDetailModal';

const STATUS_LABELS = {
  confirmed: { label: '予約確定', bg: 'bg-blue-50', text: 'text-blue-700' },
  checked_in: { label: '来院受付', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed: { label: '診察完了', bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { label: 'キャンセル', bg: 'bg-rose-50', text: 'text-rose-700' },
};

export default function ReservationLedger({ facilityId, staffs, scheduleConfig, theme }) {
  const [viewType, setViewType] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newReservationData, setNewReservationData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // ドラッグ＆ドロップ state
  const [draggedRes, setDraggedRes] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { staffId, time }
  const [syncDialogData, setSyncDialogData] = useState(null); // 移動後の確認ダイアログ用
  const [isSavingMove, setIsSavingMove] = useState(false);

  const activeStaffs = useMemo(() => (staffs || []).filter((s) => s.is_active !== false), [staffs]);

  useEffect(() => {
    loadReservations();
  }, [facilityId, activeStaffs]);

  const loadReservations = async () => {
    if (activeStaffs.length > 0) {
      const data = await fetchFacilityReservations(facilityId, activeStaffs);
      setReservations(data);
    }
  };

  const handleBatchSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Googleカレンダーを取り込み中...');
    const res = await batchSyncGoogleCalendar(facilityId, activeStaffs);
    await loadReservations();

    setIsSyncing(false);
    setSyncMessage(`同期完了: ${res.syncedCount || 0} 件更新`);
    setTimeout(() => setSyncMessage(''), 3000);
  };

  // 日付操作
  const goToToday = () => setSelectedDate(new Date());
  const goToPrev = () => {
    if (viewType === 'day') setSelectedDate((d) => subDays(d, 1));
    else if (viewType === 'week') setSelectedDate((d) => subDays(d, 7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const goToNext = () => {
    if (viewType === 'day') setSelectedDate((d) => addDays(d, 1));
    else if (viewType === 'week') setSelectedDate((d) => addDays(d, 7));
    else setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const timeSlots = [
    '09:30','10:00','10:30','11:00','11:30','12:00','12:30',
    '14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00',
  ];

  // カレンダー画面ではキャンセル済み予約を除外して表示
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== 'cancelled'),
    [reservations]
  );

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayReservations = activeReservations.filter((r) => r.date === dateStr);

  const weekDays = useMemo(() =>
    eachDayOfInterval({
      start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
      end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
    }), [selectedDate]);

  // ── ステータス更新 ──
  const handleUpdateStatus = async (id, newStatus) => {
    const res = await updateReservationStatusInDb(id, newStatus);
    const newGoogleEventId = res?.newGoogleEventId;

    setReservations((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              google_event_id: newGoogleEventId !== undefined ? newGoogleEventId : r.google_event_id,
            }
          : r
      )
    );
    if (selectedReservation?.id === id) {
      setSelectedReservation((prev) => ({
        ...prev,
        status: newStatus,
        google_event_id: newGoogleEventId !== undefined ? newGoogleEventId : prev.google_event_id,
      }));
    }

    if (newStatus === 'cancelled') {
      setSyncMessage('✓ 予約をキャンセルし、Googleカレンダーから削除しました');
    } else {
      setSyncMessage('✓ ステータスを更新し、Googleカレンダーと同期しました');
    }
    setTimeout(() => setSyncMessage(''), 3000);
  };

  // ── ドラッグ＆ドロップ ──
  const handleDragStart = (e, res) => {
    setDraggedRes(res);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, staffId, time) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ staffId, time });
  };

  const handleDrop = (e, staffId, time) => {
    e.preventDefault();
    if (!draggedRes) return;
    if (draggedRes.staff_id === staffId && draggedRes.start_time === time) {
      setDraggedRes(null);
      setDropTarget(null);
      return;
    }
    // 移動先を確認ダイアログへ渡す
    const targetStaff = activeStaffs.find((s) => s.id === staffId);
    const endSlotIndex = timeSlots.indexOf(time) + 1;
    const endTime = endSlotIndex < timeSlots.length ? timeSlots[endSlotIndex] : '18:00';
    setSyncDialogData({
      reservation: draggedRes,
      newStaffId: staffId,
      newStaffName: targetStaff?.name || '未定',
      newCalendarId: targetStaff?.google_calendar_id || '',
      newTime: time,
      newEndTime: endTime,
    });
    setDraggedRes(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedRes(null);
    setDropTarget(null);
  };

  // ── ドラッグ移動を確定してGoogleカレンダーへ同期 ──
  const handleConfirmMove = async () => {
    if (!syncDialogData) return;
    setIsSavingMove(true);
    const { reservation, newStaffId, newStaffName, newCalendarId, newTime, newEndTime } = syncDialogData;
    const newDate = reservation.date;

    const startIso = `${newDate}T${newTime}:00+09:00`;
    const endIso = `${newDate}T${newEndTime}:00+09:00`;

    // 1. Supabase 更新
    try {
      const { supabase: sb } = await import('../../utils/supabaseClient');
      if (sb) {
        await sb.from('reservations').update({
          staff_id: newStaffId,
          start_at: startIso,
          end_at: endIso,
          updated_at: new Date().toISOString(),
        }).eq('id', reservation.id);
      }
    } catch (e) { console.warn('Supabase更新エラー:', e); }

    // 2. Googleカレンダー同期（同じスタッフ内ならupdate、別スタッフなら移動）
    const oldStaff = activeStaffs.find((s) => s.id === reservation.staff_id);
    const oldCalendarId = oldStaff?.google_calendar_id || '';

    const calSyncRes = await moveOrUpdateCalendarReservation({
      oldCalendarId,
      newCalendarId,
      eventId: reservation.google_event_id,
      customerName: reservation.customer_name,
      phone: reservation.customer_phone,
      menuName: reservation.menu_name,
      startAt: startIso,
      endAt: endIso,
      memo: reservation.memo,
      reservationId: reservation.id,
    });

    // 3. ローカルState更新
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id
          ? {
              ...r,
              staff_id: newStaffId,
              staff_name: newStaffName,
              start_time: newTime,
              end_time: newEndTime,
              google_event_id: calSyncRes?.eventId || r.google_event_id,
            }
          : r
      )
    );

    setIsSavingMove(false);
    setSyncDialogData(null);
    setSyncMessage('✓ 予約を移動し、Googleカレンダーと自動同期しました');
    setTimeout(() => setSyncMessage(''), 3000);
  };

  // 新規予約保存（電話予約・次回受診予約を手動追加）
  const handleSaveNewReservation = async (e) => {
    e.preventDefault();
    const matchedStaff = activeStaffs.find((s) => s.id === newReservationData.staff_id);
    const payload = {
      ...newReservationData,
      staff_name: matchedStaff?.name || 'スタッフ',
      google_calendar_id: matchedStaff?.google_calendar_id || '',
      date: dateStr,
    };
    await createReservationInDb(payload, facilityId);
    await loadReservations();
    setIsAddModalOpen(false);
  };

  // ドロップターゲットかどうか
  const isDropZone = (staffId, time) =>
    dropTarget?.staffId === staffId && dropTarget?.time === time;

  return (
    <div className="space-y-4">
      {/* 同期トースト */}
      <AnimatePresence>
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── コントロールバー ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
            <button onClick={goToPrev} className="p-1.5 hover:bg-slate-200 rounded-lg cursor-pointer">
              <ChevronLeft size={17} />
            </button>
            <button onClick={goToToday} className="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg text-xs font-bold shadow-2xs cursor-pointer">
              今日
            </button>
            <button onClick={goToNext} className="p-1.5 hover:bg-slate-200 rounded-lg cursor-pointer">
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-800 font-serif">
              {viewType === 'month'
                ? format(selectedDate, 'yyyy年 M月', { locale: ja })
                : viewType === 'week'
                ? `${format(weekDays[0], 'M月d日')} 〜 ${format(weekDays[6], 'M月d日')}`
                : format(selectedDate, 'yyyy年 M月d日 (E)', { locale: ja })}
            </span>
            {isToday(selectedDate) && viewType === 'day' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">本日</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { type: 'day', label: '日', icon: Layers },
              { type: 'week', label: '週', icon: CalendarDays },
              { type: 'month', label: '月', icon: CalendarRange },
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewType === type ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={13} />{label}
              </button>
            ))}
          </div>
          <button
            onClick={handleBatchSync}
            disabled={isSyncing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title="Googleカレンダーと同期"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">Google同期</span>
          </button>
          <button
            onClick={() => {
              setNewReservationData({
                staff_id: activeStaffs[0]?.id || '',
                customer_name: '',
                customer_phone: '',
                customer_type: 'returning',
                menu_name: '初診・一般診療',
                start_time: '10:00',
                end_time: '10:30',
                memo: '',
              });
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            style={{ backgroundColor: theme.primary }}
          >
            <Plus size={15} />予約追加
          </button>
        </div>
      </div>

      {/* ── 日表示 ── */}
      {viewType === 'day' && (() => {
        const dayClosure = getClosureInfo(selectedDate, scheduleConfig);
        return (
          <div className="space-y-3">
            {/* 休診日バナー */}
            {dayClosure.isClosed && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span className="font-bold">本日の診療スケジュール: 【{dayClosure.reason}】</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold shrink-0">
                  休診日
                </span>
              </div>
            )}

            <div className={`bg-white rounded-2xl border ${dayClosure.isClosed ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'} shadow-xs overflow-hidden`}>
              <div className="overflow-x-auto">
                {/* ヘッダー */}
                <div
                  className={`grid border-b border-slate-200 ${dayClosure.isClosed ? 'bg-rose-50/70' : 'bg-slate-50/90'} sticky top-0 z-10 min-w-[840px]`}
                  style={{ gridTemplateColumns: `80px repeat(${activeStaffs.length}, minmax(160px, 1fr))` }}
                >
                  <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200 font-mono">時間</div>
                  {activeStaffs.map((staff, idx) => (
                    <div key={staff.id || idx} className="p-3 border-r border-slate-200 last:border-r-0 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-7 h-7 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: staff.badge_color || theme.primary }}
                        >
                          {staff.name.slice(0, 1)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">{staff.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{staff.title || 'スタッフ'}</div>
                        </div>
                      </div>
                      {staff.google_calendar_id && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold shrink-0">Cal</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* タイムテーブル（ドラッグ＆ドロップ対応） */}
                <div
                  className="grid min-w-[840px] divide-y divide-slate-100"
                  style={{ gridTemplateColumns: `80px repeat(${activeStaffs.length}, minmax(160px, 1fr))` }}
                >
                  {timeSlots.map((time) => (
                    <React.Fragment key={time}>
                      <div className="p-2.5 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-200 bg-slate-50/40 flex items-start justify-center">
                        {time}
                      </div>
                      {activeStaffs.map((staff, sIdx) => {
                        const matchedReservations = dayReservations.filter(
                          (r) => (r.staff_id === staff.id || (!r.staff_id && sIdx === 0)) && r.start_time === time
                        );
                        const isTarget = isDropZone(staff.id, time);

                        return (
                          <div
                            key={`${staff.id || sIdx}-${time}`}
                            className={`p-1 min-h-[56px] border-r border-slate-100 last:border-r-0 relative transition-colors space-y-1.5 ${
                              isTarget ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-slate-50/50'
                            }`}
                            onDragOver={(e) => handleDragOver(e, staff.id, time)}
                            onDrop={(e) => handleDrop(e, staff.id, time)}
                          >
                            {matchedReservations.map((res) => {
                              const isDragging = draggedRes?.id === res.id;
                              return (
                                <motion.div
                                  key={res.id}
                                  initial={{ opacity: 0, scale: 0.96 }}
                                  animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, res)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedReservation(res)}
                                  className="p-2 rounded-xl shadow-2xs cursor-pointer hover:shadow-md active:cursor-grabbing border text-xs space-y-1 select-none"
                                  style={{
                                    backgroundColor: `${staff.badge_color || theme.primary}15`,
                                    borderColor: `${staff.badge_color || theme.primary}50`,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold truncate" style={{ color: theme.secondary }}>
                                      {res.customer_name} 様
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                        res.customer_type === 'returning' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {res.customer_type === 'returning' ? '再診' : '新患'}
                                      </span>
                                      <GripVertical size={10} className="text-slate-300" title="ドラッグで移動" />
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-slate-600 truncate">{res.menu_name || res.ai_summary}</div>
                                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                    <span>{res.start_time}〜{res.end_time}</span>
                                    <span className={`px-1.5 rounded text-[9px] font-bold ${STATUS_LABELS[res.status]?.bg} ${STATUS_LABELS[res.status]?.text}`}>
                                      {STATUS_LABELS[res.status]?.label}
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 週間表示 ── */}
      {viewType === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700">週間 時間帯別空き状況（枠クリックで日別に移動）</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-bold text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" />◎ 空き</span>
              <span className="flex items-center gap-1 font-bold text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-500" />△ 残1枠</span>
              <span className="flex items-center gap-1 font-bold text-rose-700"><span className="w-2 h-2 rounded-full bg-rose-500" />✕ 満枠</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid border-b border-slate-200 bg-slate-100/70 min-w-[800px]" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
              <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-200 font-mono">時間</div>
              {weekDays.map((day) => {
                const closure = getClosureInfo(day, scheduleConfig);
                const isCurrent = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={format(day, 'yyyy-MM-dd')}
                    onClick={() => { setSelectedDate(day); setViewType('day'); }}
                    className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : closure.isClosed
                        ? 'bg-rose-50 text-rose-700'
                        : 'hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{format(day, 'M/d')}</div>
                    <div className="text-[10px] opacity-85 truncate">
                      ({format(day, 'E', { locale: ja })})
                      {closure.isClosed && ` 休: ${closure.shortReason}`}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="grid min-w-[800px] divide-y divide-slate-100" style={{ gridTemplateColumns: '70px repeat(7, 1fr)' }}>
              {timeSlots.map((time) => (
                <React.Fragment key={time}>
                  <div className="p-2.5 text-center text-xs font-mono font-bold text-slate-400 border-r border-slate-200 bg-slate-50/40 flex items-center justify-center">{time}</div>
                  {weekDays.map((day) => {
                    const dayFormatted = format(day, 'yyyy-MM-dd');
                    const closure = getClosureInfo(day, scheduleConfig);
                    const slotResCount = activeReservations.filter((r) => r.date === dayFormatted && r.start_time <= time && r.end_time > time).length;
                    const available = (activeStaffs.length || 5) - slotResCount;
                    let mark = '◎', cls = 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200', lbl = `空き${available}`;
                    if (closure.isClosed) {
                      mark = '—';
                      cls = 'bg-rose-50/40 text-rose-300 border-rose-100 hover:bg-rose-100/50';
                      lbl = '';
                    } else if (available <= 0) {
                      mark = '✕';
                      cls = 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200';
                      lbl = '満枠';
                    } else if (available <= 1) {
                      mark = '△';
                      cls = 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200';
                      lbl = '残1';
                    }
                    return (
                      <button
                        key={`${dayFormatted}-${time}`}
                        onClick={() => { setSelectedDate(day); setViewType('day'); }}
                        className={`p-2 border-r border-slate-100 last:border-r-0 flex flex-col items-center justify-center transition-all cursor-pointer border-b ${cls}`}
                      >
                        <span className="text-sm font-black leading-none">{mark}</span>
                        {lbl && (
                          <span className="text-[9px] mt-0.5 opacity-80 font-mono truncate max-w-[80px]">{lbl}</span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 月間表示 ── */}
      {viewType === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center font-bold text-xs text-slate-500">
            {['月','火','水','木','金','土','日'].map((d, i) => (
              <div key={d} className={`py-2 rounded-xl bg-slate-50 ${i === 5 ? 'text-blue-600' : i === 6 ? 'text-rose-600' : ''}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {eachDayOfInterval({
              start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
              end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
            }).map((day) => {
              const dayFormatted = format(day, 'yyyy-MM-dd');
              const closure = getClosureInfo(day, scheduleConfig);
              const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const dayRes = activeReservations.filter((r) => r.date === dayFormatted);
              return (
                <button
                  key={dayFormatted}
                  onClick={() => { setSelectedDate(day); setViewType('day'); }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer min-h-[105px] flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-slate-800 ring-2 ring-slate-800/10 bg-slate-50 shadow-sm'
                      : !isCurrentMonth
                      ? 'bg-slate-50/40 border-slate-100 opacity-50'
                      : closure.isClosed
                      ? 'bg-rose-50/60 border-rose-200/90'
                      : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-bold rounded-lg px-1.5 py-0.5 ${isTodayDate ? 'bg-emerald-600 text-white' : isSelected ? 'bg-slate-800 text-white' : 'text-slate-700'}`}>
                      {format(day, 'd')}
                    </span>
                    {closure.isClosed && (
                      <span
                        className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded truncate max-w-[75px]"
                        title={closure.reason}
                      >
                        {closure.shortReason}
                      </span>
                    )}
                  </div>
                  {!closure.isClosed && isCurrentMonth && dayRes.length > 0 && (
                    <div className="space-y-1 my-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-600">予約:</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 rounded">{dayRes.length}件</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        {activeStaffs.slice(0, 5).map((stf, sIdx) => {
                          const cnt = dayRes.filter((r) => r.staff_id === stf.id).length;
                          return (
                            <div key={stf.id || sIdx} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: cnt > 0 ? (stf.badge_color || theme.primary) : '#E2E8F0' }} />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono text-right">{closure.isClosed ? '---' : `${dayRes.length}件`}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 予約詳細モーダル（クリック時） ── */}
      <AnimatePresence>
        {selectedReservation && (
          <ReservationDetailModal
            reservation={selectedReservation}
            staffs={activeStaffs}
            theme={theme}
            onClose={() => setSelectedReservation(null)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </AnimatePresence>

      {/* ── ドラッグ移動確認ダイアログ（Googleカレンダー同期） ── */}
      <AnimatePresence>
        {syncDialogData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">予約の移動を確認</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Googleカレンダーと同期して変更を保存します</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-bold text-slate-800">{syncDialogData.reservation.customer_name} 様</span>
                  <span className="text-slate-400">の予約を移動します</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className="text-[10px] text-slate-400 mb-1">移動前</div>
                    <div className="font-bold text-slate-700">{syncDialogData.reservation.staff_name}</div>
                    <div className="font-mono text-slate-600">{syncDialogData.reservation.start_time}〜</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                    <div className="text-[10px] text-blue-600 mb-1">移動後</div>
                    <div className="font-bold text-blue-800">{syncDialogData.newStaffName}</div>
                    <div className="font-mono text-blue-700">{syncDialogData.newTime}〜</div>
                  </div>
                </div>
                {syncDialogData.newCalendarId && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                    <Check size={12} />
                    <span>Googleカレンダー（{syncDialogData.newStaffName}）と自動同期します</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setSyncDialogData(null)}
                  className="px-4 py-2 text-slate-600 font-bold text-sm cursor-pointer hover:bg-slate-100 rounded-xl"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmMove}
                  disabled={isSavingMove}
                  className="px-5 py-2 rounded-xl text-white font-bold text-sm shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-70"
                  style={{ backgroundColor: theme.primary }}
                >
                  {isSavingMove ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                  移動して同期
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 新規予約モーダル ── */}
      {isAddModalOpen && newReservationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.form
            onSubmit={handleSaveNewReservation}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800">新規予約の登録</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">患者氏名</label>
                <input type="text" required value={newReservationData.customer_name}
                  onChange={(e) => setNewReservationData({ ...newReservationData, customer_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">電話番号</label>
                  <input type="tel" required value={newReservationData.customer_phone}
                    onChange={(e) => setNewReservationData({ ...newReservationData, customer_phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">区分</label>
                  <select value={newReservationData.customer_type}
                    onChange={(e) => setNewReservationData({ ...newReservationData, customer_type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="returning">再診</option>
                    <option value="new">新患</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">担当スタッフ</label>
                <select value={newReservationData.staff_id}
                  onChange={(e) => setNewReservationData({ ...newReservationData, staff_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {activeStaffs.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.google_calendar_id ? '✓Cal' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">メニュー</label>
                <input type="text" value={newReservationData.menu_name}
                  onChange={(e) => setNewReservationData({ ...newReservationData, menu_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">開始</label>
                  <input type="time" value={newReservationData.start_time}
                    onChange={(e) => setNewReservationData({ ...newReservationData, start_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">終了</label>
                  <input type="time" value={newReservationData.end_time}
                    onChange={(e) => setNewReservationData({ ...newReservationData, end_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">メモ</label>
                <textarea rows={2} value={newReservationData.memo}
                  onChange={(e) => setNewReservationData({ ...newReservationData, memo: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold cursor-pointer">キャンセル</button>
              <button type="submit" className="px-5 py-2 rounded-xl text-white font-bold shadow-md cursor-pointer" style={{ backgroundColor: theme.primary }}>予約を登録</button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
