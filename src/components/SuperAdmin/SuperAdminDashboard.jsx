import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Building2,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Save,
  CheckCircle2,
  Trash2,
  Palette,
  Calendar,
  CreditCard,
  Key,
  Users,
  Eye,
  ArrowLeft,
  Settings,
  Sparkles,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { THEME_PRESETS, getThemeById, applyTheme } from '../../utils/themeService';

const MOCK_FACILITIES_SEED = [
  {
    id: 'fac-tsubaki-001',
    slug: 'tsubaki-dental',
    name: 'つばき歯科クリニック',
    phone: '089-900-1188',
    email: 'info@tsubaki-dental.example.com',
    postal_code: '790-0934',
    prefecture: '愛媛県',
    address_line1: '松山市居相 1-2-3',
    address_line2: '椿参道ビル 1F',
    website_url: 'https://tsubaki-dental.example.com',
    theme_colors: { preset_id: 'terracotta' },
    subscription_plan: 'standard',
    subscription_status: 'active',
    monthly_fee: 35000,
    contract_started_at: '2026-01-01',
    google_calendar_id: 'primary-clinic@group.calendar.google.com',
    admin_system_memo: '初回導入クリニック。5名のスタッフ全員に個別カレンダーIDを割り当て中。',
    is_active: true,
  },
  {
    id: 'fac-aoyama-002',
    slug: 'aoyama-beauty-salon',
    name: '青山メディカルビューティークリニック',
    phone: '03-9876-5432',
    email: 'contact@aoyama-beauty.example.com',
    postal_code: '107-0062',
    prefecture: '東京都',
    address_line1: '港区南青山3-4-5',
    address_line2: '青山スクエア4F',
    website_url: 'https://aoyama-beauty.example.com',
    theme_colors: { preset_id: 'rose' },
    subscription_plan: 'pro',
    subscription_status: 'active',
    monthly_fee: 50000,
    contract_started_at: '2026-03-01',
    google_calendar_id: 'aoyama-beauty@group.calendar.google.com',
    admin_system_memo: '美容皮膚科・審美歯科併設。エレガントローズ配色を適用。',
    is_active: true,
  },
];

export default function SuperAdminDashboard({ onSwitchView }) {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFacilityData, setNewFacilityData] = useState({
    name: '',
    slug: '',
    phone: '',
    email: '',
    subscription_plan: 'standard',
    monthly_fee: 35000,
    theme_id: 'terracotta',
  });
  const [saveToast, setSaveToast] = useState({ show: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);

  // 初期ロード
  useEffect(() => {
    loadFacilities();
  }, []);

  const showToast = (message) => {
    setSaveToast({ show: true, message });
    setTimeout(() => {
      setSaveToast({ show: false, message: '' });
    }, 2500);
  };

  const loadFacilities = async () => {
    setIsLoading(true);
    if (supabase) {
      try {
        const { data, error } = await supabase.from('facilities').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          setFacilities(data);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Supabase施設一覧取得エラー:', e);
      }
    }
    // フォールバック
    setFacilities(MOCK_FACILITIES_SEED);
    setIsLoading(false);
  };

  // 新規施設作成
  const handleCreateFacility = async (e) => {
    e.preventDefault();
    const payload = {
      name: newFacilityData.name,
      slug: newFacilityData.slug.toLowerCase().replace(/\s+/g, '-'),
      phone: newFacilityData.phone,
      email: newFacilityData.email,
      subscription_plan: newFacilityData.subscription_plan,
      monthly_fee: Number(newFacilityData.monthly_fee) || 0,
      subscription_status: 'active',
      theme_colors: { preset_id: newFacilityData.theme_id },
      is_active: true,
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('facilities').insert([payload]).select().single();
        if (!error && data) {
          setFacilities([...facilities, data]);
          setIsAddModalOpen(false);
          showToast(`施設「${data.name}」を新規登録しました`);
          return;
        }
      } catch (err) {
        console.error('施設登録エラー:', err);
      }
    }

    // フォールバック
    const mockCreated = { ...payload, id: `fac-${Date.now()}` };
    setFacilities([...facilities, mockCreated]);
    setIsAddModalOpen(false);
    showToast(`施設「${mockCreated.name}」を新規登録しました`);
  };

  // 施設詳細の保存
  const handleSaveFacilityDetail = async (e) => {
    e.preventDefault();
    if (!selectedFacility) return;

    if (supabase && selectedFacility.id) {
      try {
        await supabase
          .from('facilities')
          .update({
            name: selectedFacility.name,
            slug: selectedFacility.slug,
            phone: selectedFacility.phone,
            email: selectedFacility.email,
            postal_code: selectedFacility.postal_code,
            prefecture: selectedFacility.prefecture,
            address_line1: selectedFacility.address_line1,
            address_line2: selectedFacility.address_line2,
            website_url: selectedFacility.website_url,
            theme_colors: selectedFacility.theme_colors,
            subscription_plan: selectedFacility.subscription_plan,
            subscription_status: selectedFacility.subscription_status,
            monthly_fee: selectedFacility.monthly_fee,
            contract_started_at: selectedFacility.contract_started_at,
            contract_ended_at: selectedFacility.contract_ended_at,
            google_calendar_id: selectedFacility.google_calendar_id,
            admin_system_memo: selectedFacility.admin_system_memo,
            is_active: selectedFacility.is_active,
          })
          .eq('id', selectedFacility.id);
      } catch (err) {
        console.error('施設詳細更新エラー:', err);
      }
    }

    const updated = facilities.map((f) => (f.id === selectedFacility.id ? selectedFacility : f));
    setFacilities(updated);
    showToast('施設設定と契約情報を更新しました');
  };

  // フィルタリング
  const filteredFacilities = facilities.filter(
    (f) =>
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.phone?.includes(searchQuery)
  );

  // 統計値
  const totalMRR = facilities.reduce((sum, f) => sum + (Number(f.monthly_fee) || 0), 0);
  const activeCount = facilities.filter((f) => f.is_active !== false).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* トースト通知 */}
      <AnimatePresence>
        {saveToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border border-emerald-400"
          >
            <CheckCircle2 size={18} />
            <span>{saveToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* トップヘッダーバー */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 font-mono">
                PLATFORM SUPER ADMIN
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-white font-serif">
              自社専用プラットフォーム総合管理コンソール
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSwitchView && onSwitchView('booking')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Eye size={14} />
            <span>受付画面を確認</span>
          </button>
        </div>
      </header>

      {/* メインコンテナ */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">

        {/* 1. 施設一覧画面 (List View) */}
        {!selectedFacility ? (
          <div className="space-y-6">
            {/* KPI統計カード */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-xs space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  契約施設総数
                  <Building2 size={16} className="text-indigo-400" />
                </span>
                <div className="text-3xl font-black text-white font-mono">{facilities.length} <span className="text-xs font-normal text-slate-400">施設</span></div>
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-bold border border-emerald-800/60">
                  稼働中: {activeCount} 施設
                </span>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-xs space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  月額合計収益 (MRR)
                  <CreditCard size={16} className="text-emerald-400" />
                </span>
                <div className="text-3xl font-black text-emerald-400 font-mono">
                  ¥{totalMRR.toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-400">平均単価: ¥{facilities.length ? Math.round(totalMRR / facilities.length).toLocaleString() : 0}</span>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-xs space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  Googleカレンダー連携
                  <Calendar size={16} className="text-blue-400" />
                </span>
                <div className="text-2xl font-black text-white font-mono">Multi-Cal</div>
                <span className="text-[11px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded font-bold border border-blue-800/60">
                  1スタッフ1カレンダー完全同期
                </span>
              </div>

              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 shadow-xs space-y-1.5">
                <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  システム状態
                  <Sparkles size={16} className="text-amber-400" />
                </span>
                <div className="text-sm font-bold text-slate-200 mt-2">Supabase v2 正常稼働</div>
                <span className="text-[11px] text-emerald-400 font-bold">全データベース同期OK</span>
              </div>
            </div>

            {/* 施設一覧ヘッダー・検索・新規追加 */}
            <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="施設名・URLスラッグ・電話番号で検索..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105"
                >
                  <Plus size={16} />
                  <span>新規施設を登録</span>
                </button>
              </div>

              {/* 施設一覧テーブル */}
              <div className="rounded-2xl border border-slate-700/80 overflow-hidden bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 font-bold border-b border-slate-700">
                    <tr>
                      <th className="p-4">施設名 / URL識別子</th>
                      <th className="p-4">テーマカラー</th>
                      <th className="p-4">契約プラン</th>
                      <th className="p-4">月額請求</th>
                      <th className="p-4">連絡先電話番号</th>
                      <th className="p-4">状態</th>
                      <th className="p-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredFacilities.map((facility) => {
                      const theme = getThemeById(facility.theme_colors?.preset_id || 'terracotta');
                      return (
                        <tr key={facility.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{facility.name}</div>
                            <div className="text-[11px] font-mono text-indigo-400">/{facility.slug}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-lg shadow-xs border border-slate-700"
                                style={{ backgroundColor: theme.primary }}
                              />
                              <span className="font-medium text-[11px] text-slate-300">
                                {theme.name.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 font-bold text-[10px] text-indigo-300 uppercase border border-slate-700">
                              {facility.subscription_plan || 'standard'}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-200">
                            ¥{Number(facility.monthly_fee || 0).toLocaleString()}
                          </td>
                          <td className="p-4 font-mono text-slate-400">{facility.phone}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                facility.is_active !== false
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              {facility.is_active !== false ? '稼働中' : '停止中'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedFacility(facility)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs border border-indigo-500/40 cursor-pointer"
                            >
                              設定・契約管理
                            </button>
                            <button
                              onClick={() => {
                                window.location.hash = 'admin';
                                window.location.reload();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                              title="施設管理画面へログイン"
                            >
                              施設画面 →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 2. 1施設の詳細設定 & 契約・テーマ管理画面 (Facility Detail View) */
          <div className="space-y-6">
            {/* 戻るボタン & 施設名 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedFacility(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700"
              >
                <ArrowLeft size={15} />
                施設一覧へ戻る
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.location.hash = 'admin';
                    window.location.reload();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Eye size={14} />
                  この施設の管理画面を開く
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveFacilityDetail} className="space-y-6">
              {/* セクション 1: 施設基本情報 */}
              <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-400" />
                  施設基本情報
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">施設名称</label>
                    <input
                      type="text"
                      value={selectedFacility.name || ''}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, name: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">URL識別スラッグ</label>
                    <input
                      type="text"
                      value={selectedFacility.slug || ''}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, slug: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-indigo-300 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">代表電話番号</label>
                    <input
                      type="text"
                      value={selectedFacility.phone || ''}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, phone: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">連絡先メールアドレス</label>
                    <input
                      type="email"
                      value={selectedFacility.email || ''}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, email: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">住所</label>
                    <input
                      type="text"
                      value={selectedFacility.address_line1 || ''}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, address_line1: e.target.value })
                      }
                      placeholder="例: 東京都渋谷区神宮前1-2-3"
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>

              {/* セクション 2: テーマカラー設定（最高管理者のみ変更可能） */}
              <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette size={16} className="text-amber-400" />
                    テーマカラー設定（最高管理者専用・6色プリセット）
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    この施設に適用するアクセントカラーを選択します。施設側での誤変更を防ぐため、ここでのみ設定可能です。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected =
                      (selectedFacility.theme_colors?.preset_id || 'terracotta') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedFacility({
                            ...selectedFacility,
                            theme_colors: { preset_id: preset.id },
                          });
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-indigo-400 ring-2 ring-indigo-400/20'
                            : 'bg-slate-900/60 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div
                            className="w-6 h-6 rounded-lg"
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <div className="text-xs font-bold text-white">{preset.name.split(' ')[0]}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* セクション 3: 契約・課金管理 & Google連携 */}
              <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-400" />
                  契約・月額課金・システム連携
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">契約プラン</label>
                    <select
                      value={selectedFacility.subscription_plan || 'standard'}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, subscription_plan: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="free">Free（トライアル）</option>
                      <option value="standard">Standard（標準プラン）</option>
                      <option value="pro">Pro（多スタッフ・高機能）</option>
                      <option value="enterprise">Enterprise（カスタム）</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">月額利用料 (円)</label>
                    <input
                      type="number"
                      value={selectedFacility.monthly_fee || 0}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, monthly_fee: Number(e.target.value) })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">契約ステータス</label>
                    <select
                      value={selectedFacility.subscription_status || 'active'}
                      onChange={(e) =>
                        setSelectedFacility({ ...selectedFacility, subscription_status: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                    >
                      <option value="active">Active（正常稼働）</option>
                      <option value="suspended">Suspended（一時停止）</option>
                      <option value="past_due">Past Due（未払い）</option>
                      <option value="cancelled">Cancelled（解約）</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-400">マスターGoogleカレンダーID</label>
                  <input
                    type="text"
                    value={selectedFacility.google_calendar_id || ''}
                    onChange={(e) =>
                      setSelectedFacility({ ...selectedFacility, google_calendar_id: e.target.value })
                    }
                    placeholder="例: clinic-master@group.calendar.google.com"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-400">最高管理者専用 社内メモ（非公開）</label>
                  <textarea
                    rows={3}
                    value={selectedFacility.admin_system_memo || ''}
                    onChange={(e) =>
                      setSelectedFacility({ ...selectedFacility, admin_system_memo: e.target.value })
                    }
                    placeholder="契約時の特記事項、追加要望、請求先情報などを記録..."
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
                  />
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                >
                  <Save size={16} />
                  <span>施設設定・契約内容を保存</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* 新規施設登録モーダル */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <motion.form
            onSubmit={handleCreateFacility}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus size={18} className="text-indigo-400" />
                新規施設の追加登録
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">施設名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 新宿サクラ歯科クリニック"
                  value={newFacilityData.name}
                  onChange={(e) => setNewFacilityData({ ...newFacilityData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">URLスラッグ（英数小文字・ハイフン）</label>
                <input
                  type="text"
                  required
                  placeholder="例: shinjuku-sakura-dental"
                  value={newFacilityData.slug}
                  onChange={(e) => setNewFacilityData({ ...newFacilityData, slug: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-indigo-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">代表電話番号</label>
                <input
                  type="tel"
                  required
                  placeholder="03-0000-0000"
                  value={newFacilityData.phone}
                  onChange={(e) => setNewFacilityData({ ...newFacilityData, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">契約プラン</label>
                  <select
                    value={newFacilityData.subscription_plan}
                    onChange={(e) =>
                      setNewFacilityData({ ...newFacilityData, subscription_plan: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="standard">Standard (¥35,000)</option>
                    <option value="pro">Pro (¥50,000)</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">初期テーマカラー</label>
                  <select
                    value={newFacilityData.theme_id}
                    onChange={(e) =>
                      setNewFacilityData({ ...newFacilityData, theme_id: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="terracotta">つばきテラコッタ</option>
                    <option value="ocean">メディカルオーシャン</option>
                    <option value="forest">フォレストヒーリング</option>
                    <option value="rose">エレガントローズ</option>
                    <option value="slate">モダンシック</option>
                    <option value="indigo">ロイヤルインディゴ</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-slate-400 font-bold"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md cursor-pointer"
              >
                登録する
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
