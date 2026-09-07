import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Mail,
  Phone,
  User,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  QrCode,
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { matchPatient, findPatientByLineUserId, registerOrLinkLinePatient } from '../utils/patientService';
import { getFacilityProfile } from '../utils/facilityService';
import {
  initLiff,
  getLineProfile,
  loginWithLine,
  logoutLine,
  setSimulatedLineProfile,
  clearSimulatedLineProfile,
  DEV_MOCK_LINE_PROFILES,
  getLineAddFriendUrl,
} from '../utils/lineAuthService';
import { getLabels } from '../constants/labels';

export default function AuthModal({
  isOpen,
  onAuthenticated,
  patientType: initialPatientType = 'new',
  industryType = 'medical',
  isAuthEnabled = false,
  facilityId = null,
}) {
  const labels = getLabels(industryType);
  const [patientType, setPatientType] = useState(initialPatientType); // 'new' | 'returning'
  const [authMethod, setAuthMethod] = useState(null); // 'line' | 'apple' | 'google' | 'email' | null
  const [lineOfficialId, setLineOfficialId] = useState('@776cdsuy');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [matchResult, setMatchResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showLineQR, setShowLineQR] = useState(false);

  // LINE認証ステート
  const [currentLineProfile, setCurrentLineProfile] = useState(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [showLineDevSelector, setShowLineDevSelector] = useState(false);
  const [lineMatchStatus, setLineMatchStatus] = useState(null); // 'checking' | 'found' | 'not_found' | null

  // 施設情報（line_official_id）取得
  useEffect(() => {
    getFacilityProfile().then((profile) => {
      if (profile?.line_official_id) {
        setLineOfficialId(profile.line_official_id);
      }
    });
  }, []);

  // LIFF & LINEプロフィールの初期チェック（ログイン完了後の自動照合を含む）
  useEffect(() => {
    async function checkLiff() {
      const initRes = await initLiff();
      setIsLiffReady(initRes.isAvailable);

      // 実機LIFFまたはログイン完了後のプロフィールを取得して自動照合
      if (initRes.isAvailable && !initRes.isMock) {
        const profile = await getLineProfile();
        if (profile && profile.userId) {
          setCurrentLineProfile(profile);
          setAuthMethod('line');
          verifyLineUser(profile.userId, profile);
        }
      }
    }
    checkLiff();
  }, []);

  const lineAddFriendUrl = getLineAddFriendUrl(lineOfficialId);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lineAddFriendUrl)}`;

  // ブラウザ保存の前回情報（再診用プレビュー）
  useEffect(() => {
    try {
      const saved = localStorage.getItem('last_patient_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.phone) {
          setFormData((prev) => ({
            ...prev,
            name: parsed.name,
            phone: parsed.phone,
            email: parsed.email || '',
          }));
        }
      }
    } catch (e) {}
  }, []);

  // LINE ユーザーIDの照合処理
  const verifyLineUser = async (lineUserId, profile) => {
    setIsVerifying(true);
    setLineMatchStatus('checking');

    try {
      const lookup = await findPatientByLineUserId(lineUserId, facilityId);
      if (lookup.isFound && lookup.record) {
        setLineMatchStatus('found');
        setMatchResult(lookup);
        setFormData((prev) => ({
          ...prev,
          name: lookup.record.name || profile.displayName || '',
          phone: lookup.record.phone || '',
          email: lookup.record.email || '',
        }));
      } else {
        // 未登録のLINEユーザー（初回お名前・電話番号入力へ誘導）
        setLineMatchStatus('not_found');
        setMatchResult(null);
        setFormData((prev) => ({
          ...prev,
          name: prev.name || profile.displayName || '',
        }));
      }
    } catch (err) {
      console.warn('LINE検証エラー:', err);
      setLineMatchStatus('not_found');
    } finally {
      setIsVerifying(false);
    }
  };

  // 照合済みLINE患者として入室
  const handleProceedWithVerifiedLineUser = () => {
    if (!matchResult?.record || !currentLineProfile) return;

    onAuthenticated({
      ...matchResult.record,
      name: matchResult.record.name || currentLineProfile.displayName,
      phone: matchResult.record.phone,
      email: matchResult.record.email || 'line-user@line.me',
      authProvider: 'line',
      isReturning: true,
      patientType: 'returning',
      line_user_id: currentLineProfile.userId,
      line_display_name: currentLineProfile.displayName,
      line_picture_url: currentLineProfile.pictureUrl,
    });
  };

  // ⚡ デモモード用：認証スルー実行
  const handleDemoBypass = async (isRet = false) => {
    const defaultName = isRet ? (formData.name || '大塚 一樹') : `デモ${labels.customerShort}`;
    const defaultPhone = isRet ? (formData.phone || '090-7549-8513') : '090-0000-0000';
    let result = null;
    if (isRet) {
      result = await matchPatient(defaultName, defaultPhone);
    }

    onAuthenticated({
      ...(result || {}),
      name: defaultName,
      phone: defaultPhone,
      email: isRet ? 'otsuka.demo@example.com' : 'demo-guest@example.com',
      authProvider: 'demo_bypass',
      isReturning: isRet,
      patientType: isRet ? 'returning' : 'new',
    });
  };

  // LINE アカウントをシミュレーターで選択した時
  const handleSelectDevLineAccount = (profile) => {
    setSimulatedLineProfile(profile);
    setCurrentLineProfile(profile);
    setShowLineDevSelector(false);
    verifyLineUser(profile.userId, profile);
  };

  // プロバイダ選択時の処理
  const handleSelectProvider = async (provider) => {
    setAuthMethod(provider);
    const isRet = patientType === 'returning';

    // 認証OFF（デモモード）の場合は即時ダミー認証でスルー
    if (!isAuthEnabled) {
      if (provider === 'line') {
        const patientName = isRet ? (formData.name || '大塚 一樹') : `LINE ゲスト${labels.customerShort}`;
        const patientPhone = isRet ? (formData.phone || '090-7549-8513') : '090-0000-0000';
        let result = null;
        if (isRet) {
          result = await matchPatient(patientName, patientPhone);
        }
        onAuthenticated({
          ...(result || {}),
          name: patientName,
          phone: patientPhone,
          email: isRet ? 'line-user@line.me' : 'guest-line@line.me',
          authProvider: 'line',
          isReturning: isRet,
          patientType: isRet ? 'returning' : 'new',
        });
        return;
      } else if (provider === 'apple') {
        const patientName = isRet ? (formData.name || '佐藤 健') : `Apple ゲスト${labels.customerShort}`;
        const patientPhone = isRet ? (formData.phone || '080-1234-5678') : '090-1111-2222';
        let result = null;
        if (isRet) {
          result = await matchPatient(patientName, patientPhone);
        }
        onAuthenticated({
          ...(result || {}),
          name: patientName,
          phone: patientPhone,
          email: isRet ? 'sato.apple@icloud.com' : 'hanako.apple@icloud.com',
          authProvider: 'apple',
          isReturning: isRet,
          patientType: isRet ? 'returning' : 'new',
        });
        return;
      } else if (provider === 'google') {
        const patientName = isRet ? (formData.name || '大塚 一樹') : `Google ゲスト${labels.customerShort}`;
        const patientPhone = isRet ? (formData.phone || '090-7549-8513') : '090-3333-4444';
        let result = null;
        if (isRet) {
          result = await matchPatient(patientName, patientPhone);
        }
        onAuthenticated({
          ...(result || {}),
          name: patientName,
          phone: patientPhone,
          email: isRet ? 'otsuka@gmail.com' : 'suzuki@gmail.com',
          authProvider: 'google',
          isReturning: isRet,
          patientType: isRet ? 'returning' : 'new',
        });
        return;
      } else if (provider === 'email') {
        if (patientType === 'returning' && formData.name && formData.phone) {
          matchPatient(formData.name, formData.phone).then(setMatchResult);
        }
      }
      return;
    }

    // 認証ON（厳格認証モード）
    if (provider === 'line') {
      if (currentLineProfile) {
        verifyLineUser(currentLineProfile.userId, currentLineProfile);
      } else {
        const liffRes = await initLiff();
        if (liffRes.isAvailable && !liffRes.isMock) {
          if (liffRes.isLoggedIn) {
            const profile = await getLineProfile();
            if (profile && profile.userId) {
              setCurrentLineProfile(profile);
              verifyLineUser(profile.userId, profile);
              return;
            }
          }
          // 本番LIFF / LINEログイン画面を起動
          await loginWithLine();
          return;
        }
        // ローカル環境等でLIFF未接続時のフォールバック
        setShowLineDevSelector(true);
      }
    } else {
      // メール、Apple、Google：本人確認フォームを展開してお名前と電話番号を入力
      if (patientType === 'returning' && formData.name && formData.phone) {
        matchPatient(formData.name, formData.phone).then(setMatchResult);
      }
    }
  };

  const handlePhoneOrNameChange = async (field, val) => {
    const nextData = { ...formData, [field]: val };
    setFormData(nextData);

    if (patientType === 'returning' && (nextData.phone.length >= 10 || nextData.name.length >= 2)) {
      const res = await matchPatient(nextData.name, nextData.phone);
      setMatchResult(res);
    } else {
      setMatchResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const isRet = patientType === 'returning';
    setIsVerifying(true);
    let result = null;

    if (currentLineProfile && authMethod === 'line') {
      // LINE連携ユーザーの登録/紐付け
      result = await registerOrLinkLinePatient({
        lineUserId: currentLineProfile.userId,
        lineDisplayName: currentLineProfile.displayName,
        linePictureUrl: currentLineProfile.pictureUrl,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        facilityId,
        patientType,
      });
    } else {
      if (isRet) {
        result = await matchPatient(formData.name, formData.phone);
      }
    }
    setIsVerifying(false);

    try {
      localStorage.setItem(
        'last_patient_info',
        JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        })
      );
    } catch (e) {}

    onAuthenticated({
      ...(result?.record || result || {}),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || 'user@example.com',
      authProvider: currentLineProfile ? 'line' : (authMethod || 'email'),
      isReturning: isRet || Boolean(result?.isReturning),
      patientType: isRet ? 'returning' : 'new',
      line_user_id: currentLineProfile?.userId || null,
      line_display_name: currentLineProfile?.displayName || null,
      line_picture_url: currentLineProfile?.pictureUrl || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 md:p-7 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shadow-lg shadow-green-900/30">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-mono uppercase tracking-widest block">
                {labels.id.toUpperCase()} VERIFICATION
              </span>
              <h2 className="text-2xl font-bold font-serif">{labels.authModalTitle}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            ご希望のログイン方法をお選びください。アカウント連携でスムーズにご予約いただけます。
          </p>
        </div>

        {/* 認証OFF時のみデモモード告知バナーを表示（ON時は本番運用レイアウトとして非表示） */}
        {!isAuthEnabled && (
          <div className="px-6 pt-4 pb-1">
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 shadow-2xs">
              <Sparkles className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs space-y-0.5">
                <div className="font-bold flex items-center gap-2">
                  <span>⚡ 認証スルー設定中（デモモード）</span>
                  <span className="bg-amber-200/80 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    SuperAdmin: OFF
                  </span>
                </div>
                <p className="text-amber-750 text-[11px] leading-relaxed">
                  認証画面はダミーでスルー可能です。下の「スルー入室」ボタンまたは各アイコンを押すと即座に入室できます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 顧客/患者区分セレクター（新規 / 再来） */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-3 mt-1">
          <span className="text-sm font-bold text-slate-700">
            {labels.patientType}:
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPatientType('new');
                setMatchResult(null);
              }}
              className={`px-5 py-1.5 text-xs md:text-sm rounded-full font-bold transition-all cursor-pointer ${
                patientType === 'new'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-emerald-500'
              }`}
            >
              {labels.firstVisitShort}
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientType('returning');
                if (formData.name && formData.phone) {
                  matchPatient(formData.name, formData.phone).then(setMatchResult);
                }
              }}
              className={`px-5 py-1.5 text-xs md:text-sm rounded-full font-bold transition-all cursor-pointer ${
                patientType === 'returning'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
              }`}
            >
              {labels.returningVisitShort}
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          {/* ⚡ OFF時専用：1-Tap スルー入室ボタン */}
          {!isAuthEnabled && (
            <button
              type="button"
              onClick={() => handleDemoBypass(patientType === 'returning')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl text-sm md:text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Sparkles size={20} />
              <span>
                {patientType === 'returning'
                  ? '⚡ デモ再診患者としてスルー入室（認証スキップ）'
                  : '⚡ デモ新規患者としてスルー入室（認証スキップ）'}
              </span>
              <ArrowRight size={18} />
            </button>
          )}

          {/* 1. 認証方法を選択（LINE, Apple, Google, メール の4つ） */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-wider block">
                ログイン・予約方法を選択
              </label>
              <button
                type="button"
                onClick={() => setShowLineQR(!showLineQR)}
                className="text-xs text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <QrCode size={14} />
                <span>{showLineQR ? 'QRを閉じる' : 'PC用LINE友だちQR'}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* LINE */}
              <button
                type="button"
                onClick={() => handleSelectProvider('line')}
                className={`p-3.5 md:p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-xs md:text-sm font-bold cursor-pointer active:scale-95 shadow-xs ${
                  authMethod === 'line'
                    ? 'border-[#06C755] bg-emerald-50 text-[#06C755] ring-2 ring-[#06C755]/20'
                    : 'border-slate-200 hover:border-[#06C755] bg-white hover:bg-emerald-50/40 text-slate-800'
                }`}
              >
                <MessageCircle size={24} className="text-[#06C755]" />
                <span>LINE</span>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSelectProvider('apple')}
                className="p-3.5 md:p-4 rounded-2xl border border-slate-200 hover:border-black bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2 transition-all text-xs md:text-sm font-bold cursor-pointer active:scale-95 shadow-xs"
              >
                <svg className="w-6 h-6 fill-current text-slate-900" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.45c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.7-1.12 1.83-.98 2.94 1.08.08 2.18-.55 2.79-1.28z" />
                </svg>
                <span className="text-slate-800">Apple</span>
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => handleSelectProvider('google')}
                className="p-3.5 md:p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 flex flex-col items-center justify-center gap-2 transition-all text-xs md:text-sm font-bold cursor-pointer active:scale-95 shadow-xs"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-slate-800">Google</span>
              </button>

              {/* Email / 手動入力 */}
              <button
                type="button"
                onClick={() => handleSelectProvider('email')}
                className={`p-3.5 md:p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all text-xs md:text-sm font-bold cursor-pointer active:scale-95 shadow-xs ${
                  authMethod === 'email'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Mail size={22} className={authMethod === 'email' ? 'text-white' : 'text-slate-600'} />
                <span>メール入力</span>
              </button>
            </div>

            {/* LINE QRコード表示（PCの場合） */}
            {showLineQR && (
              <div className="text-center py-4 space-y-2.5 bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100">
                <img
                  src={qrCodeUrl}
                  alt="LINE QR"
                  className="w-36 h-36 mx-auto rounded-xl border border-slate-100 shadow-xs"
                />
                <p className="text-xs text-slate-600 font-medium">
                  LINEアプリのカメラで読み取って友だち追加
                </p>
                <a
                  href={lineAddFriendUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold underline"
                >
                  <span>LINE友だち追加リンクを開く</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* 🟢 LINE認証シミュレーター / アカウント選択モーダル（開発用） */}
          <AnimatePresence>
            {isAuthEnabled && showLineDevSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <MessageCircle size={16} className="text-[#06C755]" />
                    <span>【開発用】LINEアカウント接続シミュレーター</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLineDevSelector(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    閉じる
                  </button>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  本番LIFF ID発行前のテスト用です。テストしたいLINEアカウントを選択してください：
                </p>

                <div className="space-y-2">
                  {DEV_MOCK_LINE_PROFILES.map((mock) => (
                    <button
                      key={mock.userId}
                      type="button"
                      onClick={() => handleSelectDevLineAccount(mock)}
                      className="w-full p-2.5 rounded-xl bg-white hover:bg-emerald-100/50 border border-emerald-200 flex items-center justify-between gap-3 text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={mock.pictureUrl}
                          alt="avatar"
                          className="w-8 h-8 rounded-full border border-emerald-300"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">{mock.displayName}</div>
                          <div className="text-[10px] font-mono text-slate-500">ID: {mock.userId.substring(0, 16)}...</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        mock.isPresetReturning
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {mock.isPresetReturning ? '登録済・再診' : '新規・初診'}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🟢 LINE認証ステータス表示（照合成功時 or 未登録時の案内） */}
          {isAuthEnabled && currentLineProfile && (
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentLineProfile.pictureUrl}
                  alt="avatar"
                  className="w-9 h-9 rounded-full border-2 border-[#06C755] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    <span>{currentLineProfile.displayName}</span>
                    <span className="text-[10px] bg-[#06C755] text-white px-1.5 py-0.2 rounded font-bold">
                      LINE連携中
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    ID: {currentLineProfile.userId}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  logoutLine();
                  clearSimulatedLineProfile();
                  setCurrentLineProfile(null);
                  setLineMatchStatus(null);
                  if (!isLiffReady) {
                    setShowLineDevSelector(true);
                  }
                }}
                className="text-[11px] text-slate-300 hover:text-white underline shrink-0 cursor-pointer"
              >
                アカウント切替
              </button>
            </div>
          )}

          {/* LINE ID照合中アニメーション */}
          {lineMatchStatus === 'checking' && (
            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center gap-3 animate-pulse">
              <RefreshCw size={18} className="animate-spin text-emerald-600" />
              <span>Supabaseで患者カルテ情報を照合中...</span>
            </div>
          )}

          {/* LINE 照合成功（確認ボタンを表示して明示的に進む） */}
          {lineMatchStatus === 'found' && matchResult?.record && (
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={22} className="text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-blue-950">
                    {matchResult.record.name} 様 としてLINE照合が完了しました
                  </div>
                  <div className="text-[11px] text-blue-750 mt-0.5">
                    カルテ番号: {matchResult.customerCode || '登録済'} / 電話番号: {matchResult.record.phone || '登録済'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedWithVerifiedLineUser}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all hover:scale-105"
              >
                <span>予約画面へ進む</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* フォーム入力欄：
              - authMethod === 'email' / 'apple' / 'google' の場合
              - または isAuthEnabled で LINE選択 かつ lineMatchStatus === 'not_found'（未登録LINEユーザーの初回情報入力）の場合 */}
          <AnimatePresence>
            {(authMethod === 'email' || authMethod === 'apple' || authMethod === 'google' || (isAuthEnabled && authMethod === 'line' && lineMatchStatus === 'not_found')) && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4 pt-2 border-t border-slate-100"
              >
                {authMethod === 'line' && lineMatchStatus === 'not_found' && (
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      初回LINE予約です。カルテ作成・予約確認のため、お名前と電話番号を入力してください（次回から自動認証されます）。
                    </span>
                  </div>
                )}
                {isAuthEnabled && (authMethod === 'apple' || authMethod === 'google') && (
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs flex items-start gap-2">
                    <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      {authMethod === 'apple' ? 'Apple' : 'Google'} アカウント連携：ご本人確認のため、お名前と電話番号を入力してください。
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs md:text-sm font-bold text-slate-700 block mb-1">
                    お名前 <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="山田 太郎"
                      value={formData.name}
                      onChange={(e) => handlePhoneOrNameChange('name', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs md:text-sm font-bold text-slate-700 block mb-1">
                    電話番号（照合用） <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="090-1234-5678"
                      value={formData.phone}
                      onChange={(e) => handlePhoneOrNameChange('phone', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs md:text-sm font-bold text-slate-700 block mb-1">
                    メールアドレス（予約確認用）
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="example@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* 新患の案内 */}
                {patientType === 'new' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs md:text-sm flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{labels.firstVisit}（新規アカウントを作成してLINEと連携します）</span>
                  </div>
                )}

                {/* 再診/リピートで照合できた場合のバッジ */}
                {patientType === 'returning' && matchResult?.isReturning && matchResult.customerCode && (
                  <div className="p-3.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs md:text-sm flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold block">
                        {labels.customerCode} {matchResult.customerCode} と照合しました
                      </span>
                      <span className="text-xs opacity-80">{labels.returningSubtitle}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || !formData.name.trim() || !formData.phone.trim()}
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-sm md:text-base shadow-lg transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                >
                  <span>{labels.consultation}・予約日時の選択へ進む</span>
                  <ArrowRight size={18} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* 説明テキスト */}
          {!authMethod && (
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              {isAuthEnabled ? (
                <>
                  ※LINE / Apple / Googleボタンを押すとアカウント連携でスムーズにご予約いただけます。<br />
                  アカウント連携を行わない場合は「メール入力」からお名前・電話番号を入力してください。
                </>
              ) : (
                <>
                  ※デモモード稼働中：各ボタンを押すか、上の「スルー入室」からワンタップで予約画面を開始できます。
                </>
              )}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}


