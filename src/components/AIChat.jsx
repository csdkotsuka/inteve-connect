import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Sparkles, Clock, CheckCircle, Database, CalendarCheck, HeartHandshake, ShieldCheck, Dumbbell, Flower2, Stethoscope, Store } from 'lucide-react';
import { fetchAvailableSlots, createReservation } from '../utils/calendarService';
import { getFacilityServices } from '../utils/facilityService';
import { getLabels } from '../constants/labels';

// 業種アイコンコンポーネント
function IndustryIcon({ industryType, className = "w-5 h-5 text-white" }) {
  if (industryType === 'beauty') {
    return <Flower2 className={className} />;
  }
  if (industryType === 'fitness') {
    return <Dumbbell className={className} />;
  }
  if (industryType === 'relax') {
    return <HeartHandshake className={className} />;
  }
  if (industryType === 'general') {
    return <Store className={className} />;
  }
  return <Stethoscope className={className} />;
}

export default function AIChat({ patient, onReservationComplete, industryType = 'medical' }) {
  const labels = getLabels(industryType);
  const [services, setServices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState('menu'); // 'menu' | 'followup' | 'slot_selection' | 'confirmed'
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const scrollRef = useRef(null);

  // メニュー読み込み & 初期メッセージ
  useEffect(() => {
    async function initChat() {
      const fetchedServices = await getFacilityServices(industryType);
      const onlineServices = fetchedServices.filter((s) => s.is_online_bookable !== false);
      setServices(onlineServices);

      if (!patient) return;

      const greeting = patient.isReturning
        ? `${patient.name}様、こんにちは！\nいつも当${labels.facilityTypeShort}を${labels.visit}いただきありがとうございます。\n本日はどのようなご相談・ご希望でしょうか？下記メニューよりお選びください。`
        : `${patient.name}様、初めまして！\n当${labels.facilityTypeShort}への${labels.visit}をご検討いただき誠にありがとうございます。\n本日のご希望・${labels.serviceMenu}をお選びください。`;

      setMessages([
        {
          id: 1,
          type: 'bot',
          text: greeting,
          showMenuOptions: true,
        },
      ]);
    }

    initChat();
  }, [patient, industryType]);

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, availableSlots]);

  // ステップ1: メニュー選択
  const handleSelectMenu = (serviceItem) => {
    setSelectedService(serviceItem);
    const displayLabel = serviceItem.chat_label || serviceItem.name;
    const userMsg = { id: Date.now(), type: 'user', text: displayLabel };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const duration = serviceItem.duration_minutes || 30;

    setTimeout(() => {
      let botReply = '';
      if (industryType === 'medical') {
        if (serviceItem.category?.includes('予防') || displayLabel.includes('検診') || displayLabel.includes('クリーニング')) {
          botReply = `定期的なケアですね！素晴らしい心がけです。\n丁寧な「${serviceItem.name}（所要約${duration}分）」をご案内いたします。\n前回の受診からどのくらい経ちましたでしょうか？気になっている点があればお聞かせください。`;
        } else if (displayLabel.includes('相談') || serviceItem.category?.includes('相談')) {
          botReply = `ご相談ですね。当院では丁寧なカウンセリングを大切にしております。\n専門スタッフによる「${serviceItem.name}（所要約${duration}分）」をご用意いたします。\n具体的なご相談内容をお聞かせください。`;
        } else {
          botReply = `承知いたしました。お辛い症状や不調をしっかり拝見できるよう、「${serviceItem.name}（所要約${duration}分）」の予約枠を確保いたします。\n症状の時期や詳しい様子を教えていただけますか？`;
        }
      } else if (industryType === 'beauty') {
        if (displayLabel.includes('相談') || serviceItem.category?.includes('相談')) {
          botReply = `ご相談ですね！お客様のお悩みや理想のスタイルを丁寧に伺い、最適なプランをご提案いたします（所要約${duration}分）。\n気になっていることやご質問があれば教えてください。`;
        } else {
          botReply = `【${displayLabel}】ですね！\nご要望に寄り添い、丁寧な${labels.treatment}をご提供いたします（所要約${duration}分）。\n特に重点的にお手入れしたい点や、ご希望の仕上がりなどはございますか？`;
        }
      } else if (industryType === 'fitness') {
        if (displayLabel.includes('体験') || serviceItem.category?.includes('体験')) {
          botReply = `体験セッションへのご参加ありがとうございます！\n現在の身体の状態や目標に合わせたマンツーマン指導を行います（所要約${duration}分）。\n現在のお悩みや目標（引き締め、体力づくり、姿勢改善など）を教えていただけますか？`;
        } else {
          botReply = `【${displayLabel}】ですね！\n目標達成に向けて全力でサポートいたします（所要約${duration}分）。\n今回のセッションで特に強化したい部位や気になるコンディションはございますか？`;
        }
      } else if (industryType === 'relax') {
        botReply = `【${displayLabel}】ですね。お身体の疲れやお悩みをしっかり解消できるよう、「${serviceItem.name}（所要約${duration}分）」でご案内いたします。\n特に気になっている部位やお辛い症状を教えていただけますか？`;
      } else {
        botReply = `【${displayLabel}】にて受け付けました。\nお客様に合わせた最適な${labels.service}を提供いたします（所要約${duration}分）。\nご要望や気になる点がございましたらお聞かせください。`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'bot',
          text: botReply,
          showFollowupChips: true,
        },
      ]);
      setIsTyping(false);
      setStage('followup');
    }, 600);
  };

  // ステップ2: フォローアップ回答 → Googleカレンダー空き枠をリアルタイム取得して即提案！
  const handleSendFollowup = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setStage('slot_selection');

    const duration = selectedService?.duration_minutes || 30;
    const menuDisplayName = selectedService?.chat_label || selectedService?.name || '予約メニュー';

    // Googleカレンダーから空き枠を取得
    setIsLoadingSlots(true);
    const slots = await fetchAvailableSlots(duration, patient);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);

    const botReply = `状況を詳しく教えていただきありがとうございます！\n【${menuDisplayName}（所要約${duration}分）】として受け付けました。\n\n最新の予約空き枠を確認いたしました。\n直近ですと以下の日時に余裕がございます。ご希望の枠をタップしてください。`;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: 'bot',
        text: botReply,
        showSlots: true,
        slots,
      },
    ]);
    setIsTyping(false);
  };

  // ステップ3: 空き枠タップ → Googleカレンダー ＆ Supabaseへダブル書き込みして予約確定！
  const handleSelectSlot = async (slot) => {
    const userMsg = { id: Date.now(), type: 'user', text: slot.label };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setStage('confirmed');

    const duration = selectedService?.duration_minutes || 30;
    const menuDisplayName = selectedService?.chat_label || selectedService?.name;

    // Googleカレンダー（GAS）＋ Supabase（appointments）への保存を実行
    const saveResult = await createReservation({
      patient: {
        ...patient,
        name: patient?.name,
        phone: patient?.phone,
        patient_type: patient?.patientType,
        patient_type_label: patient?.patientTypeLabel,
      },
      service: {
        service_id: selectedService?.id,
        service_label: selectedService?.name || menuDisplayName,
        chat_label: menuDisplayName,
        estimated_duration: duration,
        symptom_detail: messages.find((m) => m.type === 'user' && m.text !== menuDisplayName)?.text || '',
      },
      slot,
    });

    const botReply = `ありがとうございます！\n【${slot.label}】にてご予約を確定いたしました。\n\n📅 カレンダーへの予定登録完了\n💾 ${labels.chart}への保存完了\n\n当日の${labels.visit}をスタッフ一同、心よりお待ちしております！`;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: 'bot',
        text: botReply,
        isConfirmed: true,
      },
    ]);
    setIsTyping(false);

    // 予約完了サマリーを親コンポーネントに通知
    if (onReservationComplete) {
      setTimeout(() => {
        onReservationComplete({
          patient_name: patient.name,
          phone: patient.phone,
          patient_type: patient.patientType,
          menu_type: menuDisplayName,
          duration,
          scheduled_at: slot.label,
          status: 'confirmed',
          supabase_id: saveResult.supabaseAppointmentId,
        });
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-xl mx-auto bg-white rounded-[32px] shadow-2xl overflow-hidden border border-brand-gold/15">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-brown to-[#563e26] p-4 px-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-orange to-[#e08500] text-white flex items-center justify-center shadow-md shadow-brand-orange/20">
            <IndustryIcon industryType={industryType} className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-serif">オンライン予約コンシェルジュ</h2>
            <p className="text-brand-gold text-[10px] italic font-serif uppercase tracking-wider">
              Smart {labels.facilityTypeShort} Reception
            </p>
          </div>
        </div>

        {patient && (
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 text-xs text-white">
            <span
              className={`w-2 h-2 rounded-full ${
                patient.isReturning ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">{patient.name} 様</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
              {patient.isReturning ? labels.returningVisitShort : labels.firstVisitShort}
            </span>
          </div>
        )}
      </div>

      {/* Message Flow Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-2.5 max-w-[88%] ${
                  m.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-xs text-xs ${
                    m.type === 'user'
                      ? 'bg-brand-orange text-white'
                      : 'bg-brand-ivory border border-brand-gold/20 text-brand-orange'
                  }`}
                >
                  {m.type === 'user' ? <User size={16} /> : <IndustryIcon industryType={industryType} className="w-4 h-4 text-brand-orange" />}
                </div>

                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-[22px] text-sm shadow-xs leading-relaxed whitespace-pre-line ${
                      m.type === 'user'
                        ? 'bg-brand-orange text-white rounded-tr-none font-sans'
                        : 'bg-white text-slate-700 border border-brand-gold/15 rounded-tl-none font-serif'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Stage 1: 管理画面メニューから動的に生成された選択肢 */}
                  {m.showMenuOptions && stage === 'menu' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
                    >
                      {services.map((srv) => (
                        <button
                          key={srv.id}
                          onClick={() => handleSelectMenu(srv)}
                          className="p-3.5 bg-white border border-brand-gold/20 rounded-2xl text-left hover:border-brand-orange hover:bg-brand-orange/5 hover:shadow-md transition-all group flex items-start gap-3 cursor-pointer"
                        >
                          <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {srv.icon || '✨'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-brand-orange block leading-tight mb-1 font-serif">
                              {srv.chat_label || srv.name}
                            </span>
                            {srv.chat_label && srv.chat_label !== srv.name && (
                              <span className="text-[10px] text-slate-500 font-medium block leading-tight mb-0.5">
                                【{srv.name}】
                              </span>
                            )}
                            {srv.chat_description ? (
                              <span className="text-[10px] text-slate-400 block leading-tight line-clamp-2">
                                {srv.chat_description}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block leading-tight">
                                所要約{srv.duration_minutes || 30}分 {srv.price > 0 ? `• ¥${Number(srv.price).toLocaleString()}` : ''}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* Stage 2: フォローアップ用チップ（業種別プリセット） */}
                  {m.showFollowupChips && stage === 'followup' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-2 pt-1"
                    >
                      {(labels.chatFollowupChips || ['早めの枠を希望', 'じっくり相談したい', '初めてで不安がある', '定期的なメンテナンス']).map((chipText, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleSendFollowup(chipText)}
                          className="px-3 py-1.5 bg-white border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          {chipText}
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* Stage 3: Googleカレンダー空き枠の提示 */}
                  {m.showSlots && stage === 'slot_selection' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 pt-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1">
                        <span className="flex items-center gap-1">
                          <CalendarCheck size={13} className="text-brand-orange" />
                          リアルタイム空き枠（タップで即確定）
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {m.slots?.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSlot(slot)}
                            className="p-3 bg-white border border-brand-orange/30 rounded-xl text-left hover:bg-brand-orange hover:text-white transition-all shadow-xs group cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:text-white font-serif">
                              <Clock size={13} className="text-brand-orange group-hover:text-white" />
                              <span>{slot.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 group-hover:text-white/80 block mt-0.5">
                              即時確定可
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-full bg-brand-ivory border border-brand-gold/20 flex items-center justify-center">
                <IndustryIcon industryType={industryType} className="w-4 h-4 text-brand-orange animate-pulse" />
              </div>
              <div className="p-3 bg-white rounded-2xl border border-brand-gold/15 flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-gold/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-brand-gold/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand-gold/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-white border-t border-brand-gold/10 flex gap-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (stage === 'followup' ? handleSendFollowup() : null)}
          placeholder={
            stage === 'menu'
              ? '上の選択肢からお選びください'
              : stage === 'followup'
              ? 'ご希望やお困りごとを入力できます...'
              : stage === 'slot_selection'
              ? '上の空き枠から希望日時をタップしてください'
              : 'ご予約完了いたしました'
          }
          disabled={stage === 'menu' || stage === 'slot_selection' || stage === 'confirmed'}
          className="flex-1 px-4 py-2.5 bg-brand-ivory/50 border border-brand-gold/15 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/25 font-serif disabled:bg-slate-100 disabled:text-slate-400"
        />
        <button
          onClick={() => (stage === 'followup' ? handleSendFollowup() : null)}
          disabled={!input.trim() || stage !== 'followup'}
          className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:bg-brand-brown disabled:opacity-40 transition-all shadow-md shadow-brand-orange/20 shrink-0 cursor-pointer"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

