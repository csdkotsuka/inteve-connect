import React, { useState } from 'react';
import {
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  MessageCircle,
  Palette,
  ExternalLink,
  Smartphone,
  Building2,
  Sliders,
  Lock,
  Cloud,
  HeartHandshake,
} from 'lucide-react';
import { CROPPED } from './leafletAssets';

// ダミーQRコードコンポーネント（デザイン統一・枠線/影なし・後から差替可能）
function DummyQrCode({ size = 100, label = 'デモ体験（仮）' }) {
  return (
    <div
      className="bg-white p-2 rounded-2xl flex flex-col items-center justify-between"
      style={{ width: size, height: size }}
    >
      <div className="w-full h-full relative border-2 border-dashed border-teal-500/40 rounded-xl bg-teal-50/40 flex flex-col items-center justify-center p-1 overflow-hidden">
        {/* 四隅のQRコード位置検出シンボル（ベクター風） */}
        <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-2 border-teal-700 rounded-xs flex items-center justify-center bg-white">
          <div className="w-1.5 h-1.5 bg-teal-700 rounded-2xs" />
        </div>
        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-2 border-teal-700 rounded-xs flex items-center justify-center bg-white">
          <div className="w-1.5 h-1.5 bg-teal-700 rounded-2xs" />
        </div>
        <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-2 border-teal-700 rounded-xs flex items-center justify-center bg-white">
          <div className="w-1.5 h-1.5 bg-teal-700 rounded-2xs" />
        </div>

        {/* ドット装飾パターン */}
        <div className="grid grid-cols-4 gap-1 opacity-25">
          <div className="w-1 h-1 bg-teal-800 rounded-full" />
          <div className="w-1 h-1 bg-teal-800 rounded-full" />
          <div className="w-1 h-1 bg-teal-800 rounded-full" />
          <div className="w-1 h-1 bg-teal-800 rounded-full" />
        </div>

        {/* センターバッジ */}
        <div className="bg-teal-700 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider my-1">
          DEMO QR
        </div>
        <span className="text-[8px] text-teal-900 font-bold text-center leading-none">
          {label}
        </span>
      </div>
    </div>
  );
}

// ブランドロゴコンポーネント（LP完全準拠・グレー枠・影なし）
function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white flex items-center justify-center shrink-0">
        <ExternalLink size={16} className="text-white" />
      </div>
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-xl font-black tracking-tight text-slate-800 font-sans">CONNECT</span>
          <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md">
            Smart DX
          </span>
        </div>
        <p className="text-[9px] text-slate-400 font-medium tracking-wider mt-0.5">
          by Creative System Design
        </p>
      </div>
    </div>
  );
}

// テーマカラー定義（connect.html / システム標準6色）
const THEME_COLORS = [
  { id: 'ocean', name: 'メディカルオーシャン', primary: '#0d9488', desc: '清潔・安心感（歯科・クリニック）' },
  { id: 'terracotta', name: 'テラコッタウォーム', primary: '#C25E42', desc: '温もり・信頼（審美・整体）' },
  { id: 'rose', name: 'エレガントローズ', primary: '#E11D48', desc: '華やか・美（サロン・エステ）' },
  { id: 'forest', name: 'フォレストグリーン', primary: '#059669', desc: '癒やし・自然（リラク・鍼灸）' },
  { id: 'indigo', name: 'ロイヤルインディゴ', primary: '#4F46E5', desc: '洗練・知性（専門店舗）' },
  { id: 'slate', name: 'モダンシック', primary: '#334155', desc: '上質・高級（ハイエンド店舗）' },
];

export default function LeafletView({ onBack, onBackToAdmin, onBackToBooking }) {
  // 表示モード: 'paged' (A4 4ページ縦並び) / 'spread' (A3横置き 2つ折り見開き)
  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'spread') return 'spread';
    } catch (e) {}
    return 'paged';
  });

  const handlePrint = (targetMode) => {
    if (targetMode && targetMode !== layoutMode) {
      setLayoutMode(targetMode);
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-800 pb-16 print:bg-white print:p-0 print:m-0 print:min-h-0 font-sans ${
        layoutMode === 'paged' ? 'paged-mode' : 'spread-mode'
      }`}
    >
      {/* 画面上部コントロールバー（印刷時は非表示） */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center font-bold text-sm shadow-md">
            C
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">
              CONNECT 4Pリーフレット
            </h1>
            <p className="text-[11px] text-slate-400">
              {layoutMode === 'paged'
                ? '【A4 4ページモード】A4縦×4P ぴったり出力'
                : '【A3 見開きモード】A3横×2P（表裏） ぴったり出力'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 表示モード切り替え */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-700">
            <button
              onClick={() => setLayoutMode('paged')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'paged' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              A4 4ページ縦一覧 (4P)
            </button>
            <button
              onClick={() => setLayoutMode('spread')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'spread' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              A3横 2つ折り見開き (2P)
            </button>
          </div>

          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs md:text-sm rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            title={
              layoutMode === 'paged'
                ? 'A4用紙で全4ページぴったりのPDFを出力します'
                : 'A3横向き用紙で表面・裏面の全2ページぴったりのPDFを出力します'
            }
          >
            <Printer size={16} />
            <span>
              {layoutMode === 'paged' ? 'A4 PDF出力 (全4P)' : 'A3見開き PDF出力 (全2P)'}
            </span>
          </button>

          {onBackToAdmin && (
            <button
              onClick={onBackToAdmin}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
            >
              施設管理画面へ
            </button>
          )}
          {onBackToBooking && (
            <button
              onClick={onBackToBooking}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
            >
              予約画面へ
            </button>
          )}
          {onBack && !onBackToAdmin && !onBackToBooking && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
            >
              管理画面へ戻る
            </button>
          )}
        </div>
      </div>

      {/* 印刷用CSS定義 (モードに応じて動的切り替え) */}
      <style>{`
        /* 全要素をPlus Jakarta Sans & Noto Sans JPのクリーンなSans-Serifで統一（明朝体を完全上書き） */
        .leaflet-main-container,
        .leaflet-main-container h1,
        .leaflet-main-container h2,
        .leaflet-main-container h3,
        .leaflet-main-container h4,
        .leaflet-main-container p,
        .leaflet-main-container span,
        .leaflet-main-container div {
          font-family: "Plus Jakarta Sans", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif !important;
        }

        /* 影（box-shadow）によるPDFレンダリング時のグレー枠・矩形アーティファクトを根絶 */
        .leaflet-main-container,
        .leaflet-main-container * {
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
          text-shadow: none !important;
        }

        ${
          layoutMode === 'spread'
            ? `@page {
                size: A3 landscape;
                margin: 0;
              }`
            : `@page {
                size: A4 portrait;
                margin: 0;
              }`
        }

        @media print {
          *, *::before, *::after {
            box-sizing: border-box !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            text-shadow: none !important;
            filter: none !important;
            -webkit-filter: none !important;
          }

          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden, .no-print, header, nav {
            display: none !important;
          }

          .leaflet-main-container {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }

          /* A4 4ページモード */
          .paged-mode .leaflet-page {
            width: 210mm !important;
            height: 296.5mm !important;
            min-height: 296.5mm !important;
            max-height: 296.5mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .paged-mode .leaflet-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* A3 見開きモード */
          .spread-mode .leaflet-spread-sheet {
            width: 420mm !important;
            height: 296.5mm !important;
            min-width: 420mm !important;
            max-width: 420mm !important;
            min-height: 296.5mm !important;
            max-height: 296.5mm !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: stretch !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .spread-mode .leaflet-spread-sheet:last-of-type,
          .spread-mode .leaflet-spread-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .spread-mode .leaflet-spread-sheet .leaflet-page {
            width: 210mm !important;
            height: 296.5mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 296.5mm !important;
            max-height: 296.5mm !important;
            flex: 0 0 210mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* メインリーフレット表示領域 */}
      <div className="leaflet-main-container max-w-[1200px] mx-auto py-8 px-4 flex flex-col items-center gap-8 print:p-0 print:m-0 print:max-w-none print:gap-0 print:block">
        {layoutMode === 'paged' ? (
          <>
            <Page1Cover />
            <Page2Customer />
            <Page3Facility />
            <Page4Benefits />
          </>
        ) : (
          <>
            {/* シート1：表面（外側見開き） P4 (左) + P1 (右) */}
            <div className="text-center font-bold text-slate-600 text-sm mb-2 print:hidden flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-800 text-white text-xs">
                A3 第1面：外側見開き（表面）
              </span>
              <span>左：Page 4（導入メリット＆裏表紙） ／ 右：Page 1（表紙）</span>
            </div>
            <div className="leaflet-spread-sheet flex flex-col 2xl:flex-row items-center justify-center rounded-2xl overflow-hidden print:rounded-none">
              <Page4Benefits isSpread={true} />
              <Page1Cover isSpread={true} />
            </div>

            {/* シート2：裏面（内側見開き） P2 (左) + P3 (右) */}
            <div className="text-center font-bold text-slate-600 text-sm mb-2 mt-8 print:hidden flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-800 text-white text-xs">
                A3 第2面：内側見開き（裏面）
              </span>
              <span>左：Page 2（お客様体験） ／ 右：Page 3（施設管理・スタッフ体験）</span>
            </div>
            <div className="leaflet-spread-sheet flex flex-col 2xl:flex-row items-center justify-center rounded-2xl overflow-hidden print:rounded-none">
              <Page2Customer isSpread={true} />
              <Page3Facility isSpread={true} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===================================================================================
// PAGE 1: 表紙 (Cover Page)
// ===================================================================================
function Page1Cover({ isSpread = false }) {
  return (
    <div
      className={`leaflet-page bg-white text-slate-800 relative overflow-hidden flex flex-col justify-between ${
        isSpread ? 'w-[210mm] h-[296.5mm]' : 'w-[210mm] h-[296.5mm] rounded-2xl print:rounded-none'
      }`}
      style={{
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #f0fdf9 0%, #ffffff 50%, #faf8f5 100%)',
      }}
    >
      {/* 繊細な装飾グラデーションオーブ */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-emerald-100/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* ── ヘッダー（ブランド & バッジ） ── */}
      <div className="px-10 pt-8 pb-2 z-10">
        <div className="flex items-center justify-between pb-3.5">
          <BrandLogo />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-teal-900 text-xs font-bold whitespace-nowrap shrink-0 border border-teal-100">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
            <span>24時間 AI即レス予約</span>
            <span className="text-teal-400">＆</span>
            <span>スタッフ個別管理システム</span>
          </div>
        </div>

        {/* ── キャッチコピー領域（connect.htmlと完全統一） ── */}
        <div className="mt-3 space-y-2.5">
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-[1.3]">
            <span>患者様には<span className="text-teal-600">即レスの心地よさ</span>を。</span><br />
            <span>スタッフには<span className="text-slate-800 underline decoration-teal-300 decoration-wavy decoration-2">ゆとりと確実さ</span>を。</span>
          </h1>

          {/* 上部にスペースを空けて配置 */}
          <div className="pt-1.5">
            <p className="text-xs text-slate-600 font-normal leading-relaxed max-w-2xl">
              LINE・スマホで簡単ログイン。AIチャットで症状を伝えるだけで、空き枠を自動提案して即時予約完了。
              スタッフ別タイムラインカレンダーと電子カルテ連携で、毎日の受付・予約管理のストレスをゼロにします。
            </p>
          </div>

          {/* 業種ピルバッジ */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider">
              幅広い業種に対応:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-slate-700 border border-slate-100">
              🦷 歯科・クリニック
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-slate-700 border border-slate-100">
              🦴 接骨・整骨・鍼灸
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-slate-700 border border-slate-100">
              💆‍♀️ エステ・サロン
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-slate-700 border border-slate-100">
              💇‍♂️ 理髪・美容院
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-[10px] font-bold text-slate-700 border border-slate-100">
              🏋️‍♂️ パーソナルジム
            </span>
          </div>
        </div>
      </div>

      {/* ── メインビジュアル（画像を拡大・カレンダー枠を濃く強調） ── */}
      <div className="px-10 py-1 relative z-10 flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-[670px] h-[370px]">
          {/* 背景カード: 管理画面タイムライン (濃いヘッダーと枠線でくっきり際立たせる) */}
          <div className="absolute top-0 right-0 w-[540px] rounded-2xl overflow-hidden bg-white border-2 border-slate-800">
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-1.5 font-mono text-[11px] text-slate-200">予約台帳・タイムライン管理（スタッフ別カレンダー同期）</span>
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-teal-600 text-white rounded-md font-bold">LIVE同期</span>
            </div>
            <img
              src={CROPPED.timeline}
              alt="管理画面タイムライン"
              className="w-full h-[245px] object-cover object-top"
            />
          </div>

          {/* 前面カード: お客様予約コンシェルジュチャット（スマホ風ベゼル） */}
          <div className="absolute -bottom-1 left-2 w-[295px] rounded-3xl overflow-hidden bg-slate-900 border-2 border-teal-500">
            <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5 min-w-0">
                <Smartphone size={14} className="text-teal-400 shrink-0" />
                <span className="text-xs truncate">即レスAIコンシェルジュ</span>
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-teal-500 text-white rounded-full font-bold shrink-0 ml-1">24h即レス</span>
            </div>
            <img
              src={CROPPED.aiChat}
              alt="AI予約チャット"
              className="w-full h-[255px] object-cover object-top"
            />
          </div>

          {/* 注目フローティングバッジ */}
          <div className="absolute bottom-4 right-3 bg-white p-3 rounded-2xl border-2 border-teal-500/30 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold">
              <Clock size={18} />
            </div>
            <div>
              <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <span>予約完了までわずか20秒</span>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-500 font-medium">LINE・WEBから離脱知らずの即確定</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 主要な特徴（3つの大型ピクトカード・文字サイズ拡大） ── */}
      <div className="px-10 pb-7 z-10 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          {/* 特徴 1 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-teal-100/90 min-h-[110px]">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-1">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                24時間 AI即レス予約
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                LINE・WEBから対話形式で20秒完結。夜間・休日の取りこぼしを解消。
              </p>
            </div>
          </div>

          {/* 特徴 2 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-emerald-100/90 min-h-[110px]">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                スタッフ別タイムライン
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Google等カレンダーと双方向連動。スタッフ個別の空き枠・シフトを自動同期。
              </p>
            </div>
          </div>

          {/* 特徴 3 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-cyan-100/90 min-h-[110px]">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-1">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">
                店舗ブランド最適化
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                6色のテーマカラーと業種別文言（患者様/お客様）を自由カスタマイズ。
              </p>
            </div>
          </div>
        </div>

        {/* フッター帯 */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-mono font-bold text-teal-700">CONNECT Smart DX | PAGE 01</span>
          <span>開発・提供元：Creative System Design</span>
        </div>
      </div>
    </div>
  );
}

// ===================================================================================
// PAGE 2: お客様/患者様体験 (Customer Experience)
// ===================================================================================
function Page2Customer({ isSpread = false }) {
  return (
    <div
      className={`leaflet-page bg-white text-slate-800 relative overflow-hidden flex flex-col justify-between ${
        isSpread ? 'w-[210mm] h-[296.5mm]' : 'w-[210mm] h-[296.5mm] rounded-2xl print:rounded-none'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* ── ページヘッダー ── */}
      <div className="px-10 pt-8 pb-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
              PATIENT & CLIENT EXPERIENCE
            </span>
            <span className="text-xs font-bold text-slate-400">患者様・お客様の体験フロー</span>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">P.2 / CONNECT</span>
        </div>

        <div className="mt-2.5">
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            「待たせない・迷わない」 スマホで完結する次世代予約体験
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            専用アプリ不要。LINEやブラウザから3タップで最短20秒予約が完了。ストレスを感じさせないスムーズな設計です。
          </p>
        </div>
      </div>

      {/* ── 4つの予約ステップ (2x2 グリッド・縦長大型画像・グレー枠・影なし) ── */}
      <div className="px-10 py-3.5 flex-1 grid grid-cols-2 gap-4">
        {/* STEP 1: ワンタップログイン */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                STEP 01
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                パスワード不要で簡単
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              多彩なログイン ＆ カルテ照合
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              LINE・メール・Apple ID・Googleに対応。「新患」「再診」を選んでワンタップログイン。カルテ番号や登録情報と自動照合。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                LINEワンタップ
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                メール
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                Apple ID
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                Google
              </span>
            </div>
          </div>
          {/* 全ボタンが完全に収まるようアスペクト比を最適化 */}
          <div className="mt-2 rounded-xl overflow-hidden bg-slate-900/95 flex items-center justify-center h-[240px] p-2 border border-slate-800">
            <img
              src={CROPPED.authModal}
              alt="お客様認証モーダル（全ログイン対応）"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* STEP 2: AI即レスコンシェルジュ */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                STEP 02
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                待ち時間ゼロの即時応答
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              即レスAIチャットで症状選択
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              「歯が痛い」「定期検診」「相談」など分かりやすいカードからタップ問診。自由記述にも自然に応答し所要時間を自動判定。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                事前問診データ自動連携
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                所要時間自動アサイン
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center h-[240px] border border-slate-800">
            <img
              src={CROPPED.aiChat}
              alt="AI対話予約チャット"
              className="w-full h-full object-cover object-bottom"
            />
          </div>
        </div>

        {/* STEP 3: スマート空き枠提案 */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                STEP 03
              </span>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                休診日・時間をAIが自動除外
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              空き枠タップで即時予約完了
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              リアルタイムの空き枠候補がチャット内に一覧表示。希望の枠をタップするだけで即確定。仮予約待ちの煩わしさがありません。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                最短日時ワンタップ即決
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">
                二重予約完全防止
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center h-[240px] border border-slate-800">
            <img
              src={CROPPED.slotSelect}
              alt="空き枠提案カード"
              className="w-full h-full object-cover object-bottom"
            />
          </div>
        </div>

        {/* STEP 4: 自動リマインド＆カレンダー登録 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs font-mono">
                STEP 04
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                ドタキャン防止＆来院率向上
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              完了通知 ＆ カレンダー自動登録
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              予約完了通知が即時送信され、スマホのカレンダーにワンタップ登録。前日のLINE・メール通知で「うっかり忘れ」を確実に防ぎます。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold">
                無断キャンセル 0件へ
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-teal-600 text-white font-bold">
                前日18:00 LINE・メール通知
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl bg-gradient-to-b from-teal-50/60 to-slate-50 p-3 flex flex-col justify-between h-[240px] border border-teal-100/60">
            {/* LINE風リマインド通知カード */}
            <div className="bg-white rounded-xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-white shrink-0 font-bold text-[10px]">
                LINE
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold text-slate-700">CONNECT公式 予約センター</span>
                  <span className="font-mono text-[9px]">前日 18:00</span>
                </div>
                <div className="text-[11px] font-bold text-slate-900 leading-snug mt-0.5">
                  【ご予約確認】明日 09:30のご予約
                </div>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  明日 09:30〜 中村様（担当：院長 / 処置・診療）
                </p>
              </div>
            </div>

            {/* カレンダー連携通知 */}
            <div className="bg-white rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">
                  Cal
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-800">スマホカレンダーへ自動登録</div>
                  <div className="text-[9px] text-teal-700 font-medium">Google / Apple / Outlook対応</div>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                連携完了
              </span>
            </div>

            {/* ドタキャン抑止タグ */}
            <div className="text-[10px] text-teal-900 bg-teal-100/90 rounded-lg px-2.5 py-1.5 text-center font-bold">
              ✓ 事前通知で「予約のうっかり忘れ」を徹底根絶
            </div>
          </div>
        </div>
      </div>

      {/* ── ページフッター ── */}
      <div className="px-10 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono font-bold text-teal-700">CONNECT PLATFORM BROCHURE | PAGE 02</span>
        <span>患者様・お客様が「また使いたい」と思える感動的なUI設計</span>
      </div>
    </div>
  );
}

// ===================================================================================
// PAGE 3: 施設管理・スタッフ体験 (Facility Admin Experience)
// ===================================================================================
function Page3Facility({ isSpread = false }) {
  return (
    <div
      className={`leaflet-page bg-white text-slate-800 relative overflow-hidden flex flex-col justify-between ${
        isSpread ? 'w-[210mm] h-[296.5mm]' : 'w-[210mm] h-[296.5mm] rounded-2xl print:rounded-none'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* ── ページヘッダー ── */}
      <div className="px-10 pt-8 pb-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold uppercase tracking-wider">
              POWERFUL ADMIN SUITE
            </span>
            <span className="text-xs font-bold text-slate-400">医院・店舗の管理機能</span>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">P.3 / CONNECT</span>
        </div>

        <div className="mt-2.5">
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            医院・店舗の運営を力強く支える管理機能
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            日々のスケジュール調整からスタッフ管理、顧客カルテのインポート、お知らせ更新まで。現場スタッフが迷わず使える直感UIにこだわりました。
          </p>
        </div>
      </div>

      {/* ── 4つのキーポイント (2x2 グリッド・縦長大型画像・グレー枠・影なし) ── */}
      <div className="px-10 py-3.5 flex-1 grid grid-cols-2 gap-4">
        {/* KEY 01: 直感的D&Dタイムライン */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                KEY 01
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                日別・週別切替
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              スタッフ別 個別タイムライン（予約台帳）
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              院長・医師・衛生士・スタッフそれぞれの空き状況を一元表示。予約変更もD&Dで一瞬。「★新規受付」枠も一目で判別可能。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                ドラッグ＆ドロップ変更
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                新患受付ハイライト
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                カレンダー同期
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-white h-[240px] border border-slate-200">
            <img
              src={CROPPED.timeline}
              alt="タイムライン管理（予約台帳）"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        {/* KEY 02: 個別カレンダー連携 */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                KEY 02
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                担当制・表示順並替
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              スタッフ管理 ＆ カレンダー同期
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              医師・施術者ごとの役職登録と各種カレンダーID連携。新規患者の受入カレンダー指定や、表示順の並び替えも自由自在。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                各種カレンダー同期
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                担当制受入フラグ
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                表示順並び替え
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-white h-[240px] border border-slate-200">
            <img
              src={CROPPED.staffCalendar}
              alt="スタッフ管理＆カレンダー連携"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        {/* KEY 03: 顧客カルテ・メッセージ統合 */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                KEY 03
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                CSVインポート対応
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              電子カルテ・顧客情報 ＆ 担当制
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              受診履歴、VIP/一般ランク、電子カルテデータ一括インポート対応。再診患者の担当者指定や個別メッセージ送信も同一画面で完結。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                担当スタッフ指定
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                VIP/一般ランク
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                LINE/メール直接送信
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-white h-[240px] border border-slate-200">
            <img
              src={CROPPED.customer}
              alt="顧客カルテ管理"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        {/* KEY 04: フレキシブル店舗設定 */}
        <div className="p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-600 text-white font-black text-xs font-mono">
                KEY 04
              </span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                枠時間自動アサイン
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">
              診療時間・休診日 ＆ メニュー設定
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              曜日別営業時間、祝日自動判定、独自休診日を設定。初診・再診や処置メニューごとの所要時間、枠間隔（10〜60分）を柔軟に制御。
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                独自休診日設定
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                10〜60分枠間隔
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-white font-bold text-slate-700">
                お知らせ即時反映
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl overflow-hidden bg-white h-[240px] border border-slate-200">
            <img
              src={CROPPED.schedule}
              alt="店舗スケジュール設定"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>

      {/* ── ページフッター ── */}
      <div className="px-10 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono font-bold text-teal-700">CONNECT PLATFORM BROCHURE | PAGE 03</span>
        <span>スタッフの誰でもマニュアルなしで直感的に使いこなせる操作性</span>
      </div>
    </div>
  );
}

// ===================================================================================
// PAGE 4: 店舗メリット＆導入効果・裏表紙 (Benefits & Impact / Back Cover)
// ===================================================================================
function Page4Benefits({ isSpread = false }) {
  return (
    <div
      className={`leaflet-page bg-white text-slate-800 relative overflow-hidden flex flex-col justify-between ${
        isSpread ? 'w-[210mm] h-[296.5mm]' : 'w-[210mm] h-[296.5mm] rounded-2xl print:rounded-none'
      }`}
      style={{
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 40%, #f0fdf9 100%)',
      }}
    >
      {/* ── ページヘッダー ── */}
      <div className="px-10 pt-8 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold uppercase tracking-wider">
              WHY CONNECT & IMPACT
            </span>
            <span className="text-xs font-bold text-slate-400">導入効果・信頼性</span>
          </div>
          <span className="text-xs font-bold text-slate-400 font-mono">P.4 / CONNECT</span>
        </div>

        <div className="mt-2.5">
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            導入で得られる<span className="text-teal-600">3つの劇的インパクト</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            患者様・お客様の予約ストレスを解消しながら、煩雑なスケジュール調整・連絡業務を劇的に効率化。
          </p>
        </div>
      </div>

      {/* ── セクション 1: 3つの劇的インパクト（影・グレー枠完全除去） ── */}
      <div className="px-10 py-2.5 space-y-2">
        <div className="grid grid-cols-3 gap-3.5">
          {/* インパクト 1 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-teal-100/60">
            <div>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                予約獲得率
              </span>
              <div className="text-3xl font-black text-teal-600 font-mono my-1">
                +35<span className="text-sm font-sans font-bold text-slate-700">% UP</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mb-1">休診日・夜間の取りこぼし解消</div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                WEB予約の約60%は営業時間外に発生。24時間即時確定により機会損失を完全解消。
              </p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">
              ※24h AI自動応答により離脱率を低減
            </div>
          </div>

          {/* インパクト 2 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-emerald-100/60">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                受付電話工数
              </span>
              <div className="text-3xl font-black text-emerald-600 font-mono my-1">
                -70<span className="text-sm font-sans font-bold text-slate-700">% 削減</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mb-1">日程調整・問診を全自動化</div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                電話での日時調整や聞き取りをAIチャットが代替。スタッフが対面接客に集中できます。
              </p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">
              ※スタッフ1人あたり1日約45分削減
            </div>
          </div>

          {/* インパクト 3 */}
          <div className="p-4 rounded-2xl bg-white flex flex-col justify-between border border-cyan-100/60">
            <div>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">
                無断キャンセル
              </span>
              <div className="text-3xl font-black text-cyan-600 font-mono my-1">
                0<span className="text-sm font-sans font-bold text-slate-700">件へ</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mb-1">カレンダー連動＆通知リマインド</div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                スマホ標準カレンダー登録と前日18:00のLINE・メール通知で「うっかり忘れ」を防止。
              </p>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">
              ※前日リマインド配信による確実な来院促進
            </div>
          </div>
        </div>
      </div>

      {/* ── セクション 2: 柔軟なカスタマイズ ＆ 多彩な業種対応 ── */}
      <div className="px-10 py-2.5 space-y-2">
        <div className="grid grid-cols-2 gap-4">
          {/* 6色テーマカラー & 業種別文言 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Palette size={15} className="text-teal-600" />
              <span>店舗ブランド最適化（6色テーマ ＆ 業種別文言）</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              医院・店舗のインテリアに合わせてワンタッチでテーマカラーを選択。
            </p>
            <div className="grid grid-cols-6 gap-1.5 pt-0.5">
              {THEME_COLORS.map((c) => (
                <div key={c.id} className="text-center">
                  <div
                    className="w-full h-6 rounded-md"
                    style={{ backgroundColor: c.primary }}
                    title={c.name}
                  />
                  <span className="text-[8px] text-slate-500 truncate block mt-0.5 font-medium">
                    {c.name.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-1 text-[9px] font-mono">
              <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-white text-slate-700">
                <span className="text-teal-700 font-bold">医療・歯科</span>
                <span>患者様 / 診療・処置 / 医師・スタッフ</span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-white text-slate-700">
                <span className="text-rose-600 font-bold">サロン・エステ</span>
                <span>お客様 / 施術・メニュー / スタイリスト</span>
              </div>
            </div>
          </div>

          {/* 幅広い業種に柔軟フィット */}
          <div className="p-3.5 rounded-2xl bg-slate-50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Building2 size={15} className="text-teal-600" />
              <span>多彩な業種の予約・顧客管理にフィット</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              「メニュー」「所要時間」「スタッフ管理」を少し設定するだけで即座に稼働。
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white font-bold text-slate-700">
                <span>🦷</span> 歯科・デンタル
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white font-bold text-slate-700">
                <span>🦴</span> 接骨・整骨・鍼灸
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white font-bold text-slate-700">
                <span>💆‍♀️</span> エステ・リラク
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white font-bold text-slate-700">
                <span>💇‍♂️</span> 理髪・美容院
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── セクション 3: 堅牢なセキュリティ＆万全のサポート ── */}
      <div className="px-10 py-1.5">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-teal-50/90 border border-teal-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Lock size={15} />
            </div>
            <div>
              <div className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                <span>RLS行レベルセキュリティ</span>
                <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.2 rounded font-bold">完全分離</span>
              </div>
              <div className="text-[10px] text-teal-800 leading-snug mt-0.5">
                DB層で他院・他店舗のアクセスを物理遮断。個人情報・カルテの漏洩リスクをゼロに保護。
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-teal-50/90 border border-teal-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <HeartHandshake size={15} />
            </div>
            <div>
              <div className="text-xs font-black text-teal-950">導入・初期設定サポート</div>
              <div className="text-[10px] text-teal-800 leading-snug mt-0.5">
                既存顧客のCSV移行からカレンダー同期・メニュー設定まで専任スタッフが伴走。
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-teal-50/90 border border-teal-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Cloud size={15} />
            </div>
            <div>
              <div className="text-xs font-black text-teal-950">常時SSL ＆ クラウド運用</div>
              <div className="text-[10px] text-teal-800 leading-snug mt-0.5">
                全通信を暗号化。国内高信頼サーバー・自動バックアップ体制で24時間安全稼働。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── セクション 4: お問い合わせ＆デモ体験（高品位ディープティールカード） ── */}
      <div className="px-10 pb-7 space-y-2.5 z-10">
        <div
          className="p-5 rounded-2xl text-white flex items-center justify-between gap-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #042f2e 0%, #134e4a 50%, #0f766e 100%)',
          }}
        >
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/25 text-teal-300 text-[10px] font-bold">
              <CheckCircle2 size={13} className="text-teal-300" />
              <span>無料オンライン相談 ＆ デモ体験</span>
            </div>
            <h4 className="text-lg font-black text-white leading-tight">
              予約業務のゆとりを、あなたの医院・サロンに。
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-md">
              「自院の運用に合うか相談したい」「実際の操作感を試したい」など、お気軽にお問い合わせください。専門スタッフが丁寧にご案内いたします。
            </p>
            <div className="pt-1 flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-teal-500 text-white font-black text-[11px]">
                相談・デモ体験無料
              </span>
              <span className="text-[10px] text-teal-200">
                最短3営業日で店舗専用システムをスピード導入
              </span>
            </div>
          </div>

          {/* QRコード表示枠 (connect.png) */}
          <div className="flex flex-col items-center shrink-0">
            <div className="bg-white p-2 rounded-2xl flex items-center justify-center border-2 border-teal-400/30">
              <img
                src={CROPPED.qrCode}
                alt="CONNECT デモ体験 QRコード"
                className="w-[90px] h-[90px] object-contain"
              />
            </div>
            <span className="text-[10px] text-teal-100 font-bold mt-1.5 tracking-wider">
              デモ画面を体験
            </span>
          </div>
        </div>

        {/* 最下部会社情報＆フッター（ロゴのみ配置・指定文言＆URL除去） */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/site_logo2.png"
              alt="Creative System Design"
              className="h-6 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="font-mono text-slate-400">
            CONNECT Smart DX | PAGE 04
          </div>
        </div>
      </div>
    </div>
  );
}


