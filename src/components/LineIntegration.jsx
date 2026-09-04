import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, CheckSquare, Square, ShieldCheck, QrCode, ExternalLink, ArrowRight } from 'lucide-react';
import { getFacilityProfile } from '../utils/facilityService';

export default function LineIntegration({ onComplete, customerName, customerPhone }) {
  const [agreed, setAgreed] = useState(true);
  const [isLinked, setIsLinked] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lineOfficialId, setLineOfficialId] = useState('@776cdsuy');

  useEffect(() => {
    getFacilityProfile().then((profile) => {
      if (profile?.line_official_id) {
        setLineOfficialId(profile.line_official_id);
      }
    });
  }, []);

  const lineAddFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(lineOfficialId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lineAddFriendUrl)}`;

  const handleLineLink = () => {
    // LINEアプリ / 友だち追加URLを開く
    window.open(lineAddFriendUrl, '_blank');
    setIsLinked(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto p-8 bg-white rounded-[36px] shadow-2xl border border-slate-100 text-center space-y-6"
    >
      {/* LINEアイコン */}
      <div className="w-16 h-16 bg-[#06C755] rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-green-100 transform hover:scale-105 transition-transform">
        <MessageCircle size={34} className="text-white" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 font-serif">LINEで予約確認・リマインド</h2>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          当院のLINE公式アカウント（{lineOfficialId}）を友だち追加いただくと、予約確認通知や前日リマインドが届きます。
        </p>
      </div>

      {/* QRコード & リンクカード */}
      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-4">
        {showQR ? (
          <div className="space-y-3">
            <img
              src={qrCodeUrl}
              alt="LINE友だち追加QRコード"
              className="w-40 h-40 mx-auto rounded-2xl border-4 border-white shadow-sm"
            />
            <p className="text-[11px] text-slate-500 font-mono">
              スマホのカメラで読み取って友だち追加
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleLineLink}
              className="w-full py-3.5 px-4 bg-[#06C755] hover:bg-[#05b34d] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-green-200 transition-all cursor-pointer active:scale-98"
            >
              <MessageCircle size={18} />
              <span>LINE友だち追加して連携</span>
              <ExternalLink size={14} className="opacity-80" />
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <QrCode size={13} />
              <span>QRコードを表示する（PCの場合）</span>
            </button>
          </div>
        )}

        {/* 同意チェック */}
        <label
          className="flex items-start gap-3 text-left p-3 rounded-xl bg-white border border-slate-200/60 cursor-pointer"
          onClick={() => setAgreed(!agreed)}
        >
          <div className="mt-0.5 shrink-0">
            {agreed ? <CheckSquare className="text-emerald-600" size={18} /> : <Square className="text-slate-300" size={18} />}
          </div>
          <div className="text-[11px] text-slate-600 leading-snug">
            予約リマインド通知や診療案内をLINEで受け取ることに同意します
          </div>
        </label>
      </div>

      {/* 予約完了へ進むボタン */}
      <button
        onClick={onComplete}
        className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <span>予約を確定する</span>
        <ArrowRight size={16} />
      </button>

      <p className="text-[10px] text-slate-400">
        ※LINE連携を行わなくてもメールでの予約完了通知が届きます。
      </p>
    </motion.div>
  );
}
