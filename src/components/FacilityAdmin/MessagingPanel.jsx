import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Mail,
  MessageCircle,
  Send,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  User,
  Info,
  CheckCircle2,
  AlertCircle,
  Crown,
  Star,
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getFacilityProfile } from '../../utils/facilityService';
import { getLabels } from '../../constants/labels';

const RANK_CONFIG = {
  vip: { label: 'VIP', bg: 'bg-amber-100', text: 'text-amber-800', color: '#D97706', icon: Crown },
  regular: { label: '一般', bg: 'bg-slate-100', text: 'text-slate-600', color: '#64748B', icon: User },
  new: { label: '新規', bg: 'bg-emerald-100', text: 'text-emerald-800', color: '#059669', icon: Star },
};

const CHANNEL_CONFIG = {
  email: { label: 'メール', icon: Mail, color: '#3B82F6' },
  line:  { label: 'LINE',  icon: MessageCircle, color: '#22C55E' },
};

const GAS_URL = import.meta.env.VITE_GAS_API_URL;
const FROM_EMAIL = 'kotsuka@creativesd.net';

/**
 * メッセージ送信ヘルパー（GAS経由）
 */
async function sendViaGas(action, payload) {
  if (!GAS_URL) {
    console.warn('VITE_GAS_API_URL 未設定');
    return { ok: false, error: 'GAS URL未設定' };
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

export default function MessagingPanel({ facilityId, theme, industryType }) {
  const labels = getLabels(industryType);
  const [customers, setCustomers]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [messages, setMessages]             = useState([]);
  const [channel, setChannel]               = useState('email');
  const [draftBody, setDraftBody]           = useState('');
  const [draftSubject, setDraftSubject]     = useState('');
  const [isSending, setIsSending]           = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs]   = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [unreadCounts, setUnreadCounts]     = useState({});
  const [sendResult, setSendResult]         = useState(null); // { ok, message }
  const [lineOfficialId, setLineOfficialId] = useState('@776cdsuy');
  const msgEndRef = useRef(null);

  useEffect(() => {
    getFacilityProfile().then((profile) => {
      if (profile?.line_official_id) {
        setLineOfficialId(profile.line_official_id);
      }
    });
  }, [facilityId]);

  useEffect(() => { loadCustomers(); }, [facilityId]);
  useEffect(() => {
    if (selectedCustomer) loadMessages();
  }, [selectedCustomer, channel]);
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime で受信メッセージをリアルタイム取得
  useEffect(() => {
    if (!supabase) return;
    const sub = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (
          payload.new.customer_id === selectedCustomer?.id &&
          payload.new.channel === channel
        ) {
          setMessages((prev) => [...prev, payload.new]);
        }
        loadUnreadCounts();
      })
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [selectedCustomer, channel]);

  const loadCustomers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, customer_rank, kana, line_user_id')
      .order('name', { ascending: true });
    if (!error && data) {
      setCustomers(data);
      loadUnreadCounts(data.map((c) => c.id));
    }
  };

  const loadUnreadCounts = async () => {
    if (!supabase) return;
    // opened_at が null で direction = 'inbound' のものを未読とみなす
    const { data } = await supabase
      .from('messages')
      .select('customer_id')
      .eq('direction', 'inbound')
      .is('opened_at', null);
    if (data) {
      const counts = {};
      data.forEach((m) => { counts[m.customer_id] = (counts[m.customer_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  };

  const loadMessages = async () => {
    if (!supabase || !selectedCustomer) return;
    setIsLoadingMsgs(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_id', selectedCustomer.id)
      .eq('channel', channel)
      .order('sent_at', { ascending: true });
    if (!error && data) {
      setMessages(data);
      // 既読化: inbound のものの opened_at を今の時刻に更新
      await supabase
        .from('messages')
        .update({ opened_at: new Date().toISOString() })
        .eq('customer_id', selectedCustomer.id)
        .eq('channel', channel)
        .eq('direction', 'inbound')
        .is('opened_at', null);
      loadUnreadCounts();
    }
    setIsLoadingMsgs(false);
  };

  const handleSend = async () => {
    if (!draftBody.trim() || !selectedCustomer) return;
    setIsSending(true);
    setSendResult(null);

    // Supabase にメッセージを記録
    const newMsg = {
      facility_id:        facilityId || null,
      customer_id:        selectedCustomer.id,
      channel,
      direction:          'outbound',
      status:             'sending',
      subject:            draftSubject || `${selectedCustomer.name} 様へのご連絡`,
      body:               draftBody,
      recipient_address:  channel === 'email' ? selectedCustomer.email : selectedCustomer.line_user_id,
      sent_at:            null,
    };

    let savedMsg = null;
    if (supabase) {
      const { data } = await supabase.from('messages').insert([newMsg]).select().single();
      if (data) savedMsg = data;
    }

    let gasResult = { ok: false, error: 'GAS URL未設定' };

    try {
      if (channel === 'email') {
        // ── メール送信 ──
        gasResult = await sendViaGas('send_email', {
          to:        selectedCustomer.email,
          subject:   draftSubject || `${selectedCustomer.name} 様へのご連絡`,
          text:      draftBody,
          htmlBody:  `<p style="font-family:sans-serif;line-height:1.8;white-space:pre-wrap;">${draftBody.replace(/\n/g, '<br>')}</p><hr><p style="color:#999;font-size:11px;">椿歯科クリニック 予約システムより自動送信</p>`,
          fromName:  '椿歯科クリニック',
        });

      } else if (channel === 'line') {
        if (!selectedCustomer.line_user_id) {
          gasResult = { ok: false, error: '患者様のLINEユーザーIDが未登録です。患者情報から登録してください。' };
        } else {
          // ── LINE プッシュ送信 ──
          gasResult = await sendViaGas('send_line', {
            to:   selectedCustomer.line_user_id,
            text: draftBody,
          });
        }
      }
    } catch (e) {
      gasResult = { ok: false, error: e.message };
    }

    // Supabase の status を更新
    const finalStatus = gasResult.ok ? 'sent' : 'failed';
    if (savedMsg && supabase) {
      await supabase
        .from('messages')
        .update({
          status:       finalStatus,
          sent_at:      gasResult.ok ? new Date().toISOString() : null,
          error_message: gasResult.ok ? null : (gasResult.error || '送信失敗'),
        })
        .eq('id', savedMsg.id);
    }

    // ローカル表示を更新
    const displayMsg = {
      ...(savedMsg || { ...newMsg, id: `tmp-${Date.now()}` }),
      status:   finalStatus,
      sent_at:  gasResult.ok ? new Date().toISOString() : null,
    };
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === displayMsg.id);
      return exists ? prev.map((m) => m.id === displayMsg.id ? displayMsg : m) : [...prev, displayMsg];
    });

    setSendResult({
      ok: gasResult.ok,
      message: gasResult.ok
        ? `✓ ${channel === 'email' ? 'メール' : 'LINE'}を送信しました`
        : `✗ 送信失敗: ${gasResult.error}`,
    });
    if (gasResult.ok) setDraftBody('');
    setIsSending(false);

    // 3秒後に結果メッセージを消す
    setTimeout(() => setSendResult(null), 4000);
  };

  const filteredCustomers = customers.filter((c) =>
    !searchQuery ||
    c.name?.includes(searchQuery) ||
    c.phone?.includes(searchQuery) ||
    c.kana?.includes(searchQuery)
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">{labels.customerShort}連絡・メッセージ管理</h2>
        <p className="text-xs text-slate-500 mt-0.5">{labels.customer}へのメール・LINEの送受信履歴を一画面で管理できます</p>
      </div>

      {/* LINE情報バナー */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-800">
        <Info size={15} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            LINEボット: {lineOfficialId}
            <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">接続中</span>
          </div>
          <p>LINE送信には{labels.customer}の <strong>LINEユーザーID</strong> が必要です。{labels.customerShort}情報に line_user_id が登録された方のみ個別送信できます。未登録の場合はメールで対応してください。</p>
        </div>
      </div>

      {/* 送信結果トースト */}
      <AnimatePresence>
        {sendResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${
              sendResult.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {sendResult.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {sendResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2カラムレイアウト */}
      <div className="flex gap-4 h-[620px]">
        {/* 左: 顧客リスト */}
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${labels.customerShort}を検索...`}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
                <User size={22} className="opacity-40" />
                <span>{labels.customerShort}が見つかりません</span>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const unread = unreadCounts[c.id] || 0;
                const isSelected = selectedCustomer?.id === c.id;
                const hasLine = !!c.line_user_id;
                const rank = RANK_CONFIG[c.customer_rank] || RANK_CONFIG.regular;
                const RankIcon = rank.icon;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full flex items-center gap-2.5 p-3 text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: rank.color }}
                    >
                      {c.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                          <span className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${rank.bg} ${rank.text} flex items-center gap-0.5`}>
                            <RankIcon size={8} />
                            {rank.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasLine && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">LINE</span>
                          )}
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{c.phone}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 右: メッセージエリア */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Inbox size={32} className="opacity-30" />
              <p className="text-sm">左のリストから{labels.customerShort}を選択してください</p>
            </div>
          ) : (
            <>
              {/* ヘッダー */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ backgroundColor: `${theme.primary}10`, borderBottom: `1.5px solid ${theme.primary}25` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs"
                    style={{ backgroundColor: (RANK_CONFIG[selectedCustomer.customer_rank] || RANK_CONFIG.regular).color }}
                  >
                    {selectedCustomer.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-800">{selectedCustomer.name} 様</span>
                      {(() => {
                        const selRank = RANK_CONFIG[selectedCustomer.customer_rank] || RANK_CONFIG.regular;
                        const SelRankIcon = selRank.icon;
                        return (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${selRank.bg} ${selRank.text} flex items-center gap-0.5`}>
                            <SelRankIcon size={9} />
                            {selRank.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {channel === 'email'
                        ? selectedCustomer.email || '（メール未登録）'
                        : selectedCustomer.line_user_id
                        ? `LINE: ${selectedCustomer.line_user_id.slice(0, 12)}...`
                        : '⚠️ LINE User ID 未登録'}
                    </div>
                  </div>
                </div>

                {/* チャンネル切り替え */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                  {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setChannel(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          channel === key ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        <Icon size={12} style={{ color: channel === key ? cfg.color : undefined }} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* メッセージ一覧 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {isLoadingMsgs ? (
                  <div className="flex items-center justify-center h-24 text-slate-400 text-xs gap-2">
                    <Loader2 size={15} className="animate-spin" />読み込み中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
                    <Inbox size={24} className="opacity-40" />
                    <p>まだメッセージがありません</p>
                    <p className="text-[10px] opacity-70">下の入力欄から送信できます</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOut = msg.direction === 'outbound';
                    const isFailed = msg.status === 'failed';
                    return (
                      <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                        {!isOut && (
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 mr-2 mt-1">
                            {selectedCustomer.name.slice(0, 1)}
                          </div>
                        )}
                        <div className={`max-w-[70%] flex flex-col ${isOut ? 'items-end' : 'items-start'} space-y-1`}>
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isFailed
                                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                                : isOut
                                ? 'text-white rounded-tr-sm'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-xs'
                            }`}
                            style={isOut && !isFailed ? { backgroundColor: theme.primary } : {}}
                          >
                            {msg.subject && isOut && (
                              <div className="text-[9px] opacity-70 mb-1 pb-1 border-b border-white/20">
                                📧 {msg.subject}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                            {isFailed && (
                              <div className="mt-1 text-[10px] text-rose-500 font-bold">
                                ✗ 送信失敗: {msg.error_message}
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${isOut ? 'flex-row-reverse' : ''}`}>
                            {isOut ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} className="text-blue-400" />}
                            <span>
                              {isFailed ? '送信失敗' : isOut ? '送信済' : '受信'}
                            </span>
                            <span>・</span>
                            <span>
                              {(msg.sent_at || msg.created_at)
                                ? format(new Date(msg.sent_at || msg.created_at), 'M/d HH:mm', { locale: ja })
                                : '---'}
                            </span>
                            {isOut && msg.opened_at && (
                              <span className="text-blue-500 font-bold">既読</span>
                            )}
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
                {channel === 'line' && !selectedCustomer.line_user_id && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 font-bold">
                    ⚠️ LINEユーザーIDが未登録です。{labels.customerShort}情報に line_user_id を追加すると送信できます。
                  </div>
                )}
                {channel === 'email' && (
                  <input
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    placeholder="件名を入力..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                )}
                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    placeholder={
                      channel === 'line'
                        ? 'LINEメッセージを入力（⌘+Enterで送信）...'
                        : `${selectedCustomer.name} 様へのメール本文（⌘+Enterで送信）...`
                    }
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || !draftBody.trim() || (channel === 'line' && !selectedCustomer.line_user_id)}
                    className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer flex flex-col items-center gap-1 self-end shrink-0"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    <span>{isSending ? '送信中' : '送信'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  {channel === 'email'
                    ? `送信元: ${FROM_EMAIL} → 送信先: ${selectedCustomer.email || '（メール未登録）'}`
                    : 'GAS経由でLINE Messaging APIから送信します（トークンはサーバー側に保管）'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
