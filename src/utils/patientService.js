import { supabase } from './supabaseClient';

// ローカルキャッシュキー（スタッフ・管理者専用のセッションストレージのみ使用）
// 【セキュリティ注意】患者の個人情報（氏名・電話番号・LINEユーザーID）を
// localStorage に一覧保存することは禁止です（共用端末での情報漏洩リスク）。
// 以下のキーは患者本人の直近セッション情報のみを保存するために限定使用します。
const LOCAL_LAST_PATIENT_KEY = 'last_patient_info';
// ※ inteve_connect_customers_cache は廃止済み（全患者一覧のlocalStorage保存禁止）

/**
 * LINE固有ユーザーID（line_user_id）でSupabaseのcustomersテーブルを照合する
 *
 * 【セキュリティ設計】
 * - このクエリは anon ユーザーから実行される。
 * - Supabase RLS の "customers_anon_insert" ポリシーは anon の SELECT を許可していないため、
 *   RLSが正しく設定されている環境ではこのクエリは常に空配列 or Permission Denied を返す。
 * - anon での照合が必要な場合は、Supabase Edge Function（サーバーサイド）経由で
 *   service_role キーを使って照合し、必要最小限の情報のみ返すアーキテクチャを推奨。
 * - 現時点ではRLS設定の移行期間として、エラー時は新患として安全にフォールバックする。
 *
 * @param {string} lineUserId - LINEの固有ユーザーID（例: Uxxxx...）
 * @param {string} [facilityId] - 施設ID
 * @returns {Promise<object>} 照合結果 { isFound: boolean, isReturning: boolean, record: object|null }
 */
export async function findPatientByLineUserId(lineUserId, facilityId = null) {
  if (!lineUserId) {
    return { isFound: false, isReturning: false, record: null };
  }

  // Supabase から照合（RLSが有効な場合はこのクエリはポリシーにより制限される）
  if (supabase) {
    try {
      let query = supabase.from('customers').select('*').eq('line_user_id', lineUserId);
      if (facilityId) {
        query = query.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data, error } = await query.limit(1);

      // RLSエラー（Permission Denied）の場合は新患として安全にフォールバック
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          console.info('[patientService] customers SELECT はRLSにより制限されています（正常）。新患フローへ移行します。');
        } else {
          console.warn('Supabase LINE患者照合エラー:', error);
        }
        // エラーの場合は新患として処理（照合不可 = 安全側に倒す）
      } else if (data && data.length > 0) {
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

        // 照合成功時は localStorage に全患者キャッシュではなく直近患者のみ保存
        try {
          localStorage.setItem(LOCAL_LAST_PATIENT_KEY, JSON.stringify({
            id: customer.id,
            name: customer.name || customer.line_display_name,
            phone: customer.phone || '',
            line_user_id: customer.line_user_id,
            customer_code: customerCode,
          }));
        } catch (e) {}

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
      } else if (data && data.length === 0) {
        // DBに存在しない LINE ユーザー → キャッシュも削除
        try { localStorage.removeItem(LOCAL_LAST_PATIENT_KEY); } catch (e) {}
      }
    } catch (err) {
      console.warn('Supabase LINE患者照合エラー:', err);
    }
  }

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

  // 直近患者のセッション情報のみ保存（共用端末漏洩防止のため一覧キャッシュは行わない）
  try {
    localStorage.setItem(LOCAL_LAST_PATIENT_KEY, JSON.stringify(customerRecord));
  } catch (_e) {}

  return {
    isReturning: patientType === 'returning' || Boolean(customerRecord.customer_code),
    patientType: patientType,
    customerCode: customerRecord.customer_code || `No.${customerRecord.id.substring(0, 5)}`,
    record: customerRecord,
  };
}

/**
 * 電話番号または氏名でSupabaseのcustomersテーブルを照合し、新患か再診かを判定する
 *
 * 【セキュリティ設計】
 * - RLSが正しく設定されている場合、anon ユーザーは customers の SELECT ができないため
 *   このクエリは Permission Denied またはゼロ件を返す。
 * - その場合は「新患」として安全にフォールバックする（照合エラー ≠ 新患確定ではないが、
 *   セキュリティ優先で新患フローへ誘導し、医院スタッフが来院時に確認する設計とする）。
 * - 将来的には Supabase Edge Function 経由での照合に移行する予定。
 *
 * @param {string} name - 患者氏名
 * @param {string} phone - 電話番号
 * @returns {Promise<object>} 照合結果 { isReturning: boolean, patientType: 'new'|'returning', customerCode: string, record: object|null }
 */
export async function matchPatient(name, phone) {
  const cleanPhone = (phone || '').replace(/[\s-]/g, '');
  const rawPhone = (phone || '').trim();
  const cleanName = (name || '').trim();

  // Supabase customers テーブルから照合（RLSが有効な場合は制限される）
  if (supabase && (cleanPhone || cleanName)) {
    try {
      let query = supabase.from('customers').select('*');

      if (cleanPhone) {
        query = query.or(`phone.eq.${rawPhone},phone.eq.${cleanPhone},name.eq.${cleanName}`);
      } else if (cleanName) {
        query = query.eq('name', cleanName);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        // RLS Permission Denied → 新患として処理（安全側にフォールバック）
        if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
          console.info('[patientService] customers SELECT はRLSにより制限されています（正常）。新患フローへ移行します。');
        } else {
          console.warn('Supabase患者照合エラー:', error);
        }
      } else if (data && data.length > 0) {
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

  // 該当患者が見つからない、またはRLS制限により照合不可の場合は新患（初診）として扱う
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
