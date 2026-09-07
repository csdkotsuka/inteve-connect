import { supabase } from './supabaseClient';

const LOCAL_CUSTOMERS_KEY = 'inteve_connect_customers_cache';

/**
 * LINE固有ユーザーID（line_user_id）でSupabaseのcustomersテーブルを照合する
 * @param {string} lineUserId - LINEの固有ユーザーID（例: Uxxxx...）
 * @param {string} [facilityId] - 施設ID
 * @returns {Promise<object>} 照合結果 { isFound: boolean, isReturning: boolean, record: object|null }
 */
export async function findPatientByLineUserId(lineUserId, facilityId = null) {
  if (!lineUserId) {
    return { isFound: false, isReturning: false, record: null };
  }

  // 1. Supabase から検索
  if (supabase) {
    try {
      let query = supabase.from('customers').select('*').eq('line_user_id', lineUserId);
      if (facilityId) {
        query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data, error } = await query.limit(1);

      if (!error && data) {
        if (data.length > 0) {
          const customer = data[0];

          // 過去の予約履歴を1件取得
          let lastVisit = '受診歴あり';
          let notes = 'LINE連携済み患者';
          const { data: resData } = await supabase
            .from('reservations')
            .select('start_at, ai_summary, status')
            .eq('customer_id', customer.id)
            .order('start_at', { ascending: false })
            .limit(1);

          if (resData && resData.length > 0) {
            lastVisit = resData[0].start_at ? resData[0].start_at.substring(0, 10) : '受診歴あり';
            notes = resData[0].ai_summary || '受診歴あり';
          }

          const customerCode = customer.customer_code || `No.${customer.id.substring(0, 5)}`;

          return {
            isFound: true,
            isReturning: true,
            patientType: 'returning',
            patientTypeLabel: 'LINE連携済み（再診）',
            customerCode,
            customerRank: customer.customer_rank || 'regular',
            assigned_staff_id: customer.assigned_staff_id || null,
            record: {
              id: customer.id,
              name: customer.name || customer.line_display_name,
              phone: customer.phone || '',
              email: customer.email || '',
              line_user_id: customer.line_user_id,
              line_display_name: customer.line_display_name,
              line_picture_url: customer.line_picture_url,
              customer_code: customerCode,
              assigned_staff_id: customer.assigned_staff_id || null,
              last_visit: lastVisit,
              notes: notes,
            },
          };
        } else {
          // Supabase実DBに該当LINE患者が存在しない場合（レコード削除直後、または未登録の場合）
          // ローカルキャッシュとの不整合を防ぐため、該当line_user_idをローカルストレージからも削除
          try {
            const saved = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
            if (saved) {
              const customers = JSON.parse(saved);
              const filtered = customers.filter((c) => c.line_user_id !== lineUserId);
              localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(filtered));
            }
            localStorage.removeItem('last_patient_info');
          } catch (e) {}

          return {
            isFound: false,
            isReturning: false,
            patientType: 'new',
            patientTypeLabel: 'LINE未連携（初診）',
            customerCode: null,
            customerRank: 'new',
            record: null,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase LINE患者照合エラー:', err);
    }
  }

  // 2. Supabaseオフライン時のみ、ローカルキャッシュからのフォールバック検索
  try {
    const saved = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (saved) {
      const customers = JSON.parse(saved);
      const match = customers.find((c) => c.line_user_id === lineUserId);
      if (match) {
        return {
          isFound: true,
          isReturning: true,
          patientType: 'returning',
          patientTypeLabel: 'LINE連携済み（再診）',
          customerCode: match.customer_code || 'No.LINE',
          customerRank: 'regular',
          record: match,
        };
      }
    }
  } catch (e) {}

  return {
    isFound: false,
    isReturning: false,
    patientType: 'new',
    patientTypeLabel: 'LINE未連携（初診）',
    customerCode: null,
    customerRank: 'new',
    record: null,
  };
}

/**
 * LINEアカウントとお名前・電話番号を紐付けてSupabaseに保存/更新する
 */
export async function registerOrLinkLinePatient({
  lineUserId,
  lineDisplayName = '',
  linePictureUrl = '',
  name,
  phone,
  email = '',
  facilityId = null,
  patientType = 'new',
}) {
  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  const cleanName = (name || '').trim();
  const rawPhone = (phone || '').trim();

  let customerRecord = null;

  if (supabase) {
    try {
      // 1. まず line_user_id で既存レコードがあるか確認
      if (lineUserId) {
        const { data: existingLine } = await supabase
          .from('customers')
          .select('*')
          .eq('line_user_id', lineUserId)
          .maybeSingle();

        if (existingLine) {
          // 既存LINE患者の更新
          const { data: updated } = await supabase
            .from('customers')
            .update({
              name: cleanName || existingLine.name,
              phone: rawPhone || existingLine.phone,
              email: email || existingLine.email,
              is_line_linked: true,
              line_display_name: lineDisplayName || existingLine.line_display_name,
              line_picture_url: linePictureUrl || existingLine.line_picture_url,
            })
            .eq('id', existingLine.id)
            .select()
            .single();

          customerRecord = updated || existingLine;
        }
      }

      // 2. LINE IDで見つからない場合、電話番号・氏名で既存カルテがあるか照合して紐付け
      if (!customerRecord && (cleanPhone || cleanName)) {
        let query = supabase.from('customers').select('*');
        if (cleanPhone) {
          query = query.or(`phone.eq.${rawPhone},phone.eq.${cleanPhone}`);
        } else if (cleanName) {
          query = query.eq('name', cleanName);
        }

        const { data: phoneMatch } = await query.limit(1);

        if (phoneMatch && phoneMatch.length > 0) {
          const matched = phoneMatch[0];
          // 既存患者にLINE IDを紐付け更新
          const { data: linked } = await supabase
            .from('customers')
            .update({
              line_user_id: lineUserId || matched.line_user_id,
              is_line_linked: Boolean(lineUserId || matched.line_user_id),
              line_display_name: lineDisplayName || matched.line_display_name,
              line_picture_url: linePictureUrl || matched.line_picture_url,
              name: cleanName || matched.name,
              email: email || matched.email,
            })
            .eq('id', matched.id)
            .select()
            .single();

          customerRecord = linked || matched;
        }
      }

      // 3. どちらも見つからない場合は新規患者レコードを登録
      if (!customerRecord) {
        const newCode = `C${Date.now().toString().slice(-6)}`;
        const payload = {
          name: cleanName || lineDisplayName || 'LINE 予約患者',
          phone: rawPhone || '090-0000-0000',
          email: email || '',
          line_user_id: lineUserId || null,
          is_line_linked: Boolean(lineUserId),
          line_display_name: lineDisplayName,
          line_picture_url: linePictureUrl,
          facility_id: facilityId || null,
          customer_code: newCode,
          customer_rank: patientType === 'returning' ? 'regular' : 'new',
        };

        const { data: created, error } = await supabase
          .from('customers')
          .insert([payload])
          .select()
          .single();

        if (!error && created) {
          customerRecord = created;
        }
      }
    } catch (err) {
      console.error('Supabase LINE患者登録/連携エラー:', err);
    }
  }

  // フォールバック（ローカルキャッシュ保存）
  if (!customerRecord) {
    customerRecord = {
      id: `cust-${Date.now()}`,
      name: cleanName || lineDisplayName || 'LINE 予約患者',
      phone: rawPhone || '090-0000-0000',
      email: email || '',
      line_user_id: lineUserId || null,
      line_display_name: lineDisplayName,
      line_picture_url: linePictureUrl,
      customer_code: `C${Date.now().toString().slice(-4)}`,
    };
  }

  // ローカルキャッシュに保存
  try {
    const saved = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    const list = saved ? JSON.parse(saved) : [];
    const filtered = list.filter((c) => c.line_user_id !== lineUserId && c.id !== customerRecord.id);
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify([...filtered, customerRecord]));
  } catch (e) {}

  return {
    isReturning: patientType === 'returning' || Boolean(customerRecord.customer_code),
    patientType: patientType,
    customerCode: customerRecord.customer_code || `No.${customerRecord.id.substring(0, 5)}`,
    record: customerRecord,
  };
}

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

