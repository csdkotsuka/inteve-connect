import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function DiagnosisResult({ diagnosis, onNext }) {
    const isTreatment = diagnosis.type === 'treatment';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(186,145,85,0.1)] border border-brand-gold/5 max-w-lg mx-auto text-center"
        >
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-8 shadow-[0_10px_30px_-10px_rgba(255,151,1,0.3)] ${isTreatment ? 'bg-brand-orange text-white' : 'bg-brand-gold text-white'}`}>
                <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>

            <span className="inline-block px-4 py-1 bg-brand-ivory text-brand-gold text-[10px] font-bold rounded-full mb-4 font-serif uppercase tracking-widest">
                AI Diagnosis Complete
            </span>

            <h2 className="text-3xl font-bold text-brand-brown mb-4 font-serif">{diagnosis.label}予約</h2>
            <p className="text-slate-500 mb-10 text-sm leading-relaxed px-4">
                AIがあなたの症状に適した内容を判定しました。<br />
                <span className="font-bold text-slate-700 block mt-2 text-base">「{diagnosis.description}」</span>
            </p>

            <div className="flex gap-4 justify-center mb-10">
                <div className="flex flex-col items-center p-6 bg-brand-ivory/50 rounded-[24px] border border-brand-gold/5 min-w-[150px]">
                    <Clock className="text-brand-orange mb-3" size={28} />
                    <span className="text-[10px] text-brand-gold font-serif italic uppercase tracking-wider mb-1">Duration</span>
                    <span className="text-2xl font-bold text-brand-brown font-serif">{diagnosis.duration}<span className="text-sm font-normal ml-1">min</span></span>
                </div>
                <div className="flex flex-col items-center p-6 bg-brand-ivory/50 rounded-[24px] border border-brand-gold/5 min-w-[150px]">
                    <Calendar className="text-brand-gold mb-3" size={28} />
                    <span className="text-[10px] text-brand-gold font-serif italic uppercase tracking-wider mb-1">Type</span>
                    <span className="text-2xl font-bold text-brand-brown font-serif">{isTreatment ? '優先診察' : '定期ケア'}</span>
                </div>
            </div>

            <button
                onClick={onNext}
                className="w-full py-5 bg-brand-orange text-white rounded-[20px] font-bold hover:bg-brand-brown hover:scale-[1.02] transition-all shadow-xl shadow-brand-orange/20 text-lg font-serif"
            >
                空き時間を確認する
            </button>
        </motion.div>
    );
}
