import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Sparkles, Clock, CheckCircle, Database, CalendarCheck, HeartHandshake, ShieldCheck } from 'lucide-react';
import { fetchAvailableSlots, createReservation } from '../utils/calendarService';

const SERVICE_OPTIONS = [
  {
    id: 'treatment',
    label: '歯が痛い・詰め物が取れた',
    shortLabel: '歯科治療（急患・治療）',
    category: '治療',
    icon: '🦷',
    description: '痛みや腫れ、詰め物の脱離など急なトラブルの処置',
    defaultDuration: 30,
  },
  {
    id: 'checkup',
    label: '定期検診・クリーニング',
    shortLabel: '定期検診・予防ケア',
    category: '予防・検診',
    icon: '🪥',
    description: '虫歯・歯周病チェック、歯石除去、着色落とし',
    defaultDuration: 45,
  },
  {
    id: 'consultation',
    label: '相談したい（矯正・審美・インプラント）',
    shortLabel: 'カウンセリング・相談',
    category: '相談',
    icon: '✨',
    description: '歯並び、ホワイトニング、自費診療の事前相談',
    defaultDuration: 30,
  },
  {
    id: 'other',
    label: 'その他・気になることがある',
    shortLabel: '一般診療・相談',
    category: '一般相談',
    icon: '📝',
    description: '顎の違和感、口臭、その他お困りごと',
    defaultDuration: 30,
  },
];

// 上品な歯のアイコン
function DentalIcon({ className = "w-5 h-5 text-brand-orange" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3C4.23858 3 2 5.23858 2 8C2 12 4 16 7 21C7.8 19 8.5 15.5 9 13C9.5 10.5 10 9 12 9C14 9 14.5 10.5 15 13C15.5 15.5 16.2 19 17 21C20 16 22 12 22 8C22 5.23858 19.7614 3 17 3C15 3 13.5 4 12 5C10.5 4 9 3 7 3Z" />
    </svg>
  );
}

export default function AIChat({ patient, onReservationComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState('menu'); // 'menu' | 'followup' | 'slot_selection' | 'confirmed'
  const [selectedService, setSelectedService] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const scrollRef = useRef(null);

  // 初回マウント時：パーソナライズされた声かけ
  useEffect(() => {
    if (!patient) return;

    const greeting = patient.isReturning
      ? `${patient.name}様、こんにちは！まつやま城山歯科クリニックです。\nいつもご来院いただきありがとうございます。\n本日はどのようなご相談でしょうか？`
      : `${patient.name}様、初めまして！まつやま城山歯科クリニックです。\n当院への受診をご検討いただきありがとうございます。\n本日はどのようなご症状・ご希望でしょうか？`;

    setMessages([
      {
        id: 1,
        type: 'bot',
        text: greeting,
        showMenuOptions: true,
      },
    ]);
  }, [patient]);

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, availableSlots]);

  // ステップ1: 4大メニュー選択
  const handleSelectMenu = (option) => {
    setSelectedService(option);
    const userMsg = { id: Date.now(), type: 'user', text: option.label };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const duration = patient?.isReturning
      ? option.defaultDuration
      : option.defaultDuration + (option.id === 'treatment' ? 15 : 0);

    setTimeout(() => {
      let botReply = '';
      if (option.id === 'treatment') {
        botReply = `お辛いですね。痛みや不調を最優先で解消できるよう、担当医の「治療枠（約${duration}分）」を確保いたします。\n症状の時期や詳しい様子を教えていただけますか？`;
      } else if (option.id === 'checkup') {
        botReply = `お口の定期ケアですね！素晴らしい心がけです。\n歯科衛生士による丁寧な「クリーニング・定期検診枠（約${duration}分）」をご案内いたします。\n前回の受診からどのくらい経ちましたでしょうか？`;
      } else if (option.id === 'consultation') {
        botReply = `ご相談ですね。当院では丁寧なカウンセリングを大切にしております。\n専任スタッフによる「ご相談枠（約${duration}分）」をご用意いたします。`;
      } else {
        botReply = `承知いたしました。お口全体のチェックを行う「一般診療枠（約${duration}分）」をご用意いたします。\n気になっている点をお聞かせください。`;
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

    const duration = patient?.isReturning
      ? selectedService.defaultDuration
      : selectedService.defaultDuration + (selectedService.id === 'treatment' ? 15 : 0);

    // Googleカレンダーから空き枠を取得
    setIsLoadingSlots(true);
    const slots = await fetchAvailableSlots(duration);
    setAvailableSlots(slots);
    setIsLoadingSlots(false);

    const botReply = `状況を詳しく教えていただきありがとうございます！\n【${selectedService.shortLabel}（所要約${duration}分）】として受け付けました。\n\n空き枠を確認いたしました。\n直近ですと以下の日時に余裕がございます。ご希望の枠をタップしてください。`;

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

    const duration = patient?.isReturning
      ? selectedService.defaultDuration
      : selectedService.defaultDuration + (selectedService.id === 'treatment' ? 15 : 0);

    // Googleカレンダー（GAS）＋ Supabase（appointments）への保存を実行
    const saveResult = await createReservation({
      patient: {
        name: patient.name,
        phone: patient.phone,
        patient_type: patient.patientType,
        patient_type_label: patient.patientTypeLabel,
      },
      service: {
        service_id: selectedService.id,
        service_label: selectedService.shortLabel,
        estimated_duration: duration,
        symptom_detail: messages.find((m) => m.type === 'user' && m.text !== selectedService.label)?.text || '',
      },
      slot,
    });

    const botReply = `ありがとうございます！\n【${slot.label}】にてご予約を確定いたしました。\n\n📅 カレンダーへの予定登録完了\n💾 カルテデータベースへの保存完了\n\n当日のご来院をスタッフ一同、心よりお待ちしております！`;

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
          menu_type: selectedService.shortLabel,
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
            <DentalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-serif">オンライン予約コンシェルジュ</h2>
            <p className="text-brand-gold text-[10px] italic font-serif uppercase tracking-wider">
              Smart Dental Reception
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
              {patient.isReturning ? '再診' : '新患'}
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
                  {m.type === 'user' ? <User size={16} /> : <DentalIcon className="w-4 h-4 text-brand-orange" />}
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

                  {/* Stage 1: 4大選択肢 */}
                  {m.showMenuOptions && stage === 'menu' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
                    >
                      {SERVICE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectMenu(opt)}
                          className="p-3.5 bg-white border border-brand-gold/20 rounded-2xl text-left hover:border-brand-orange hover:bg-brand-orange/5 hover:shadow-md transition-all group flex items-start gap-3"
                        >
                          <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {opt.icon}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-brand-orange block leading-tight mb-1 font-serif">
                              {opt.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block leading-tight">
                              {opt.description}
                            </span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* Stage 2: フォローアップ用チップ */}
                  {m.showFollowupChips && stage === 'followup' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-2 pt-1"
                    >
                      {selectedService?.id === 'treatment' && (
                        <>
                          <button
                            onClick={() => handleSendFollowup('今日から急に痛み出しました')}
                            className="px-3 py-1.5 bg-white border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            今日から痛む
                          </button>
                          <button
                            onClick={() => handleSendFollowup('数日前からじんじん痛みます')}
                            className="px-3 py-1.5 bg-white border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            数日前から痛む
                          </button>
                          <button
                            onClick={() => handleSendFollowup('銀歯・詰め物が取れてしまいました')}
                            className="px-3 py-1.5 bg-white border border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            詰め物が取れた
                          </button>
                        </>
                      )}

                      {selectedService?.id === 'checkup' && (
                        <>
                          <button
                            onClick={() => handleSendFollowup('半年ぶりの定期検診です')}
                            className="px-3 py-1.5 bg-white border border-brand-gold/30 text-brand-brown hover:bg-brand-brown hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            半年ぶり
                          </button>
                          <button
                            onClick={() => handleSendFollowup('1年以上検診を受けていません')}
                            className="px-3 py-1.5 bg-white border border-brand-gold/30 text-brand-brown hover:bg-brand-brown hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            1年以上ぶり
                          </button>
                          <button
                            onClick={() => handleSendFollowup('着色汚れ（ステイン）を落としたいです')}
                            className="px-3 py-1.5 bg-white border border-brand-gold/30 text-brand-brown hover:bg-brand-brown hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            着色汚れを落としたい
                          </button>
                        </>
                      )}

                      {selectedService?.id === 'consultation' && (
                        <>
                          <button
                            onClick={() => handleSendFollowup('マウスピース矯正の相談がしたいです')}
                            className="px-3 py-1.5 bg-white border border-brand-gold/30 text-brand-brown hover:bg-brand-brown hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            マウスピース矯正相談
                          </button>
                          <button
                            onClick={() => handleSendFollowup('ホワイトニングの費用や期間を聞きたいです')}
                            className="px-3 py-1.5 bg-white border border-brand-gold/30 text-brand-brown hover:bg-brand-brown hover:text-white rounded-full text-xs font-bold transition-all shadow-xs"
                          >
                            ホワイトニング相談
                          </button>
                        </>
                      )}
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
                            className="p-3 bg-white border border-brand-orange/30 rounded-xl text-left hover:bg-brand-orange hover:text-white transition-all shadow-xs group"
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
                <DentalIcon className="w-4 h-4 text-brand-orange animate-pulse" />
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
              ? '症状や気になることを入力できます...'
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
          className="w-10 h-10 rounded-full bg-brand-orange text-white flex items-center justify-center hover:bg-brand-brown disabled:opacity-40 transition-all shadow-md shadow-brand-orange/20 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
