import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Search,
  Maximize2,
  Minimize2,
  Sparkles,
  UserCheck,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { checkInByQrCode } from '../../utils/reservationService';
import { getLabels } from '../../constants/labels';

/**
 * Web Audio API を用いたピッと鳴るスキャン成功電子音
 */
function playCheckInBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 2音の心地よいレジ風「ピピッ」音 (1320Hz -> 1760Hz)
    osc.frequency.setValueAtTime(1320, now);
    osc.frequency.setValueAtTime(1760, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  } catch (e) {
    // 音声再生がブロックされた場合は無視
  }
}

export default function QrCheckInScanner({
  facilityId,
  theme,
  industryType = 'medical',
  onCheckInSuccess,
  isModal = false,
  onClose,
}) {
  const labels = getLabels(industryType);
  const scannerContainerId = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const html5QrCodeRef = useRef(null);

  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'starting' | 'scanning' | 'permission_denied' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (外カメラ) | 'user' (内カメラ)
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 照合・チェックイン状態
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null); // { success, alreadyCheckedIn, reservation, message }
  const [recentCheckIns, setRecentCheckIns] = useState([]);

  // 手動入力検索State
  const [manualInput, setManualInput] = useState('');
  const [manualSearching, setManualSearching] = useState(false);

  // カメラ起動
  const startScanner = useCallback(async (selectedFacingMode) => {
    try {
      setCameraState('starting');
      setErrorMessage('');

      // 既存インスタンスの停止
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {}
      }

      const qrScanner = new Html5Qrcode(scannerContainerId.current);
      html5QrCodeRef.current = qrScanner;

      const config = {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        { facingMode: selectedFacingMode },
        config,
        async (decodedText) => {
          // スキャン成功時コールバック
          handleScannedText(decodedText);
        },
        () => {
          // スキャンフレーム毎の非認識時（通常無視）
        }
      );

      setCameraState('scanning');
    } catch (err) {
      console.warn('カメラ起動エラー:', err);
      const errStr = String(err).toLowerCase();
      if (errStr.includes('notallowed') || errStr.includes('permission')) {
        setCameraState('permission_denied');
        setErrorMessage('カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。');
      } else if (errStr.includes('notfound') || errStr.includes('device')) {
        setCameraState('error');
        setErrorMessage('カメラデバイスが見つかりませんでした。Webカメラが接続されているかご確認ください。');
      } else {
        setCameraState('error');
        setErrorMessage('カメラの起動に失敗しました。他のアプリでカメラが使用されていないかご確認ください。');
      }
    }
  }, []);

  // カメラ停止
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setCameraState('idle');
  }, []);

  // マウント時にカメラ起動、アンマウント時に停止
  useEffect(() => {
    startScanner(facingMode);
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  // カメラ切替（内カメラ / 外カメラ）
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // QRコード読み取り時の処理
  const handleScannedText = async (text) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 照合処理
      const result = await checkInByQrCode(text, facilityId);

      if (result.success) {
        if (!isMuted) {
          playCheckInBeepSound();
        }
        setCheckInResult(result);
        setRecentCheckIns((prev) => [result.reservation, ...prev.slice(0, 9)]);

        if (onCheckInSuccess) {
          onCheckInSuccess(result.reservation);
        }

        // 3.5秒後に次のスキャンのためにリザルトカードを自動クローズ
        setTimeout(() => {
          setCheckInResult(null);
          setIsProcessing(false);
        }, 3500);
      } else {
        // エラー結果
        setCheckInResult(result);
        setTimeout(() => {
          setCheckInResult(null);
          setIsProcessing(false);
        }, 3000);
      }
    } catch (e) {
      console.error('チェックイン実行エラー:', e);
      setIsProcessing(false);
    }
  };

  // 手動検索によるチェックイン
  const handleManualCheckIn = async (e) => {
    e?.preventDefault();
    if (!manualInput.trim() || manualSearching) return;

    setManualSearching(true);
    try {
      const result = await checkInByQrCode(manualInput.trim(), facilityId);
      setCheckInResult(result);

      if (result.success) {
        if (!isMuted) playCheckInBeepSound();
        setRecentCheckIns((prev) => [result.reservation, ...prev.slice(0, 9)]);
        if (onCheckInSuccess) onCheckInSuccess(result.reservation);
        setManualInput('');
      }

      setTimeout(() => {
        setCheckInResult(null);
        setManualSearching(false);
      }, 3500);
    } catch (err) {
      setManualSearching(false);
    }
  };

  // デモ検証用: サンプルQRコード読み取りを模倣実行
  const triggerDemoScan = (sampleType = 'regular') => {
    if (sampleType === 'regular') {
      handleScannedText(JSON.stringify({
        type: 'inteve_checkin',
        phone: '090-7549-8513',
        customer_code: 'PT-1000',
        name: '大塚 一樹',
      }));
    } else {
      handleScannedText(JSON.stringify({
        type: 'inteve_checkin',
        phone: '090-1234-5678',
        customer_code: 'PT-1001',
        name: '田中 浩二',
      }));
    }
  };

  return (
    <div
      className={`relative bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
    >
      {/* 受付端末ヘッダーバー */}
      <div className="bg-slate-900/90 backdrop-blur-md px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20"
            style={{ backgroundColor: theme?.primary || '#E06A3B' }}
          >
            <Camera size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-white font-serif">
                QRコード自動受付・チェックイン端末
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                受付中
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              患者様のスマートフォン画面のQRコードをカメラにかざしてください
            </p>
          </div>
        </div>

        {/* コントロールボタン群 */}
        <div className="flex items-center gap-2">
          {/* 消音切替 */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title={isMuted ? '音声をオンにする' : '音声をミュートにする'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-emerald-400" />}
          </button>

          {/* カメラ前後切替 */}
          <button
            onClick={toggleFacingMode}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title={`カメラ切替（現在: ${facingMode === 'environment' ? '外カメラ' : '内カメラ'}）`}
          >
            <RefreshCw size={16} />
          </button>

          {/* 全画面Kioskモード切替 */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60 hidden sm:block"
            title={isFullscreen ? '全画面を解除' : '全画面受付モード'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* モーダル時のみ閉じるボタン */}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer border border-slate-700/60 ml-2"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* 左側: カメラプレビュー & スキャンエリア */}
        <div className="lg:col-span-8 relative bg-black flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px] p-4 overflow-hidden">
          {/* html5-qrcodeのマウント先div */}
          <div
            id={scannerContainerId.current}
            className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-inner relative"
          />

          {/* スキャン枠・ガイドオーバーレイ（カメラ動作中のみ） */}
          {cameraState === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* 四隅のコーナーターゲット */}
              <div className="w-[260px] h-[260px] relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-xs" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-xs" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-xs" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-xs" />

                {/* 上下に動くグリーンスキャンレーザー */}
                <motion.div
                  className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                  animate={{
                    y: [0, 256, 0],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>

              <p className="text-xs font-bold text-emerald-300 mt-4 tracking-wider bg-slate-900/80 px-4 py-1.5 rounded-full border border-emerald-500/30 shadow-lg flex items-center gap-1.5">
                <Sparkles size={13} className="animate-spin" />
                QRコードを中央の枠に合わせてください
              </p>
            </div>
          )}

          {/* カメラ準備中オーバーレイ */}
          {cameraState === 'starting' && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-200">カメラを起動しています...</p>
              <p className="text-xs text-slate-500 mt-1">ブラウザのカメラ使用許可を確認してください</p>
            </div>
          )}

          {/* カメラ権限拒否・エラーオーバーレイ */}
          {(cameraState === 'permission_denied' || cameraState === 'error') && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
                <AlertCircle size={28} />
              </div>
              <h4 className="text-base font-bold text-white mb-2">カメラを起動できませんでした</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                {errorMessage || 'カメラの使用権限が許可されていないか、Webカメラが見つかりません。'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button
                  onClick={() => startScanner(facingMode)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RefreshCw size={14} />
                  カメラを再試行
                </button>
              </div>
            </div>
          )}

          {/* スキャン結果（成功／警告）のアニメーションオーバーレイ */}
          <AnimatePresence>
            {checkInResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-x-4 top-4 bottom-4 md:inset-8 z-30 flex items-center justify-center pointer-events-auto"
              >
                <div
                  className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border backdrop-blur-xl ${
                    checkInResult.success
                      ? checkInResult.alreadyCheckedIn
                        ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
                        : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                      : 'bg-rose-950/90 border-rose-500/50 text-rose-100'
                  }`}
                >
                  {/* アイコン & タイトル */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        checkInResult.success
                          ? checkInResult.alreadyCheckedIn
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {checkInResult.success ? (
                        <CheckCircle2 size={28} />
                      ) : (
                        <AlertCircle size={28} />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">
                        {checkInResult.success
                          ? checkInResult.alreadyCheckedIn
                            ? 'ALREADY CHECKED IN'
                            : 'CHECK-IN SUCCESS'
                          : 'CHECK-IN FAILED'}
                      </span>
                      <h4 className="text-lg font-bold font-serif leading-tight">
                        {checkInResult.message}
                      </h4>
                    </div>
                  </div>

                  {/* 予約情報カード（成功時） */}
                  {checkInResult.reservation && (
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <User size={13} /> {labels.customer}名
                        </span>
                        <span className="font-bold text-base text-white">
                          {checkInResult.reservation.customer_name} 様
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                            <Clock size={11} /> 予約時間
                          </span>
                          <span className="font-bold text-sm text-emerald-300 font-mono">
                            {checkInResult.reservation.start_time} - {checkInResult.reservation.end_time}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                            <UserCheck size={11} /> 担当スタッフ
                          </span>
                          <span className="font-bold text-white">
                            {checkInResult.reservation.staff_name}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{labels.serviceMenu}</span>
                        <span className="text-white font-medium">
                          {checkInResult.reservation.menu_name}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        setCheckInResult(null);
                        setIsProcessing(false);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
                    >
                      閉じる (自動復帰します)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右側: 手動チェックイン & 直近受付履歴 & テストボタン */}
        <div className="lg:col-span-4 bg-slate-900 p-5 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* 1. 手動検索受付（カメラ不調時・診察券コード入力） */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Search size={14} className="text-indigo-400" />
                手動チェックイン（番号入力）
              </label>
              <form onSubmit={handleManualCheckIn} className="flex gap-2">
                <input
                  type="text"
                  placeholder="診察券番号 (PT-1000) または電話番号"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={manualSearching || !manualInput.trim()}
                  className="h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all cursor-pointer shrink-0 shadow-sm"
                >
                  受付
                </button>
              </form>
              <p className="text-[10px] text-slate-500">
                患者様の診察券コード（例: PT-1000）またはご予約時のお電話番号を入力して即時受付できます。
              </p>
            </div>

            {/* 2. デモ検証・テスト用クイックスキャンボタン */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  テスト用クイック受付
                </span>
                <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40">
                  DEMO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                実機のQRコードが手元にない場合でも、ワンタップでスキャン動作をシミュレートできます：
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerDemoScan('regular')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer text-left"
                >
                  <span className="block text-[10px] text-indigo-400 font-mono">PT-1000</span>
                  大塚 一樹 様
                </button>
                <button
                  type="button"
                  onClick={() => triggerDemoScan('new')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer text-left"
                >
                  <span className="block text-[10px] text-emerald-400 font-mono">PT-1001</span>
                  田中 浩二 様
                </button>
              </div>
            </div>

            {/* 3. 本日の受付完了履歴 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-400" />
                  直近の受付完了一覧
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {recentCheckIns.length} 件
                </span>
              </h4>

              {recentCheckIns.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-slate-500 text-xs">
                  まだ受付された患者様はいません
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {recentCheckIns.map((res, idx) => (
                    <div
                      key={res.id || idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{res.customer_name} 様</span>
                          <span className="text-[10px] font-mono text-slate-400">({res.customer_code || '再診'})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {res.start_time} 〜 / 担当: {res.staff_name}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800/40">
                        受付済
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* フッター補足説明 */}
          <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-indigo-400" />
              INTEVE CONNECT 受付端末
            </span>
            <span>リアルタイム台帳同期中</span>
          </div>
        </div>
      </div>
    </div>
  );
}
