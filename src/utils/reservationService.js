import { supabase } from './supabaseClient';
import { getFacilityProfile } from './facilityService';
import { createGoogleCalendarEvent } from './googleCalendarSyncService';
import { format, addDays, subDays, eachDayOfInterval, isSameDay } from 'date-fns';


const PATIENTS_SEED = [
  { name: '大塚 一樹', phone: '090-7549-8513', type: 'returning' },
  { name: '田中 浩二', phone: '090-1234-5678', type: 'new' },
  { name: '山田 太郎', phone: '080-3573-8274', type: 'returning' },
  { name: '佐藤 美咲', phone: '090-9999-8888', type: 'returning' },
  { name: '鈴木 一郎', phone: '090-4444-5555', type: 'new' },
  { name: '高橋 健一', phone: '090-2345-6789', type: 'returning' },
  { name: '渡辺 陽子', phone: '080-8765-4321', type: 'returning' },
  { name: '伊藤 誠', phone: '090-3456-7890', type: 'new' },
  { name: '中村 舞', phone: '080-9876-5432', type: 'returning' },
  { name: '小林 裕介', phone: '090-4567-8901', type: 'returning' },
  { name: '加藤 恵美', phone: '080-1122-3344', type: 'returning' },
  { name: '吉田 翔太', phone: '090-5678-9012', type: 'new' },
];

const MENUS_SEED = [
  '初診・一般診療（虫歯・検診）',
  '再診・治療の続き（虫歯処置）',
  '定期検診・歯石クリーニング',
  'オフィスホワイトニング',
  'クラウン・インレー装着',
  'PMTC・着色除去＆フッ素',
  '矯正・インプラント無料相談',
];

/**
 * Supabaseから予約一覧を取得（0件の場合は自動シード投入）
 */
export async function fetchFacilityReservations(facilityId, staffs = []) {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        facility_id,
        customer_id,
        staff_id,
        start_at,
        end_at,
        status,
        customer_type,
        ai_summary,
        staff_memo,
        google_event_id,
        staffs (
          id,
          name,
          title,
          badge_color,
          google_calendar_id
        ),
        customers (
          id,
          name,
          phone
        )
      `)
      .order('start_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((r) => {
        const start = new Date(r.start_at);
        const end = new Date(r.end_at);
        return {
          id: r.id,
          staff_id: r.staff_id,
          staff_name: r.staffs?.name || 'スタッフ',
          badge_color: r.staffs?.badge_color || '#3B82F6',
          google_calendar_id: r.staffs?.google_calendar_id || '',
          google_event_id: r.google_event_id,
          customer_name: r.customers?.name || '予約患者',
          customer_phone: r.customers?.phone || '',
          customer_type: r.customer_type || 'returning',
          menu_name: r.ai_summary || '診療・定期検診',
          start_time: format(start, 'HH:mm'),
          end_time: format(end, 'HH:mm'),
          date: format(start, 'yyyy-MM-dd'),
          status: r.status || 'confirmed',
          memo: r.staff_memo || r.ai_summary || '',
        };
      });
    }

    return [];
  } catch (e) {
    console.error('Supabase予約取得エラー:', e);
  }

  return [];
}

/**
 * Supabaseへの予約自動シード投入
 */
export async function autoSeedReservationsToSupabase(facilityId, staffs) {
  if (!supabase || !staffs || staffs.length === 0) return;

  try {
    // 1. 顧客レコードをSupabaseに投入
    const customerRecords = PATIENTS_SEED.map((p, idx) => ({
      facility_id: facilityId || null,
      customer_code: `PT-${1000 + idx}`,
      name: p.name,
      phone: p.phone,
      customer_rank: p.type === 'returning' ? 'regular' : 'new',
    }));

    const { data: insertedCustomers } = await supabase
      .from('customers')
      .insert(customerRecords)
      .select();

    const customerPool = insertedCustomers || [];

    // 2. 予約レコードを生成（今日〜前後3日間、各スタッフ6〜7割埋まり）
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 1),
      end: addDays(today, 5),
    });

    const slots = [
      { start: '09:30', end: '10:00' },
      { start: '10:00', end: '10:30' },
      { start: '10:30', end: '11:00' },
      { start: '11:00', end: '11:30' },
      { start: '11:30', end: '12:00' },
      { start: '14:30', end: '15:00' },
      { start: '15:00', end: '15:30' },
      { start: '15:30', end: '16:00' },
      { start: '16:00', end: '16:30' },
      { start: '16:30', end: '17:00' },
      { start: '17:00', end: '17:30' },
    ];

    const reservationsToInsert = [];
    let pIdx = 0;

    days.forEach((d) => {
      // 日曜(0), 木曜(4)はスキップ
      if (d.getDay() === 0 || d.getDay() === 4) return;

      const dateStr = format(d, 'yyyy-MM-dd');
      const isPast = d < new Date(today.setHours(0, 0, 0, 0));
      const isCurrent = isSameDay(d, new Date());

      staffs.forEach((staff, sIdx) => {
        slots.forEach((slot, slIdx) => {
          const rand = ((d.getDate() * 19 + sIdx * 29 + slIdx * 31) % 100) / 100;
          if (rand < 0.65) {
            const cus = customerPool[pIdx % customerPool.length] || PATIENTS_SEED[0];
            const menu = MENUS_SEED[(sIdx + slIdx) % MENUS_SEED.length];
            pIdx++;

            let status = 'confirmed';
            if (isPast) status = 'completed';
            else if (isCurrent && slIdx <= 3) status = 'completed';
            else if (isCurrent && slIdx <= 5) status = 'checked_in';

            const startIso = `${dateStr}T${slot.start}:00+09:00`;
            const endIso = `${dateStr}T${slot.end}:00+09:00`;

            reservationsToInsert.push({
              facility_id: facilityId || null,
              staff_id: staff.id || null,
              customer_id: cus.id || null,
              start_at: startIso,
              end_at: endIso,
              status,
              customer_type: cus.customer_rank === 'new' ? 'new' : 'returning',
              ai_summary: menu,
              staff_memo: `${cus.name} 様の事前問診・申し送りメモ`,
              google_event_id: staff.google_calendar_id ? `gcal-${staff.id?.slice(0, 4)}-${slIdx}` : null,
            });
          }
        });
      });
    });

    if (reservationsToInsert.length > 0) {
      await supabase.from('reservations').insert(reservationsToInsert);
      console.log(`Supabaseに ${reservationsToInsert.length} 件の予約レコードを投入しました！`);
    }
  } catch (err) {
    console.error('予約シード投入エラー:', err);
  }
}

/**
 * 予約の新規作成
 */
export async function createReservationInDb(reservationData, facilityId) {
  if (!supabase) return { success: true };

  try {
    // 顧客を探すか作成
    let customerId = null;
    const { data: matchedCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', reservationData.customer_phone)
      .maybeSingle();

    if (matchedCustomer) {
      customerId = matchedCustomer.id;
    } else {
      const { data: newCust } = await supabase
        .from('customers')
        .insert([{
          facility_id: facilityId,
          name: reservationData.customer_name,
          phone: reservationData.customer_phone,
          customer_rank: reservationData.customer_type === 'new' ? 'new' : 'regular',
        }])
        .select()
        .single();
      if (newCust) customerId = newCust.id;
    }

    const startIso = `${reservationData.date}T${reservationData.start_time}:00+09:00`;
    const endIso = `${reservationData.date}T${reservationData.end_time}:00+09:00`;

    const { data: newRes, error } = await supabase
      .from('reservations')
      .insert([{
        facility_id: facilityId,
        staff_id: reservationData.staff_id || null,
        customer_id: customerId,
        start_at: startIso,
        end_at: endIso,
        status: 'confirmed',
        customer_type: reservationData.customer_type || 'returning',
        ai_summary: reservationData.menu_name,
        staff_memo: reservationData.memo || '',
      }])
      .select()
      .single();

    if (!error && newRes) {
      // Googleカレンダー同期
      if (reservationData.google_calendar_id) {
        await createGoogleCalendarEvent({
          calendarId: reservationData.google_calendar_id,
          customerName: reservationData.customer_name,
          phone: reservationData.customer_phone,
          menuName: reservationData.menu_name,
          startAt: startIso,
          endAt: endIso,
          memo: reservationData.memo,
          reservationId: newRes.id,
        });
      }
      return { success: true, data: newRes };
    }
  } catch (e) {
    console.error('予約作成エラー:', e);
  }
  return { success: false };
}

/**
 * 予約ステータスの更新
 * 1. キャンセル時 (→ cancelled): Googleカレンダーからイベントを削除して空き枠を復活
 * 2. キャンセル復活時 (cancelled → confirmed等): Googleカレンダーにイベントを再作成して新IDを保存
 */
export async function updateReservationStatusInDb(reservationId, newStatus) {
  if (supabase && reservationId && reservationId.includes('-') && !reservationId.startsWith('res-')) {
    try {
      // 現在のレコードを取得
      const { data: currentRes } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          start_at,
          end_at,
          ai_summary,
          staff_memo,
          google_event_id,
          staffs ( google_calendar_id, name ),
          customers ( name, phone )
        `)
        .eq('id', reservationId)
        .maybeSingle();

      let newGoogleEventId = currentRes?.google_event_id;

      if (currentRes) {
        const calId = currentRes.staffs?.google_calendar_id;

        // パターンA: キャンセルに変更された場合 → Googleカレンダーから削除
        if (newStatus === 'cancelled' && currentRes.status !== 'cancelled' && currentRes.google_event_id && calId) {
          const { deleteGoogleCalendarEvent } = await import('./googleCalendarSyncService');
          await deleteGoogleCalendarEvent({
            calendarId: calId,
            eventId: currentRes.google_event_id,
          });
          newGoogleEventId = null;
        }

        // パターンB: キャンセルから確定/受付等に戻された場合 → Googleカレンダーに再作成
        else if (currentRes.status === 'cancelled' && newStatus !== 'cancelled' && calId) {
          const { createGoogleCalendarEvent } = await import('./googleCalendarSyncService');
          const createdId = await createGoogleCalendarEvent({
            calendarId: calId,
            customerName: currentRes.customers?.name || '予約患者',
            phone: currentRes.customers?.phone || '',
            menuName: currentRes.ai_summary || '診療',
            startAt: currentRes.start_at,
            endAt: currentRes.end_at,
            memo: currentRes.staff_memo || '',
            reservationId: currentRes.id,
          });
          if (createdId) newGoogleEventId = createdId;
        }
      }

      // Supabase を更新
      const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newGoogleEventId !== undefined) {
        updatePayload.google_event_id = newGoogleEventId;
      }

      await supabase
        .from('reservations')
        .update(updatePayload)
        .eq('id', reservationId);

      return { success: true, newGoogleEventId };
    } catch (e) {
      console.error('予約ステータス更新エラー:', e);
    }
  }
  return { success: false };
}

/**
 * QRコードのテキストから患者・予約を照合し、当日予約を「受付完了（checked_in）」に更新
 * @param {string} qrText - QRコードから読み取った文字列
 * @param {string} [facilityId] - 施設UUID
 */
export async function checkInByQrCode(qrText, facilityId = null) {
  if (!qrText || typeof qrText !== 'string') {
    return { success: false, error: 'invalid_data', message: 'QRコードの内容が正しく読み取れませんでした。' };
  }

  const raw = qrText.trim();
  let extractedReservationId = null;
  let extractedCustomerId = null;
  let extractedPhone = null;
  let extractedCustomerCode = null;

  // 1. JSONパース試行
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      extractedReservationId = parsed.reservation_id || parsed.resId || parsed.id || null;
      extractedCustomerId = parsed.customer_id || parsed.customerId || parsed.patient_id || null;
      extractedPhone = parsed.phone || parsed.tel || null;
      extractedCustomerCode = parsed.customer_code || parsed.code || null;
    } catch (e) {}
  }

  // 2. URLクエリパース試行
  if (!extractedReservationId && (raw.includes('?') || raw.startsWith('http'))) {
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://dummy.example.com/${raw}`);
      extractedReservationId = url.searchParams.get('res_id') || url.searchParams.get('reservation_id');
      extractedCustomerId = url.searchParams.get('patient_id') || url.searchParams.get('customer_id');
      extractedPhone = url.searchParams.get('phone') || url.searchParams.get('tel');
      extractedCustomerCode = url.searchParams.get('code') || url.searchParams.get('customer_code');
    } catch (e) {}
  }

  // 3. プレーンテキスト判定
  if (!extractedReservationId && !extractedCustomerId && !extractedPhone && !extractedCustomerCode) {
    if (raw.startsWith('PT-') || raw.startsWith('pt-')) {
      extractedCustomerCode = raw;
    } else if (/^0\d{9,10}$/.test(raw.replace(/[\s-]/g, ''))) {
      extractedPhone = raw.replace(/[\s-]/g, '');
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
      // UUID形式の場合はまず予約IDとして試す
      extractedReservationId = raw;
    } else {
      extractedCustomerCode = raw;
    }
  }

  if (!supabase) {
    return {
      success: true,
      alreadyCheckedIn: false,
      reservation: {
        id: 'mock-res-001',
        customer_name: '大塚 一樹',
        customer_phone: '090-7549-8513',
        customer_code: 'PT-1000',
        staff_name: '前田 院長',
        start_time: '10:30',
        end_time: '11:00',
        menu_name: '初診・一般診療（虫歯・検診）',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'checked_in',
      },
      message: '大塚 一樹 様の受付が完了しました（デモモード）',
    };
  }

  try {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const startOfDay = `${todayStr}T00:00:00+09:00`;
    const endOfDay = `${todayStr}T23:59:59+09:00`;

    // 予約IDが特定できている場合
    if (extractedReservationId) {
      const { data: resById } = await supabase
        .from('reservations')
        .select(`
          id, start_at, end_at, status, ai_summary, staff_memo,
          staffs ( name, title, badge_color ),
          customers ( id, name, phone, customer_code )
        `)
        .eq('id', extractedReservationId)
        .maybeSingle();

      if (resById) {
        return await executeCheckInOnReservation(resById);
      }
    }

    // 顧客ID/電話番号/診察券コードから当日予約を検索
    let matchedCustomerId = extractedCustomerId;

    if (!matchedCustomerId && (extractedPhone || extractedCustomerCode)) {
      let custQuery = supabase.from('customers').select('id, name, phone, customer_code');
      if (extractedPhone) {
        const clean = extractedPhone.replace(/[\s-]/g, '');
        custQuery = custQuery.or(`phone.eq.${extractedPhone},phone.eq.${clean}`);
      } else if (extractedCustomerCode) {
        custQuery = custQuery.eq('customer_code', extractedCustomerCode);
      }
      if (facilityId) {
        custQuery = custQuery.or(`facility_id.eq.${facilityId},facility_id.is.null`);
      }

      const { data: custRows } = await custQuery.limit(1);
      if (custRows && custRows.length > 0) {
        matchedCustomerId = custRows[0].id;
      }
    }

    // 当日予約をクエリ
    let resQuery = supabase
      .from('reservations')
      .select(`
        id, start_at, end_at, status, ai_summary, staff_memo,
        staffs ( name, title, badge_color ),
        customers ( id, name, phone, customer_code )
      `)
      .gte('start_at', startOfDay)
      .lte('start_at', endOfDay)
      .order('start_at', { ascending: true });

    if (matchedCustomerId) {
      resQuery = resQuery.eq('customer_id', matchedCustomerId);
    } else if (extractedReservationId) {
      resQuery = resQuery.eq('id', extractedReservationId);
    } else {
      // 識別子に合致する顧客が見つからない
      return {
        success: false,
        error: 'customer_not_found',
        message: '該当する患者情報が見つかりませんでした。診察券番号をご確認ください。',
      };
    }

    if (facilityId) {
      resQuery = resQuery.or(`facility_id.eq.${facilityId},facility_id.is.null`);
    }

    const { data: matchedReservations, error } = await resQuery;

    if (!error && matchedReservations && matchedReservations.length > 0) {
      // 当日予約が見つかった（未受付のものを優先）
      const targetRes =
        matchedReservations.find((r) => r.status === 'confirmed') ||
        matchedReservations[0];
      return await executeCheckInOnReservation(targetRes);
    }

    // 当日になければ、直近の直近予約（直近3日以内）も確認
    const recentResQuery = supabase
      .from('reservations')
      .select(`
        id, start_at, end_at, status, ai_summary, staff_memo,
        staffs ( name, title, badge_color ),
        customers ( id, name, phone, customer_code )
      `)
      .eq('customer_id', matchedCustomerId)
      .order('start_at', { ascending: false })
      .limit(1);

    const { data: recentReservations } = await recentResQuery;
    if (recentReservations && recentReservations.length > 0) {
      const recent = recentReservations[0];
      const recentDate = format(new Date(recent.start_at), 'yyyy-MM-dd');
      return {
        success: false,
        error: 'no_today_reservation',
        message: `本日のご予約はありません。（直近のご予約: ${recentDate} ${format(new Date(recent.start_at), 'HH:mm')}）`,
        recentReservation: {
          customer_name: recent.customers?.name || '予約患者',
          date: recentDate,
          time: format(new Date(recent.start_at), 'HH:mm'),
        },
      };
    }

    return {
      success: false,
      error: 'no_reservation',
      message: '本日のご予約が見つかりませんでした。受付スタッフにお声がけください。',
    };
  } catch (e) {
    console.error('QRチェックイン処理エラー:', e);
    return { success: false, error: 'server_error', message: '受付照合中にエラーが発生しました。' };
  }
}

/**
 * 内部ヘルパー: 予約レコードに対してステータスを checked_in に更新しフォーマット済み結果を返す
 */
async function executeCheckInOnReservation(resRecord) {
  const isAlreadyCheckedIn = resRecord.status === 'checked_in';
  const isCompleted = resRecord.status === 'completed';

  const start = new Date(resRecord.start_at);
  const end = new Date(resRecord.end_at);

  const formattedInfo = {
    id: resRecord.id,
    customer_name: resRecord.customers?.name || '予約患者',
    customer_phone: resRecord.customers?.phone || '',
    customer_code: resRecord.customers?.customer_code || '',
    staff_name: resRecord.staffs?.name || '担当スタッフ',
    staff_title: resRecord.staffs?.title || '',
    badge_color: resRecord.staffs?.badge_color || '#3B82F6',
    start_time: format(start, 'HH:mm'),
    end_time: format(end, 'HH:mm'),
    date: format(start, 'yyyy-MM-dd'),
    menu_name: resRecord.ai_summary || '一般診療・検診',
    memo: resRecord.staff_memo || '',
    status: isAlreadyCheckedIn ? 'checked_in' : isCompleted ? 'completed' : 'checked_in',
  };

  if (isAlreadyCheckedIn) {
    return {
      success: true,
      alreadyCheckedIn: true,
      reservation: formattedInfo,
      message: `${formattedInfo.customer_name} 様は既に本日受付済みです。`,
    };
  }

  if (isCompleted) {
    return {
      success: true,
      alreadyCheckedIn: true,
      reservation: formattedInfo,
      message: `${formattedInfo.customer_name} 様の本日の診療は完了しています。`,
    };
  }

  // ステータスを checked_in に更新
  await updateReservationStatusInDb(resRecord.id, 'checked_in');

  return {
    success: true,
    alreadyCheckedIn: false,
    reservation: formattedInfo,
    message: `${formattedInfo.customer_name} 様の来院受付が完了しました！`,
  };
}



