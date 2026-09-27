import React, { useState } from 'react';
import { Download } from 'lucide-react';

const A4_PAGES = [
  { id: 1, label: 'P.1 表紙', src: '/about/images/leaflet_p1_cover.jpg', alt: 'CONNECT リーフレット P.1 表紙' },
  { id: 2, label: 'P.2 患者様体験フロー', src: '/about/images/leaflet_p2_patient.jpg', alt: 'CONNECT リーフレット P.2 患者様体験' },
  { id: 3, label: 'P.3 医院・店舗の管理機能', src: '/about/images/leaflet_p3_admin.jpg', alt: 'CONNECT リーフレット P.3 医院管理' },
  { id: 4, label: 'P.4 導入効果・お問い合わせ', src: '/about/images/leaflet_p4_back.jpg', alt: 'CONNECT リーフレット P.4 導入効果・裏表紙' },
];

const A3_SPREADS = [
  { id: 1, label: '外面見開き（左：P.4 裏表紙 ／ 右：P.1 表紙）', src: '/about/images/leaflet_a3_outside_spread.jpg', alt: 'CONNECT A3 外面見開き (P4 + P1)' },
  { id: 2, label: '内側見開き（左：P.2 患者様体験 ／ 右：P.3 医院管理）', src: '/about/images/leaflet_a3_inside_spread.jpg', alt: 'CONNECT A3 内側見開き (P2 + P3)' },
];

const PRICING_PAGE = {
  id: 'pricing',
  label: 'A4 料金プラン表（1カ月無料トライアル付）',
  src: '/about/images/CONNECT_Pricing_A4.jpg',
  alt: 'CONNECT A4 料金プラン表',
  pdf: '/CONNECT_Pricing_A4.pdf',
  pdfName: 'CONNECT_Pricing_A4.pdf',
  htmlUrl: '/about/pricing.html',
};

export default function LeafletView({ onBack, onBackToAdmin, onBackToBooking }) {
  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'spread') return 'spread';
      if (params.get('mode') === 'pricing') return 'pricing';
    } catch {
      // ignore
    }
    return 'paged';
  });

  let currentPdfUrl = '/CONNECT_Leaflet_A4.pdf';
  let currentPdfDownloadName = 'CONNECT_Leaflet_A4.pdf';
  if (layoutMode === 'spread') {
    currentPdfUrl = '/CONNECT_Leaflet_A3_Spread.pdf';
    currentPdfDownloadName = 'CONNECT_Leaflet_A3_Spread.pdf';
  } else if (layoutMode === 'pricing') {
    currentPdfUrl = '/CONNECT_Pricing_A4.pdf';
    currentPdfDownloadName = 'CONNECT_Pricing_A4.pdf';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* 画面上部コントロールバー */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 px-3 sm:px-6 py-2.5 shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* 上段（スマホ時）/ 左側（PC時）: タイトル ＆ 右上に縦並びナビボタン（スマホ時のみ表示） */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-xs sm:text-sm shadow-md shrink-0">
                C
              </div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight whitespace-nowrap">
                CONNECT リーフレット
              </h1>
            </div>

            {/* ナビゲーションボタン（スマホ時: 右上に縦並び） */}
            <div className="flex md:hidden flex-col gap-1 shrink-0">
              {onBackToAdmin && (
                <button
                  onClick={onBackToAdmin}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  施設管理画面へ
                </button>
              )}
              {onBackToBooking && (
                <button
                  onClick={onBackToBooking}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  予約画面へ
                </button>
              )}
              {onBack && !onBackToAdmin && !onBackToBooking && (
                <button
                  onClick={onBack}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  管理画面へ戻る
                </button>
              )}
            </div>
          </div>

          {/* 下段（スマホ時）/ 右側（PC時）: 操作ボタン ＆ PC時の縦並びナビボタン */}
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3">
            {/* 表示モード切り替え（A4 / A3 / 料金表） */}
            <div className="bg-slate-800 p-0.5 sm:p-1 rounded-xl flex items-center text-xs font-bold border border-slate-700 shrink-0">
              <button
                onClick={() => setLayoutMode('paged')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  layoutMode === 'paged' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 (4P)
              </button>
              <button
                onClick={() => setLayoutMode('spread')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  layoutMode === 'spread' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                A3 (2P)
              </button>
              <button
                onClick={() => setLayoutMode('pricing')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer text-xs ${
                  layoutMode === 'pricing' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                料金表 (1P)
              </button>
            </div>

            {/* PDF保存ボタン（現在選択中のモードに応じたPDFを出力） */}
            <a
              href={currentPdfUrl}
              download={currentPdfDownloadName}
              className="px-3 py-1.5 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
              title={`${layoutMode === 'pricing' ? 'A4 料金表' : layoutMode === 'paged' ? 'A4 4ページ' : 'A3 見開き'}のPDFを直接ダウンロードします`}
            >
              <Download size={14} />
              <span>{layoutMode === 'pricing' ? '料金表 PDF保存' : layoutMode === 'paged' ? 'A4 PDF保存' : 'A3 PDF保存'}</span>
            </a>

            {/* PC表示時の縦並びナビボタン */}
            <div className="hidden md:flex flex-col gap-1 ml-2 shrink-0">
              {onBackToAdmin && (
                <button
                  onClick={onBackToAdmin}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  施設管理画面へ
                </button>
              )}
              {onBackToBooking && (
                <button
                  onClick={onBackToBooking}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  予約画面へ
                </button>
              )}
              {onBack && !onBackToAdmin && !onBackToBooking && (
                <button
                  onClick={onBack}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-lg border border-slate-700 cursor-pointer transition-colors text-center"
                >
                  管理画面へ戻る
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインリーフレット表示領域 */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {layoutMode === 'pricing' ? (
          <div className="flex flex-col items-center gap-6">
            <section className="w-full max-w-[760px] flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2 px-1 text-slate-400 text-xs font-semibold">
                <span className="bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700/80 text-emerald-400 font-bold">
                  {PRICING_PAGE.label}
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={PRICING_PAGE.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-400 text-slate-400 transition-colors underline flex items-center gap-1"
                  >
                    HTML印刷版を開く
                  </a>
                  <a
                    href={PRICING_PAGE.src}
                    download="CONNECT_Pricing_A4.jpg"
                    className="hover:text-amber-400 transition-colors underline flex items-center gap-1"
                  >
                    画像保存
                  </a>
                </div>
              </div>
              <div className="w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                <img
                  src={PRICING_PAGE.src}
                  alt={PRICING_PAGE.alt}
                  className="w-full h-auto block select-none"
                />
              </div>
            </section>
          </div>
        ) : layoutMode === 'paged' ? (
          <div className="flex flex-col items-center gap-8 sm:gap-12">
            {A4_PAGES.map((page) => (
              <section key={page.id} className="w-full max-w-[760px] flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2 px-1 text-slate-400 text-xs font-semibold">
                  <span className="bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700/80 text-teal-400">
                    {page.label}
                  </span>
                  <a
                    href={page.src}
                    download={`CONNECT_Leaflet_P${page.id}.jpg`}
                    className="hover:text-amber-400 transition-colors underline flex items-center gap-1"
                  >
                    画像保存
                  </a>
                </div>
                <div className="w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                  <img
                    src={page.src}
                    alt={page.alt}
                    className="w-full h-auto block select-none"
                    loading="lazy"
                  />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 sm:gap-12">
            {A3_SPREADS.map((spread) => (
              <section key={spread.id} className="w-full max-w-[1100px] flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2 px-1 text-slate-400 text-xs font-semibold">
                  <span className="bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700/80 text-teal-400">
                    {spread.label}
                  </span>
                  <a
                    href={spread.src}
                    download={`CONNECT_A3_Spread_${spread.id}.jpg`}
                    className="hover:text-amber-400 transition-colors underline flex items-center gap-1"
                  >
                    画像保存
                  </a>
                </div>
                <div className="w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                  <img
                    src={spread.src}
                    alt={spread.alt}
                    className="w-full h-auto block select-none"
                    loading="lazy"
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
