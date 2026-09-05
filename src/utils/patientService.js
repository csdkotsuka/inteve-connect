import { supabase } from './supabaseClient';

/**
 * 電話番号または氏名でSupabaseのcustomersテーブルを照合し、新患か再診かを判定する
 * @param {string} name - 患者氏名
 * @param {string} phone - 電話番号
 * @returns {Promise<object>} 照合結果 { isReturning: boolean, patientType: 'new'|'returning', customerCode: string, record: object|null }
 */
export async function matchPatient(name, phone) {
  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  const rawPhone = (phone || '').trim();
  const cleanName = (name || '').trim();

  // 1. Supabaseの customers テーブルから検索
  if (supabase && (cleanPhone || cleanName)) {
    try {
      let query = supabase.from('customers').select('*');

      if (cleanPhone) {
        query = query.or(`phone.eq.${rawPhone},phone.eq.${cleanPhone},name.eq.${cleanName}`);
      } else if (cleanName) {
        query = query.eq('name', cleanName);
      }

      const { data, error } = await query.limit(1);

      if (!error && data && data.length > 0) {
        const customer = data[0];

        // 過去の予約履歴を1件取得
        let lastVisit = '過去受診あり';
        let notes = '受診歴あり';
        const { data: resData } = await supabase
          .from('reservations')
          .select('start_at, ai_summary, status')
          .eq('customer_id', customer.id)
          .order('start_at', { ascending: false })
          .limit(1);

        if (resData && resData.length > 0) {
          lastVisit = resData[0].start_at ? resData[0].start_at.substring(0, 10) : '過去受診あり';
          notes = resData[0].ai_summary || '受診歴あり';
        }

        const customerCode = customer.customer_code || `No.${customer.id.substring(0, 5)}`;

        return {
          isReturning: true,
          patientType: 'returning',
          patientTypeLabel: '再診（通院歴あり）',
          customerCode,
          customerRank: customer.customer_rank || 'regular',
          assigned_staff_id: customer.assigned_staff_id || null,
          record: {
            id: customer.id,
            name: customer.name || cleanName,
            phone: customer.phone || phone,
            customer_code: customerCode,
            assigned_staff_id: customer.assigned_staff_id || null,
            last_visit: lastVisit,
            notes: notes,
          },
        };
      }
    } catch (err) {
      console.warn('Supabase患者照合エラー:', err);
    }
  }

  // 2. 該当患者が見つからない場合は新患（初診）として扱う
  return {
    isReturning: false,
    patientType: 'new',
    patientTypeLabel: '新患（初診）',
    customerCode: null,
    customerRank: 'new',
    assigned_staff_id: null,
    record: null,
  };
}
