import { supabase } from './supabaseClient';

/**
 * 電話番号または氏名でSupabaseのappointmentsテーブルを照合し、新患か再診かを判定する
 * @param {string} name - 患者氏名
 * @param {string} phone - 電話番号
 * @returns {Promise<object>} 照合結果 { isReturning: boolean, patientType: 'new'|'returning', record: object|null }
 */
export async function matchPatient(name, phone) {
  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  const cleanName = (name || '').trim();

  // 1. Supabaseが設定されていれば実DBから検索
  if (supabase && (cleanPhone || cleanName)) {
    try {
      // 電話番号で検索（ハイフンあり・なし両方に対応）
      let query = supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (cleanPhone) {
        // phoneカラムが一致するレコード
        // ハイフン区切り等も含めて部分一致または完全一致検索
        query = query.or(`phone.eq.${phone},phone.eq.${cleanPhone},patient_name.eq.${cleanName}`);
      } else if (cleanName) {
        query = query.eq('patient_name', cleanName);
      }

      const { data, error } = await query.limit(1);

      if (!error && data && data.length > 0) {
        const record = data[0];
        return {
          isReturning: true,
          patientType: 'returning',
          patientTypeLabel: '再診（通院歴あり）',
          record: {
            id: record.id,
            name: record.patient_name || cleanName,
            phone: record.phone || phone,
            last_visit: record.start_at ? record.start_at.substring(0, 10) : '過去来院あり',
            notes: record.ai_summary || record.menu_type || '過去の診療記録あり',
          },
        };
      }
    } catch (err) {
      console.warn('Supabase照合エラー（フォールバックします）:', err);
    }
  }

  // 2. モック照合（Supabaseに該当がなかった場合）
  const MOCK_PATIENTS = [
    { name: '大塚', phone: '090-7549-8513', id: 'PT-3797', last_visit: '2026-09-04' },
    { name: '山田', phone: '08035738274', id: 'PT-0ede', last_visit: '2026-09-04' },
    { name: '前田 健太', phone: '090-1234-5678', id: 'PT-10024', last_visit: '2025-10-15' },
  ];

  const matched = MOCK_PATIENTS.find(
    (p) => p.phone.replace(/[\s-]/g, '') === cleanPhone || (cleanName && p.name === cleanName)
  );

  if (matched) {
    return {
      isReturning: true,
      patientType: 'returning',
      patientTypeLabel: '再診（通院歴あり）',
      record: matched,
    };
  }

  return {
    isReturning: false,
    patientType: 'new',
    patientTypeLabel: '新患（初診）',
    record: null,
  };
}
