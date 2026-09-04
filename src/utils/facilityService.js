import { supabase } from './supabaseClient';
import { getClinicScheduleConfig, saveClinicScheduleConfig } from './clinicSchedule';
import { getCurrentTheme, getThemeById } from './themeService';

const FACILITY_STORAGE_KEY = 'inteve_connect_facility_profile_data';
const STAFFS_STORAGE_KEY = 'inteve_connect_facility_staffs';
const SERVICES_STORAGE_KEY = 'inteve_connect_facility_services';

// デフォルト施設
export const DEFAULT_FACILITY_DATA = {
  slug: 'tsubaki-dental',
  name: 'つばき歯科クリニック',
  postal_code: '790-0934',
  prefecture: '愛媛県',
  address_line1: '松山市居相 1-2-3',
  address_line2: '椿参道ビル 1F',
  phone: '089-900-1188',
  email: 'info@tsubaki-dental.example.com',
  website_url: 'https://tsubaki-dental.example.com',
  line_official_id: '@776cdsuy',
  top_announcement: '【お知らせ】土曜日の診療時間を16:30までに変更いたしました。初診・再診ともに24時間WEB予約を受け付けております。',
  is_announcement_active: true,
  theme_id: 'terracotta',
};

// デフォルトスタッフ（1スタッフ1カレンダー対応）
export const DEFAULT_STAFFS = [
  { name: '前田 院長', role: 'facility_admin', title: '院長・歯科医師', badge_color: '#E06A3B', phone: '090-1111-2222', email: 'director@tsubaki.example.com', google_calendar_id: 'c_2b3dafc739d82dcefc4c2f7ce87e1a7d3ea50e9527daa531652bc6a3864a826c@group.calendar.google.com', is_active: true, display_order: 1 },
  { name: '佐藤 医師', role: 'staff', title: '歯科医師', badge_color: '#0284C7', phone: '090-3333-4444', email: 'sato@tsubaki.example.com', google_calendar_id: 'c_36188ef578d225630a927fbd832617c43efe8e98893c4f4bab35b9b448ebdf93@group.calendar.google.com', is_active: true, display_order: 2 },
  { name: '高橋 衛生士', role: 'staff', title: '主任歯科衛生士', badge_color: '#059669', phone: '090-5555-6666', email: 'takahashi@tsubaki.example.com', google_calendar_id: 'c_f60e73e582f959e85eb56c51d25d35b9519136ac8d5276bc4f1c59a384b8f119@group.calendar.google.com', is_active: true, display_order: 3 },
  { name: '伊藤 受付', role: 'staff', title: '受付・コーディネーター', badge_color: '#E11D48', phone: '090-7777-8888', email: 'ito@tsubaki.example.com', google_calendar_id: 'c_7f247bb4fa8f015cb4f6c9b86ffbff65439c0d963643ca4f6538939bc0ebefc7@group.calendar.google.com', is_active: true, display_order: 4 },
  { name: '渡辺 衛生士', role: 'staff', title: '歯科衛生士', badge_color: '#6366F1', phone: '090-9999-0000', email: 'watanabe@tsubaki.example.com', google_calendar_id: 'c_d6d616b9d3817ab19538507784881e1413146bc70452bcca4df670ec6af576c5@group.calendar.google.com', is_active: true, display_order: 5 },
];

/**
 * 施設情報を取得（Supabase同期）
 * @param {string} [slug] - 指定したslugの施設を取得（省略時はデフォルト/単一施設）
 */
export async function getFacilityProfile(slug = null) {
  if (slug) {
    return getFacilityBySlug(slug);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          ...DEFAULT_FACILITY_DATA,
          ...data,
          theme_id: data.theme_colors?.preset_id || getCurrentTheme().id,
        };
      } else if (!data) {
        // レコードがなければ初期データを挿入
        const { data: inserted } = await supabase
          .from('facilities')
          .insert([DEFAULT_FACILITY_DATA])
          .select()
          .maybeSingle();
        if (inserted) return inserted;
      }
    } catch (e) {
      console.warn('Supabase施設取得エラー:', e);
    }
  }

  try {
    const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (saved) return { ...DEFAULT_FACILITY_DATA, ...JSON.parse(saved) };
  } catch (e) {}

  return { ...DEFAULT_FACILITY_DATA };
}

/**
 * URLの slug から対応する施設情報（id = UUID を含む）を取得
 * @param {string} slug - 例: 'tsubaki-dental', 'maeda'
 * @returns {Promise<object|null>}
 */
export async function getFacilityBySlug(slug) {
  if (!slug) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        return {
          ...DEFAULT_FACILITY_DATA,
          ...data,
          theme_id: data.theme_colors?.preset_id || getCurrentTheme().id,
        };
      }
    } catch (e) {
      console.warn(`[getFacilityBySlug] 施設取得エラー (slug: ${slug}):`, e);
    }
  }

  // フォールバック（localStorage または デフォルト）
  try {
    const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.slug === slug) return { ...DEFAULT_FACILITY_DATA, ...parsed };
    }
  } catch (e) {}

  if (DEFAULT_FACILITY_DATA.slug === slug) {
    return { ...DEFAULT_FACILITY_DATA };
  }

  return null;
}

/**
 * 施設情報を保存（Supabase同期）
 */
export async function saveFacilityProfile(profileData) {
  try {
    localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(profileData));

    if (supabase) {
      const payload = {
        name: profileData.name,
        postal_code: profileData.postal_code,
        prefecture: profileData.prefecture,
        address_line1: profileData.address_line1,
        address_line2: profileData.address_line2,
        phone: profileData.phone,
        email: profileData.email,
        website_url: profileData.website_url,
        line_official_id: profileData.line_official_id || '@776cdsuy',
        top_announcement: profileData.top_announcement,
      };

      if (profileData.id) {
        await supabase
          .from('facilities')
          .update(payload)
          .eq('id', profileData.id);
      } else {
        await supabase
          .from('facilities')
          .insert([payload]);
      }
    }
    return { success: true };
  } catch (e) {
    console.error('施設情報保存エラー:', e);
    return { success: false, error: e.message };
  }
}

/**
 * スタッフ一覧を取得（Supabase実DB同期）
 */
export async function getFacilityStaffs() {
  if (supabase) {
    try {
      // 施設IDを取得
      const facility = await getFacilityProfile();
      const facilityId = facility?.id;

      let query = supabase.from('staffs').select('*').order('display_order', { ascending: true });
      if (facilityId) {
        query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // キャッシュ保存
        localStorage.setItem(STAFFS_STORAGE_KEY, JSON.stringify(data));
        return data;
      }

      // Supabaseにレコードが0件の場合は初期シードを投入
      if (!error && (!data || data.length === 0)) {
        const seedData = DEFAULT_STAFFS.map((s, idx) => ({
          ...s,
          facility_id: facilityId || null,
          display_order: idx + 1,
        }));
        const { data: inserted } = await supabase.from('staffs').insert(seedData).select();
        if (inserted && inserted.length > 0) {
          localStorage.setItem(STAFFS_STORAGE_KEY, JSON.stringify(inserted));
          return inserted;
        }
      }
    } catch (e) {
      console.warn('Supabaseスタッフ取得エラー（ローカルフォールバック）:', e);
    }
  }

  try {
    const saved = localStorage.getItem(STAFFS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return DEFAULT_STAFFS.map((s, idx) => ({ ...s, id: `stf-0${idx + 1}` }));
}

/**
 * スタッフを1件保存（Supabase実DB同期）
 */
export async function saveSingleStaff(staffData) {
  if (supabase) {
    try {
      const facility = await getFacilityProfile();
      const facilityId = facility?.id || null;

      const payload = {
        name: staffData.name,
        role: staffData.role || 'staff',
        title: staffData.title || 'スタッフ',
        badge_color: staffData.badge_color || '#3B82F6',
        phone: staffData.phone || '',
        email: staffData.email || '',
        google_calendar_id: staffData.google_calendar_id || '',
        is_active: staffData.is_active !== false,
        facility_id: facilityId,
      };

      if (staffData.id && staffData.id.includes('-') && !staffData.id.startsWith('stf-')) {
        // UUID形式の既存レコード更新
        const { data, error } = await supabase
          .from('staffs')
          .update(payload)
          .eq('id', staffData.id)
          .select()
          .single();
        if (!error && data) return data;
      } else {
        // 新規登録
        const { data, error } = await supabase
          .from('staffs')
          .insert([payload])
          .select()
          .single();
        if (!error && data) return data;
      }
    } catch (e) {
      console.error('Supabaseスタッフ保存エラー:', e);
    }
  }

  // フォールバック
  return staffData;
}

/**
 * スタッフ一覧を一括保存（Supabase & LocalStorage）
 */
export async function saveFacilityStaffs(staffs) {
  localStorage.setItem(STAFFS_STORAGE_KEY, JSON.stringify(staffs));
}

/**
 * スタッフを削除（Supabase実DB同期）
 */
export async function deleteSingleStaff(staffId) {
  if (supabase && staffId && staffId.includes('-') && !staffId.startsWith('stf-')) {
    try {
      await supabase.from('staffs').delete().eq('id', staffId);
    } catch (e) {
      console.error('Supabaseスタッフ削除エラー:', e);
    }
  }
}

/**
 * サービスメニュー一覧を取得（Supabase同期）
 */
export async function getFacilityServices() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Supabaseサービス取得エラー:', e);
    }
  }

  try {
    const saved = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}

  return [
    { id: 'srv-01', name: '初診・一般診療（虫歯・検診）', category: '保険診療', duration_minutes: 30, price: 3500, is_online_bookable: true, is_active: true },
    { id: 'srv-02', name: '再診・治療の続き', category: '保険診療', duration_minutes: 30, price: 2000, is_online_bookable: true, is_active: true },
    { id: 'srv-03', name: '定期検診・歯石クリーニング', category: '予防歯科', duration_minutes: 45, price: 4000, is_online_bookable: true, is_active: true },
    { id: 'srv-04', name: 'オフィスホワイトニング', category: '自費診療', duration_minutes: 60, price: 22000, is_online_bookable: true, is_active: true },
    { id: 'srv-05', name: '矯正・インプラント無料相談', category: '相談', duration_minutes: 30, price: 0, is_online_bookable: true, is_active: true },
  ];
}

/**
 * サービスメニューを保存
 */
export function saveFacilityServices(services) {
  localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
}
