import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Phone,
  Mail,
  MessageCircle,
  CalendarDays,
  Star,
  Crown,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

const RANK_CONFIG = {
  vip: { label: 'VIP', bg: 'bg-amber-100', text: 'text-amber-800', icon: Crown },
  regular: { label: '一般', bg: 'bg-slate-100', text: 'text-slate-600', icon: User },
  new: { label: '新規', bg: 'bg-emerald-100', text: 'text-emerald-800', icon: Star },
};

export default function PatientList({ facilityId, staffs, theme }) {
  const [customers, setCustomers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRank, setFilterRank] = useState('all');
  const [filterStaffId, setFilterStaffId] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [facilityId]);

  const loadData = async () => {
    setIsLoading(true);
    if (!supabase) { setIsLoading(false); return; }

    try {
      const [custRes, resRes] = await Promise.all([
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase.from('reservations').select('customer_id, staff_id, start_at, status, ai_summary').order('start_at', { ascending: false }),
      ]);
      if (!custRes.error && custRes.data) setCustomers(custRes.data);
      if (!resRes.error && resRes.data) setReservations(resRes.data);
    } catch (e) {
      console.error('患者データ取得エラー:', e);
    }
    setIsLoading(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.name?.includes(searchQuery) ||
        c.phone?.includes(searchQuery) ||
        c.kana?.includes(searchQuery) ||
        c.customer_code?.includes(searchQuery);
      const matchRank = filterRank === 'all' || c.customer_rank === filterRank;
      if (!matchSearch || !matchRank) return false;

      if (filterStaffId !== 'all') {
        const hasStaffRes = reservations.some(
          (r) => r.customer_id === c.id && r.staff_id === filterStaffId
        );
        if (!hasStaffRes) return false;
      }
      return true;
    });
  }, [customers, searchQuery, filterRank, filterStaffId, reservations]);

  const getCustomerReservations = (customerId) =>
    reservations.filter((r) => r.customer_id === customerId);

  const getLastVisit = (customerId) => {
    const past = reservations
      .filter((r) => r.customer_id === customerId && r.status === 'completed')
      .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));
    return past[0]?.start_at;
  };

  const getUsualStaff = (customerId) => {
    const resForCust = reservations.filter((r) => r.customer_id === customerId);
    const staffCounts = {};
    resForCust.forEach((r) => {
      if (r.staff_id) staffCounts[r.staff_id] = (staffCounts[r.staff_id] || 0) + 1;
    });
    const topStaffId = Object.entries(staffCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return staffs?.find((s) => s.id === topStaffId);
  };

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 font-serif">患者情報一覧</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          登録されている患者様の基本情報・予約履歴を確認できます
        </p>
      </div>

      {/* 検索・フィルタバー */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="氏名・カナ・電話番号・患者コードで検索..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
          >
            <option value="all">全ランク</option>
            <option value="vip">VIP</option>
            <option value="regular">一般</option>
            <option value="new">新規</option>
          </select>

          <select
            value={filterStaffId}
            onChange={(e) => setFilterStaffId(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
          >
            <option value="all">全スタッフ</option>
            {(staffs || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            title="更新"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 患者数サマリー（クリックでランク絞り込み） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { rankKey: 'all', label: '総登録患者', count: customers.length, color: 'bg-slate-800', border: 'border-slate-800' },
          { rankKey: 'vip', label: 'VIP', count: customers.filter((c) => c.customer_rank === 'vip').length, color: 'bg-amber-600', border: 'border-amber-500' },
          { rankKey: 'regular', label: '一般', count: customers.filter((c) => c.customer_rank === 'regular').length, color: 'bg-slate-500', border: 'border-slate-400' },
          { rankKey: 'new', label: '新規', count: customers.filter((c) => c.customer_rank === 'new').length, color: 'bg-emerald-600', border: 'border-emerald-500' },
        ].map((item) => {
          const isSelected = filterRank === item.rankKey;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setFilterRank(isSelected && item.rankKey !== 'all' ? 'all' : item.rankKey)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-xs space-y-1 ${
                isSelected
                  ? `bg-white ${item.border} ring-2 ring-offset-1 ring-slate-800/20 shadow-md`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{item.label}</span>
                {isSelected && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">選択中</span>
                )}
              </div>
              <div className={`text-2xl font-black text-white ${item.color} px-2.5 py-0.5 rounded-xl inline-block font-mono`}>
                {item.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* 患者リスト & 詳細パネル（2カラム） */}
      <div className="flex gap-4 items-start">
        {/* 患者リスト */}
        <div className={`${selectedCustomer ? 'hidden md:block md:w-80 shrink-0' : 'w-full'}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm gap-2">
                <RefreshCw size={16} className="animate-spin" />
                読み込み中...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm space-y-2">
                <User size={28} className="opacity-40" />
                <p className="text-xs">該当する患者が見つかりません</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredCustomers.map((customer) => {
                  const rank = RANK_CONFIG[customer.customer_rank] || RANK_CONFIG.regular;
                  const RankIcon = rank.icon;
                  const custRes = getCustomerReservations(customer.id);
                  const lastVisit = getLastVisit(customer.id);
                  const usualStaff = getUsualStaff(customer.id);
                  const isSelected = selectedCustomer?.id === customer.id;

                  return (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(isSelected ? null : customer)}
                      className={`w-full p-4 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-xs"
                        style={{ backgroundColor: rank.bg.includes('amber') ? '#D97706' : rank.bg.includes('emerald') ? '#059669' : (usualStaff?.badge_color || theme.primary) }}
                      >
                        {customer.name.slice(0, 1)}
                      </div>
                      <div className="flex-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm truncate">{customer.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${rank.bg} ${rank.text} flex items-center gap-0.5`}>
                            <RankIcon size={9} />
                            {rank.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">{customer.phone}</span>
                          <span>・</span>
                          <span>受診{custRes.length}回</span>
                          {lastVisit && (
                            <>
                              <span>・</span>
                              <span>最終: {format(new Date(lastVisit), 'M/d', { locale: ja })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className={`text-slate-300 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 患者詳細パネル */}
        <AnimatePresence>
          {selectedCustomer && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <div
                className="p-5 flex items-center justify-between"
                style={{ backgroundColor: `${theme.primary}10`, borderBottom: `1.5px solid ${theme.primary}25` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl text-white text-xl font-black flex items-center justify-center shadow"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {selectedCustomer.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 font-serif">{selectedCustomer.name} 様</h3>
                    <div className="text-[11px] text-slate-500 font-mono">{selectedCustomer.customer_code}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[560px] overflow-y-auto">
                {/* ランク設定・変更 */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">患者ランク変更:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { key: 'vip', label: 'VIP', icon: Crown, color: 'bg-amber-100 text-amber-900 border-amber-300' },
                      { key: 'regular', label: '一般', icon: User, color: 'bg-slate-100 text-slate-800 border-slate-300' },
                      { key: 'new', label: '新規', icon: Star, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
                    ].map((rk) => {
                      const RIcon = rk.icon;
                      const isActive = (selectedCustomer.customer_rank || 'regular') === rk.key;
                      return (
                        <button
                          key={rk.key}
                          type="button"
                          onClick={async () => {
                            const updated = { ...selectedCustomer, customer_rank: rk.key };
                            setSelectedCustomer(updated);
                            setCustomers((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                            if (supabase) {
                              await supabase.from('customers').update({ customer_rank: rk.key }).eq('id', updated.id);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                            isActive
                              ? `${rk.color} shadow-xs ring-2 ring-offset-1 ring-slate-800/30`
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <RIcon size={12} />
                          <span>{rk.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 基本情報 */}
                <section className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">基本情報</h4>
                  {[
                    { label: 'ふりがな', value: selectedCustomer.kana },
                    { label: '電話番号', value: selectedCustomer.phone },
                    { label: 'メール', value: selectedCustomer.email },
                    { label: '郵便番号', value: selectedCustomer.postal_code },
                    { label: '住所', value: [selectedCustomer.prefecture, selectedCustomer.address_line1, selectedCustomer.address_line2].filter(Boolean).join(' ') },
                    { label: '生年月日', value: selectedCustomer.birthday },
                    { label: 'ランク', value: RANK_CONFIG[selectedCustomer.customer_rank]?.label },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">{label}</span>
                        <span className="font-bold text-slate-800 text-right break-all">{value}</span>
                      </div>
                    ) : null
                  )}
                </section>

                {/* 予約履歴 */}
                <section className="space-y-2">
                  <h4 className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">予約履歴（直近10件）</h4>
                  {getCustomerReservations(selectedCustomer.id).slice(0, 10).length === 0 ? (
                    <p className="text-xs text-slate-400 p-3">予約履歴がありません</p>
                  ) : (
                    <div className="space-y-1.5">
                      {getCustomerReservations(selectedCustomer.id).slice(0, 10).map((res, idx) => {
                        const resStaff = staffs?.find((s) => s.id === res.staff_id);
                        const statusMap = { confirmed: '予約確定', checked_in: '来院中', completed: '完了', cancelled: 'キャンセル' };
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px]">
                            <div
                              className="w-5 h-5 rounded-lg text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                              style={{ backgroundColor: resStaff?.badge_color || theme.primary }}
                            >
                              {resStaff?.name?.slice(0, 1) || '?'}
                            </div>
                            <span className="font-mono text-slate-600">
                              {res.start_at ? format(new Date(res.start_at), 'yyyy/M/d HH:mm') : '---'}
                            </span>
                            <span className="truncate text-slate-700">{res.ai_summary || '一般診療'}</span>
                            <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                              res.status === 'completed' ? 'bg-slate-100 text-slate-600'
                              : res.status === 'confirmed' ? 'bg-blue-100 text-blue-700'
                              : res.status === 'cancelled' ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {statusMap[res.status] || res.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* アクションフッター */}
              <div className="p-4 border-t border-slate-100 flex gap-2">
                {selectedCustomer.phone && (
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <Phone size={14} />電話する
                  </a>
                )}
                {selectedCustomer.email && (
                  <a
                    href={`mailto:${selectedCustomer.email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white font-bold text-xs shadow transition-colors"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <Mail size={14} />メールする
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
