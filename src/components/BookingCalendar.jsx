import React, { useState } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_SLOTS = {
    morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'],
};

// Mock data representing Supabase 'appointments' table
const MOCK_EXISTING_APPOINTMENTS = [
    { start_at: `${format(addDays(new Date(), 1), 'yyyy-MM-dd')} 10:00`, status: 'confirmed' },
    { start_at: `${format(addDays(new Date(), 1), 'yyyy-MM-dd')} 14:30`, status: 'confirmed' },
    { start_at: `${format(addDays(new Date(), 2), 'yyyy-MM-dd')} 09:30`, status: 'confirmed' },
];

export default function BookingCalendar({ duration, onSelectSlot }) {
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
    const [selectedTime, setSelectedTime] = useState(null);

    const isReserved = (date, time) => {
        const dateTimeStr = `${format(date, 'yyyy-MM-dd')} ${time}`;
        return MOCK_EXISTING_APPOINTMENTS.some(apt => apt.start_at === dateTimeStr);
    };

    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Mon - Sat

    const isGapFilling = (time) => {
        if (duration === 30) {
            // Recommendations for treatment: usually mid-morning or early afternoon
            return time === '10:00' || time === '15:00';
        } else {
            // Recommendations for maintenance: usually near the end of shifts or early morning
            return time === '09:00' || time === '16:30';
        }
    };

    const getRecommendationReason = (time) => {
        if (duration === 30) {
            return 'こちらの時間は医師のスケジュールに余裕があり、スムーズな治療が可能です。';
        }
        return 'この時間は歯科衛生士の担当枠が確保しやすく、丁寧なクリーニングが受けられます。';
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-[32px] shadow-2xl overflow-hidden border border-brand-gold/10">
            <div className="bg-brand-brown p-8 text-white flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold font-serif mb-1">予約日時の選択</h2>
                    <p className="text-brand-gold text-xs italic font-serif opacity-80 uppercase tracking-widest">Select Date and Time</p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Day Selector */}
                <div className="grid grid-cols-6 gap-3 mb-10">
                    {days.map((day) => {
                        const isSelected = isSameDay(day, selectedDate);
                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`p-4 rounded-[20px] flex flex-col items-center transition-all ${isSelected
                                    ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20 scale-105'
                                    : 'bg-brand-ivory text-slate-500 hover:bg-brand-orange/10 hover:text-brand-orange border border-transparent hover:border-brand-orange/20'
                                    }`}
                            >
                                <span className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'opacity-80' : 'text-brand-gold'}`}>{format(day, 'EEE', { locale: ja })}</span>
                                <span className="text-xl font-bold font-serif">{format(day, 'd')}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Morning */}
                    <div>
                        <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                            <Clock size={16} /> 午前
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {MOCK_SLOTS.morning.map((time) => (
                                <SlotButton
                                    key={time}
                                    time={time}
                                    isSelected={selectedTime === time}
                                    isRecommended={isGapFilling(time)}
                                    isReserved={isReserved(selectedDate, time)}
                                    onClick={() => !isReserved(selectedDate, time) && setSelectedTime(time)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Afternoon */}
                    <div>
                        <h3 className="text-slate-400 font-bold mb-4 flex items-center gap-2">
                            <Clock size={16} /> 午後
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                            {MOCK_SLOTS.afternoon.map((time) => (
                                <SlotButton
                                    key={time}
                                    time={time}
                                    isSelected={selectedTime === time}
                                    isRecommended={isGapFilling(time)}
                                    isReserved={isReserved(selectedDate, time)}
                                    onClick={() => !isReserved(selectedDate, time) && setSelectedTime(time)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Suggestion Display */}
                <AnimatePresence>
                    {selectedTime && isGapFilling(selectedTime) && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-10 overflow-hidden"
                        >
                            <div className="p-5 bg-brand-orange/5 rounded-[24px] border border-brand-orange/10 flex items-center gap-5">
                                <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-orange/30">
                                    <Zap size={24} fill="white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-brand-orange font-serif">AIお勧め枠です</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{getRecommendationReason(selectedTime)}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Confirm Button */}
                <div className="mt-10">
                    <button
                        disabled={!selectedTime}
                        onClick={() => onSelectSlot({ date: selectedDate, time: selectedTime })}
                        className="w-full py-5 bg-brand-orange text-white rounded-[20px] font-bold disabled:opacity-30 disabled:grayscale transition-all hover:bg-brand-brown shadow-xl shadow-brand-orange/20 text-lg flex items-center justify-center gap-2"
                    >
                        <span>予約内容を確認する</span>
                        <span className="opacity-60 text-sm">({format(selectedDate, 'M/d')} {selectedTime || '--:--'})</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4">※時間は目安です。当日の状況により多少前後する場合がございます。</p>
                </div>
            </div>
        </div>
    );
}

function SlotButton({ time, isSelected, isRecommended, isReserved, onClick }) {
    return (
        <button
            onClick={onClick}
            disabled={isReserved}
            className={`relative p-4 rounded-[18px] border-2 transition-all flex flex-col items-center gap-1.5 ${isSelected
                ? 'bg-brand-orange border-brand-orange text-white shadow-lg shadow-brand-orange/20 z-10'
                : isReserved
                    ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed'
                    : isRecommended
                        ? 'bg-white border-brand-orange/20 hover:border-brand-orange text-slate-700'
                        : 'bg-white border-brand-ivory hover:border-brand-gold/30 text-slate-700'
                }`}
        >
            {isRecommended && !isSelected && !isReserved && (
                <span className="absolute -top-2.5 right-1 bg-brand-orange text-[9px] text-white px-2 py-0.5 rounded-full font-bold shadow-md uppercase tracking-tighter">
                    Best
                </span>
            )}
            <span className={`text-lg font-bold font-serif ${isReserved ? 'line-through opacity-50' : ''}`}>{time}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : isReserved ? 'bg-slate-200' : 'bg-brand-gold/40'}`} />
            {isReserved && <span className="text-[8px] mt-0.5">予約済み</span>}
        </button>
    );
}
