import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, CheckSquare, Square, ShieldCheck } from 'lucide-react';

export default function LineIntegration({ onComplete }) {
    const [agreed, setAgreed] = useState(false);
    const [isLinked, setIsLinked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLineLogin = () => {
        setIsLoading(true);
        // Simulate OAuth flow
        setTimeout(() => {
            setIsLoading(false);
            setIsLinked(true);
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto p-10 bg-white rounded-[40px] shadow-2xl border border-brand-gold/5 text-center"
        >
            <div className="w-20 h-20 bg-[#06C755] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-100 transform hover:scale-110 transition-transform">
                <MessageCircle size={40} className="text-white" />
            </div>

            <h2 className="text-2xl font-bold text-brand-brown mb-4 font-serif">LINE連携で便利に</h2>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-serif">
                予約の確認やリマインド通知をLINEでお届けします。<br />
                当日の待ち時間情報もリアルタイムでチェック可能です。
            </p>

            <div className="space-y-4 mb-10">
                <button
                    onClick={handleLineLogin}
                    disabled={isLinked || isLoading}
                    className={`w-full py-5 rounded-[20px] font-bold flex items-center justify-center gap-2 transition-all shadow-md ${isLinked
                        ? 'bg-brand-ivory text-slate-400 border border-brand-gold/10'
                        : 'bg-[#06C755] text-white hover:bg-[#05b34d] hover:shadow-xl shadow-green-200 active:scale-95'
                        } ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>連携中...</span>
                        </div>
                    ) : isLinked ? (
                        <>
                            <ShieldCheck size={22} />
                            <span>LINE連携済み</span>
                        </>
                    ) : (
                        <>
                            <MessageCircle size={22} />
                            <span>LINEでログインする</span>
                        </>
                    )}
                </button>

                <label
                    className="flex items-start gap-4 text-left p-5 bg-brand-ivory/50 rounded-[20px] cursor-pointer hover:bg-brand-ivory transition-all group border border-transparent hover:border-brand-gold/10"
                    onClick={() => setAgreed(!agreed)}
                >
                    <div className="mt-1 transition-transform group-active:scale-90">
                        {agreed ? <CheckSquare className="text-brand-orange" size={24} /> : <Square className="text-brand-gold/30" size={24} />}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-700 block mb-1">予約完了通知を受け取る</span>
                        <span className="text-[11px] text-slate-400 leading-normal">メールに加えてLINEでも通知が届きます。</span>
                    </div>
                </label>
            </div>

            <button
                onClick={onComplete}
                className="w-full py-5 bg-brand-orange text-white rounded-[20px] font-bold hover:bg-brand-brown hover:scale-[1.02] transition-all shadow-xl shadow-brand-orange/20 text-lg font-serif"
            >
                予約を確定する
            </button>

            <p className="mt-8 text-[11px] text-slate-400 font-serif leading-relaxed italic">
                ※LINE連携を行わなくても予約は可能です。<br />
                プライバシーポリシーに同意の上、お進みください。
            </p>
        </motion.div>
    );
}
