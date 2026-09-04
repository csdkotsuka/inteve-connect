import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const STATUS_LABELS = {
  confirmed: { label: '予約確定', bg: 'bg-blue-100', text: 'text-blue-800' },
  checked_in: { label: '来院受付', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  completed: { label: '診察完了', bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { label: 'キャンセル', bg: 'bg-rose-100', text: 'text-rose-700' },
};

const CHANNEL_ICONS = {
  email: { icon: Mail, label: 'メール', color: 'text-blue-600', bg: 'bg-blue-50' },
  line: { icon: MessageCircle, label: 'LINE', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

/**
 * 予約詳細モーダル ＋ 患者への連絡ツール（LINE/メール 送受信一覧）
 */
export default function ReservationDetailModal({
  reservation,
  staffs,
  theme,
  onClose,
  onUpdateStatus,
}) {
  const [messageTab, setMessageTab] = useState('email'); // 'email' | 'line'
  const [messages, setMessages] = useState([]);
  const [draftBody, setDraftBody] = useState('');
  const [draftSubject, setDraftSubject] = useState(`【ご予約確認】${reservation?.date || ''} ${reservation?.start_time || ''}〜 の件`);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [tempStatus, setTempStatus] = useState(reservation?.status || 'confirmed');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusSaveSuccess, setStatusSaveSuccess] = useState(false);
  const msgEndRef = useRef(null);

  useEffect(() => {
    if (reservation?.status) setTempStatus(reservation.status);
  }, [reservation?.status]);

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const customer = {
    name: reservation?.customer_name || '患者様',
    phone: reservation?.customer_phone || '',
    email: reservation?.customer_email || '',
    id: reservation?.customer_id || null,
  };

  // メッセージ一覧を取得
  useEffect(() => {
    if (customer.id) {
      loadMessages();
    } else {
      setIsLoadingMessages(false);
    }
  }, [customer.id, messageTab]);

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    if (supabase && customer.id) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('channel', messageTab)
          .order('sent_at', { ascending: true });

        if (!error && data) {
          setMessages(data);
          // 受信メッセージを既読化
          await supabase
            .from('messages')
            .update({ opened_at: new Date().toISOString() })
            .eq('customer_id', customer.id)
            .eq('channel', messageTab)
            .eq('direction', 'inbound')
            .is('opened_at', null);
        }
      } catch (e) {
        console.warn('メッセージ取得エラー:', e);
      }
    }
    setIsLoadingMessages(false);
  };

  // メッセージ一覧の末尾に自動スクロール
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージ送信（GAS経由でメール/LINE）
  const handleSend = async () => {
    if (!draftBody.trim()) return;
    setIsSending(true);

    const gasUrl = import.meta.env.VITE_GAS_API_URL;

    // Supabase に先に記録（status: 'sending'）
    const newMsg = {
      facility_id:       reservation?.facility_id || null,
      customer_id:       customer.id || null,
      channel:           messageTab,
      direction:         'outbound',
      status:            'sending',
      subject:           draftSubject,
      body:              draftBody,
      recipient_address: messageTab === 'email' ? customer.email : customer.line_user_id,
      sent_at:           null,
    };

    let savedMsg = null;
    try {
      if (supabase) {
        const { data } = await supabase.from('messages').insert([newMsg]).select().single();
        if (data) savedMsg = data;
      }
    } catch (e) { console.warn('メッセージ保存エラー:', e); }

    let gasOk = false;
    let gasError = null;

    try {
      if (gasUrl) {
        let gasPayload = {};
        if (messageTab === 'email') {
          gasPayload = {
            action:   'send_email',
            to:       customer.email,
            subject:  draftSubject,
            text:     draftBody,
            htmlBody: `<p style="font-family:sans-serif;line-height:1.8;white-space:pre-wrap;">${draftBody.replace(/\n/g, '<br>')}</p>`,
            fromName: '椿歯科クリニック',
          };
        } else if (messageTab === 'line' && customer.line_user_id) {
          gasPayload = {
            action: 'send_line',
            to:     customer.line_user_id,
            text:   draftBody,
          };
        }
        if (gasPayload.action) {
          const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gasPayload),
          });
          const json = await res.json();
          gasOk = json.ok === true;
          gasError = json.error || null;
        }
      }
    } catch (e) {
      gasError = e.message;
    }

    // Supabase のステータス更新
    const finalStatus = gasOk ? 'sent' : (gasUrl ? 'failed' : 'sent'); // GAS未設定時はsent扱い
    const finalSentAt = new Date().toISOString();
    if (savedMsg && supabase) {
      await supabase
        .from('messages')
        .update({
          status:        finalStatus,
          sent_at:       finalSentAt,
          error_message: gasError,
        })
        .eq('id', savedMsg.id);
    }

    const displayMsg = {
      ...(savedMsg || { ...newMsg, id: `local-${Date.now()}` }),
      status:  finalStatus,
      sent_at: finalSentAt,
    };
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === displayMsg.id);
      return exists ? prev.map((m) => m.id === displayMsg.id ? displayMsg : m) : [...prev, displayMsg];
    });

    setDraftBody('');
    setIsSending(false);
  };

  if (!reservation) return null;

  const staff = staffs?.find((s) => s.id === reservation.staff_id);
  const status = STATUS_LABELS[reservation.status] || STATUS_LABELS.confirmed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ── ヘッダー ── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ backgroundColor: `${theme.primary}12`, borderBottom: `2px solid ${theme.primary}25` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow"
              style={{ backgroundColor: theme.primary }}
            >
              {customer.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-800 font-serif">
                  {customer.name} 様
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  reservation.customer_type === 'returning'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {reservation.customer_type === 'returning' ? '再診' : '新患'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                {reservation.date} {reservation.start_time}〜{reservation.end_time}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── ボディ（2カラム） ── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* 左: 予約詳細 ＋ 連絡先 ＋ ステータス */}
          <div className="md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-5 space-y-4">

            {/* 診療情報 */}
            <section className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs">
              <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">診療情報</h3>
              <Row label="メニュー" value={reservation.menu_name || reservation.ai_summary} />
              <Row label="担当スタッフ" value={staff?.name || reservation.staff_name || '未定'} />
              <Row
                label="Googleカレンダー"
                value={
                  reservation.google_event_id ? (
                    <span className="text-blue-600 font-mono text-[10px]">連携済</span>
                  ) : (
                    <span className="text-slate-400">未連携</span>
                  )
                }
              />
              {reservation.memo && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-[10px] text-slate-400 mb-1">申し送りメモ</p>
                  <p className="text-slate-700 leading-relaxed bg-white rounded-xl p-2.5 border border-slate-200">
                    {reservation.memo}
                  </p>
                </div>
              )}
            </section>

            {/* 連絡先 */}
            <section className="space-y-2 text-xs">
              <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">患者連絡先</h3>
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <Phone size={14} className="text-slate-500 shrink-0" />
                  <span className="font-mono font-bold text-slate-800">{customer.phone}</span>
                  <span className="ml-auto text-slate-400 text-[10px]">電話する</span>
                </a>
              )}
              {customer.email && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                  <Mail size={14} className="text-slate-500 shrink-0" />
                  <span className="font-mono text-slate-700 truncate">{customer.email}</span>
                </div>
              )}
              {!customer.email && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-bold">
                  ⚠️ メールアドレス未登録
                </div>
              )}
            </section>

            {/* ステータス変更 */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">ステータス変更</h3>
                {statusSaveSuccess && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> 保存完了
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'confirmed', label: '予約確定', color: 'bg-blue-600' },
                  { key: 'checked_in', label: '来院受付', color: 'bg-emerald-600' },
                  { key: 'completed', label: '診察完了', color: 'bg-slate-700' },
                  { key: 'cancelled', label: 'キャンセル', color: 'bg-rose-600' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setTempStatus(s.key);
                      setStatusSaveSuccess(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      tempStatus === s.key
                        ? `${s.color} text-white shadow-md ring-2 ring-offset-1 ring-slate-400`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* 保存ボタン（ステータス変更時に活性化） */}
              {tempStatus !== reservation.status && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="button"
                  disabled={isSavingStatus}
                  onClick={async () => {
                    setIsSavingStatus(true);
                    await onUpdateStatus(reservation.id, tempStatus);
                    setIsSavingStatus(false);
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: theme.primary }}
                >
                  {isSavingStatus ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>保存＆同期中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>ステータス変更を保存・同期</span>
                    </>
                  )}
                </motion.button>
              )}
            </section>
          </div>

          {/* 右: メッセージ送受信パネル */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* チャンネルタブ */}
            <div className="flex border-b border-slate-200 shrink-0 bg-slate-50/60">
              {(['email', 'line']).map((ch) => {
                const cfg = CHANNEL_ICONS[ch];
                const Icon = cfg.icon;
                return (
                  <button
                    key={ch}
                    onClick={() => setMessageTab(ch)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                      messageTab === ch
                        ? 'border-current text-slate-800 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                    style={messageTab === ch ? { borderColor: theme.primary, color: theme.primary } : {}}
                  >
                    <Icon size={15} />
                    {cfg.label}
                    {ch === 'line' && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-700 font-bold">
                        BETA
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={loadMessages}
                className="ml-auto p-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="更新"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                  <Loader2 size={18} className="animate-spin mr-2" />
                  読み込み中...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm space-y-2">
                  <Inbox size={28} className="opacity-40" />
                  <p className="text-xs">まだメッセージがありません</p>
                  <p className="text-[11px] opacity-70">下の入力欄からメッセージを送信できます</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOutbound && (
                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-1">
                          {customer.name.slice(0, 1)}
                        </div>
                      )}
                      <div className={`max-w-[72%] space-y-1 ${isOutbound ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isOutbound
                              ? 'text-white rounded-tr-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-xs'
                          }`}
                          style={isOutbound ? { backgroundColor: theme.primary } : {}}
                        >
                          {msg.subject && isOutbound && (
                            <div className="text-[10px] opacity-75 mb-1 pb-1 border-b border-white/20">
                              件名: {msg.subject}
                            </div>
                          )}
                          {msg.body}
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isOutbound ? 'flex-row-reverse' : ''}`}>
                          {isOutbound
                            ? <ArrowUpRight size={10} className="text-slate-400" />
                            : <ArrowDownLeft size={10} className="text-blue-400" />}
                          <span>{isOutbound ? '送信済' : '受信'}</span>
                          <span>
                            {msg.sent_at
                              ? format(new Date(msg.sent_at), 'M/d HH:mm', { locale: ja })
                              : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgEndRef} />
            </div>

            {/* 送信フォーム */}
            <div className="shrink-0 border-t border-slate-200 bg-white p-4 space-y-2">
              {messageTab === 'email' && (
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  placeholder="件名..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': theme.primary }}
                />
              )}
              <div className="flex gap-2">
                <textarea
                  rows={3}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder={
                    messageTab === 'line'
                      ? 'LINEで送るメッセージを入力...'
                      : `${customer.name} 様へのメール本文を入力...`
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !draftBody.trim()}
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-transform hover:scale-105 shrink-0 self-end"
                  style={{ backgroundColor: theme.primary }}
                >
                  {isSending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>{isSending ? '送信中' : '送信'}</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-400">
                {messageTab === 'email'
                  ? `送信先: ${customer.email || '（メール未登録）'} ・ ⌘+Enterで送信`
                  : `LINE送信: ${customer.name} 様・LINE公式アカウントからの一斉メッセージ`}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="font-bold text-slate-800 text-right">{value || '---'}</span>
    </div>
  );
}
