import { supabase } from './supabaseClient';
import { getClinicScheduleConfig, saveClinicScheduleConfig } from './clinicSchedule';
import { getCurrentTheme, getThemeById } from './themeService';
import { parseUrl } from './urlRouter';

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
  is_staff_assignment_enabled: true,
  is_patient_auth_enabled: false, // 患者認証のOnOff（Off時はダミー/デモでスルー、On時は厳格認証・実名入力）
  industry_type: 'medical',
  theme_id: 'terracotta',
};

// デフォルトスタッフ（1スタッフ1カレンダー対応）
export const DEFAULT_STAFFS = [
  { name: '前田 院長', role: 'facility_admin', title: '院長・歯科医師', badge_color: '#E06A3B', phone: '090-1111-2222', email: 'director@tsubaki.example.com', google_calendar_id: 'c_2b3dafc739d82dcefc4c2f7ce87e1a7d3ea50e9527daa531652bc6a3864a826c@group.calendar.google.com', accepts_new_patients: true, is_active: true, display_order: 1 },
  { name: '佐藤 医師', role: 'staff', title: '歯科医師', badge_color: '#0284C7', phone: '090-3333-4444', email: 'sato@tsubaki.example.com', google_calendar_id: 'c_36188ef578d225630a927fbd832617c43efe8e98893c4f4bab35b9b448ebdf93@group.calendar.google.com', accepts_new_patients: false, is_active: true, display_order: 2 },
  { name: '高橋 衛生士', role: 'staff', title: '主任歯科衛生士', badge_color: '#059669', phone: '090-5555-6666', email: 'takahashi@tsubaki.example.com', google_calendar_id: 'c_f60e73e582f959e85eb56c51d25d35b9519136ac8d5276bc4f1c59a384b8f119@group.calendar.google.com', accepts_new_patients: false, is_active: true, display_order: 3 },
  { name: '伊藤 受付', role: 'staff', title: '受付・コーディネーター', badge_color: '#E11D48', phone: '090-7777-8888', email: 'ito@tsubaki.example.com', google_calendar_id: 'c_7f247bb4fa8f015cb4f6c9b86ffbff65439c0d963643ca4f6538939bc0ebefc7@group.calendar.google.com', accepts_new_patients: false, is_active: true, display_order: 4 },
  { name: '渡辺 衛生士', role: 'staff', title: '歯科衛生士', badge_color: '#6366F1', phone: '090-9999-0000', email: 'watanabe@tsubaki.example.com', google_calendar_id: 'c_d6d616b9d3817ab19538507784881e1413146bc70452bcca4df670ec6af576c5@group.calendar.google.com', accepts_new_patients: false, is_active: true, display_order: 5 },
];

// 現在アクティブな施設情報のインメモリキャッシュ
let activeFacilityCache = null;

export function getActiveFacilityCache() {
  return activeFacilityCache;
}

export function setActiveFacilityCache(facility) {
  activeFacilityCache = facility;
}

/**
 * 施設情報を取得（Supabase同期）
 * @param {string} [slug] - 指定したslugの施設を取得（省略時はURLから自動判定、またはデフォルト/単一施設）
 */
export async function getFacilityProfile(slug = null) {
  // 1. 引数に slug がない場合は URL から判定
  let targetSlug = slug;
  if (!targetSlug && typeof window !== 'undefined') {
    const parsed = parseUrl(window.location);
    if (parsed.slug) {
      targetSlug = parsed.slug;
    }
  }

  // 2. slug が特定できている場合は slug で取得
  if (targetSlug) {
    const facility = await getFacilityBySlug(targetSlug);
    if (facility) {
      activeFacilityCache = facility;
    }
    return facility;
  }

  // 3. slug がない場合（ベースURL '/' へのアクセスなど）：
  // tsubaki-dental または 最初の1件を取得
  let resolvedFacility = null;

  if (supabase) {
    try {
      let { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('slug', 'tsubaki-dental')
        .maybeSingle();

      if (!data) {
        const fallbackRes = await supabase
          .from('facilities')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (!error && data) {
        const authEnabled =
          data.is_patient_auth_enabled !== undefined && data.is_patient_auth_enabled !== null
            ? Boolean(data.is_patient_auth_enabled)
            : Boolean(data.theme_colors?.is_patient_auth_enabled);

        resolvedFacility = {
          ...DEFAULT_FACILITY_DATA,
          ...data,
          theme_id: data.theme_colors?.preset_id || getCurrentTheme().id,
          is_patient_auth_enabled: authEnabled,
        };
      }
    } catch (e) {
      console.warn('Supabase施設取得エラー:', e);
    }
  }

  // ローカルキャッシュの優先チェック
  try {
    const localAuthOverride = localStorage.getItem(`inteve_facility_patient_auth_${targetSlug || 'default'}`);
    const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (saved) {
      const parsed = { ...DEFAULT_FACILITY_DATA, ...JSON.parse(saved) };
      if (!resolvedFacility) {
        resolvedFacility = parsed;
      } else {
        // ローカルストレージに最新設定があればマージ
        if (parsed.is_patient_auth_enabled !== undefined) {
          resolvedFacility.is_patient_auth_enabled = Boolean(parsed.is_patient_auth_enabled);
        }
      }
    }
    if (localAuthOverride !== null && resolvedFacility) {
      resolvedFacility.is_patient_auth_enabled = localAuthOverride === 'true';
    }
  } catch (e) {}

  if (!resolvedFacility) {
    resolvedFacility = { ...DEFAULT_FACILITY_DATA };
  }

  activeFacilityCache = resolvedFacility;
  return resolvedFacility;
}

/**
 * URLの slug から対応する施設情報（id = UUID を含む）を取得
 * @param {string} slug - 例: 'tsubaki-dental', 'aoyama-beauty-salon'
 * @returns {Promise<object|null>}
 */
export async function getFacilityBySlug(slug) {
  if (!slug) return null;

  let resolved = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        const authEnabled =
          data.is_patient_auth_enabled !== undefined && data.is_patient_auth_enabled !== null
            ? Boolean(data.is_patient_auth_enabled)
            : Boolean(data.theme_colors?.is_patient_auth_enabled);

        resolved = {
          ...DEFAULT_FACILITY_DATA,
          ...data,
          theme_id: data.theme_colors?.preset_id || getCurrentTheme().id,
          is_patient_auth_enabled: authEnabled,
        };
      }
    } catch (e) {
      console.warn(`[getFacilityBySlug] 施設取得エラー (slug: ${slug}):`, e);
    }
  }

  // フォールバック（localStorage または デフォルト）
  try {
    const localAuthOverride = localStorage.getItem(`inteve_facility_patient_auth_${slug}`);
    const saved = localStorage.getItem(FACILITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.slug === slug) {
        if (!resolved) {
          resolved = { ...DEFAULT_FACILITY_DATA, ...parsed };
        } else if (parsed.is_patient_auth_enabled !== undefined) {
          resolved.is_patient_auth_enabled = Boolean(parsed.is_patient_auth_enabled);
        }
      }
    }
    if (localAuthOverride !== null && resolved) {
      resolved.is_patient_auth_enabled = localAuthOverride === 'true';
    }
  } catch (e) {}

  if (!resolved && DEFAULT_FACILITY_DATA.slug === slug) {
    resolved = { ...DEFAULT_FACILITY_DATA };
  }

  return resolved;
}

/**
 * 施設情報を保存（Supabase同期）
 */
export async function saveFacilityProfile(profileData) {
  try {
    const isAuth = Boolean(profileData.is_patient_auth_enabled);
    localStorage.setItem(FACILITY_STORAGE_KEY, JSON.stringify(profileData));
    localStorage.setItem(`inteve_facility_patient_auth_${profileData.slug || 'default'}`, String(isAuth));

    // インメモリキャッシュを即時更新
    activeFacilityCache = { ...profileData, is_patient_auth_enabled: isAuth };

    if (supabase) {
      const themeColors = {
        ...(profileData.theme_colors || {}),
        preset_id: profileData.theme_id || profileData.theme_colors?.preset_id || 'terracotta',
        is_patient_auth_enabled: isAuth,
      };

      const payload = {
        name: profileData.name,
        slug: profileData.slug,
        postal_code: profileData.postal_code,
        prefecture: profileData.prefecture,
        address_line1: profileData.address_line1,
        address_line2: profileData.address_line2,
        phone: profileData.phone,
        email: profileData.email,
        website_url: profileData.website_url,
        line_official_id: profileData.line_official_id || '@776cdsuy',
        top_announcement: profileData.top_announcement,
        is_staff_assignment_enabled: profileData.is_staff_assignment_enabled !== false,
        is_patient_auth_enabled: isAuth,
        theme_colors: themeColors,
        industry_type: profileData.industry_type || 'medical',
      };

      if (profileData.id) {
        const { error } = await supabase.from('facilities').update(payload).eq('id', profileData.id);
        if (error) {
          // もしカラムが存在しない場合は theme_colors に退避して保存
          delete payload.is_patient_auth_enabled;
          await supabase.from('facilities').update(payload).eq('id', profileData.id);
        }
      } else {
        const { error } = await supabase.from('facilities').insert([payload]);
        if (error) {
          delete payload.is_patient_auth_enabled;
          await supabase.from('facilities').insert([payload]);
        }
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
        accepts_new_patients: staffData.accepts_new_patients === true,
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
 * スタッフの表示順（display_order）を一括並び替え保存（Supabase & LocalStorage）
 */
export async function reorderFacilityStaffs(reorderedStaffs) {
  const updated = reorderedStaffs.map((s, index) => ({
    ...s,
    display_order: index + 1,
  }));
  localStorage.setItem(STAFFS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        if (item.id && item.id.includes('-') && !item.id.startsWith('stf-')) {
          await supabase
            .from('staffs')
            .update({ display_order: item.display_order })
            .eq('id', item.id);
        }
      }
    } catch (e) {
      console.error('スタッフ並び替え保存エラー:', e);
    }
  }
  return updated;
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

export const DEFAULT_SERVICES_BY_INDUSTRY = {
  medical: [
    { id: 'srv-m01', name: '一般診療・初診（虫歯・急患処置）', chat_label: '歯が痛い・詰め物が取れた（急患）', chat_description: '痛みや腫れ、詰め物の脱離など急なトラブルの処置', category: '保険診療', duration_minutes: 30, price: 3500, icon: '🦷', is_online_bookable: true, is_active: true },
    { id: 'srv-m02', name: '定期検診・PMTC歯石除去', chat_label: '定期検診・クリーニングを受けたい', chat_description: '虫歯・歯周病チェック、歯石除去、着色落とし', category: '予防歯科', duration_minutes: 45, price: 4000, icon: '🪥', is_online_bookable: true, is_active: true },
    { id: 'srv-m03', name: 'オフィスホワイトニング・審美ケア', chat_label: 'ホワイトニング・歯を白くしたい', chat_description: 'クリニックで行う本格的なホワイトニングケア', category: '審美歯科', duration_minutes: 60, price: 22000, icon: '✨', is_online_bookable: true, is_active: true },
    { id: 'srv-m04', name: '矯正・インプラント専門カウンセリング', chat_label: '矯正・インプラントの相談をしたい', chat_description: '歯並び、噛み合わせ、自費診療の事前無料相談', category: '無料相談', duration_minutes: 30, price: 0, icon: '💬', is_online_bookable: true, is_active: true },
    { id: 'srv-m05', name: '再診・治療の続き', chat_label: '通院中の治療の続きを受けたい', chat_description: '前回からの継続処置・経過観察', category: '保険診療', duration_minutes: 30, price: 2000, icon: '📋', is_online_bookable: true, is_active: true },
  ],
  beauty: [
    { id: 'srv-b01', name: 'カット＋オーガニックカラー＋トリートメント', chat_label: 'カット＆カラーでイメージを変えたい', chat_description: '似合わせカットと髪質改善トリートメント付きカラー', category: 'ヘアケア', duration_minutes: 90, price: 13200, icon: '💇‍♀️', is_online_bookable: true, is_active: true },
    { id: 'srv-b02', name: '美肌毛穴ハイドラフェイシャル', chat_label: '毛穴洗浄・美肌フェイシャルを受けたい', chat_description: '毛穴の黒ずみ・古い角質を徹底除去してうるおい補給', category: 'エステ', duration_minutes: 60, price: 9800, icon: '✨', is_online_bookable: true, is_active: true },
    { id: 'srv-b03', name: '全顔ハイフ（HIFU）リフトアップ4000shot', chat_label: 'たるみケア・小顔リフトアップをしたい', chat_description: 'フェイスラインを引き締める最新マシン施術', category: '美容マシン', duration_minutes: 45, price: 15000, icon: '💖', is_online_bookable: true, is_active: true },
    { id: 'srv-b04', name: '肌質改善・施術メニュー無料カウンセリング', chat_label: '自分に合う施術をスタッフに相談したい', chat_description: '肌質やお悩みに合わせた最適なプランをご提案', category: '相談', duration_minutes: 30, price: 0, icon: '💬', is_online_bookable: true, is_active: true },
  ],
  fitness: [
    { id: 'srv-f01', name: 'パーソナルトレーニング初回体験＋体組成測定', chat_label: '体験トレーニングを受けてみたい（初回限定）', chat_description: 'カウンセリング＋姿勢・体組成分析＋マンツーマン体験', category: '体験', duration_minutes: 60, price: 3300, icon: '🏋️', is_online_bookable: true, is_active: true },
    { id: 'srv-f02', name: 'マンツーマンボディメイク（レギュラー60分）', chat_label: '筋力アップ・引き締めセッション（会員）', chat_description: '個別のトレーニングプログラムに沿った集中セッション', category: 'セッション', duration_minutes: 60, price: 8800, icon: '💪', is_online_bookable: true, is_active: true },
    { id: 'srv-f03', name: '姿勢改善・パートナーストレッチ＆リリース', chat_label: '肩こり腰痛予防・柔軟性向上ストレッチ', chat_description: 'トレーナーによるペアストレッチで可動域を広げます', category: 'ボディケア', duration_minutes: 45, price: 6600, icon: '🧘', is_online_bookable: true, is_active: true },
    { id: 'srv-f04', name: '食事指導＆個別プログラム無料カウンセリング', chat_label: 'ダイエットや目標について相談したい', chat_description: '生活習慣や目的に合わせた目標設定と食事アドバイス', category: '無料相談', duration_minutes: 30, price: 0, icon: '🎯', is_online_bookable: true, is_active: true },
  ],
  relax: [
    { id: 'srv-r01', name: '全身骨盤矯正＋深層筋膜リリース（60分）', chat_label: '肩こり・腰痛・身体の歪みを根本改善したい', chat_description: '骨盤の歪みと深層筋肉へアプローチし不調を解消', category: '整体', duration_minutes: 60, price: 6500, icon: '💆‍♂️', is_online_bookable: true, is_active: true },
    { id: 'srv-r02', name: 'アロマ深層リンパトリートメント（80分）', chat_label: '全身の疲れ・むくみをスッキリ癒やしたい', chat_description: '厳選オイルで老廃物を流し、極上のリラックスへ', category: 'リラク', duration_minutes: 80, price: 9900, icon: '🌿', is_online_bookable: true, is_active: true },
    { id: 'srv-r03', name: '極上ドライヘッドスパ＋眼精疲労ケア（45分）', chat_label: '頭痛・目の疲れ・睡眠の質を改善したい', chat_description: '水を使わない頭皮マッサージで頭と目の緊張をほぐします', category: 'ヘッドスパ', duration_minutes: 45, price: 4800, icon: '😴', is_online_bookable: true, is_active: true },
    { id: 'srv-r04', name: 'お身体の不調・コース選び無料相談', chat_label: 'どのメニューが良いか相談したい', chat_description: 'お悩みの部位や状態を伺い最適な施術をご案内します', category: '相談', duration_minutes: 20, price: 0, icon: '💬', is_online_bookable: true, is_active: true },
  ],
  general: [
    { id: 'srv-g01', name: '初回ご利用・総合ガイダンス枠', chat_label: '初めて利用する・案内を受けたい', chat_description: '施設のご利用方法やプランのご説明＋お試し利用', category: '初回利用', duration_minutes: 45, price: 2000, icon: '🔰', is_online_bookable: true, is_active: true },
    { id: 'srv-g02', name: '標準プラン・通常ご利用（60分）', chat_label: '標準プランで予約したい', chat_description: '通常のご利用枠（基本サポート付き）', category: '基本プラン', duration_minutes: 60, price: 5000, icon: '⭐', is_online_bookable: true, is_active: true },
    { id: 'srv-g03', name: '事前相談・個別ヒアリング（30分）', chat_label: '内容やプランについて事前に相談したい', chat_description: '担当スタッフがご質問やご要望にお答えします', category: '事前相談', duration_minutes: 30, price: 0, icon: '📝', is_online_bookable: true, is_active: true },
  ],
};

/**
 * サービスメニュー一覧を取得（Supabase同期）
 * @param {string} [industryType='medical']
 */
export async function getFacilityServices(industryType = 'medical') {
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
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return DEFAULT_SERVICES_BY_INDUSTRY[industryType] || DEFAULT_SERVICES_BY_INDUSTRY.medical;
}

/**
 * サービスメニューを保存
 */
export function saveFacilityServices(services) {
  localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
}

