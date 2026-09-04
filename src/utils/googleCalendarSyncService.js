import { supabase } from './supabaseClient';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

// スタッフのGoogleカレンダーID
export const STAFF_CALENDARS = [
  { name: '前田 院長',  google_calendar_id: 'c_2b3dafc739d82dcefc4c2f7ce87e1a7d3ea50e9527daa531652bc6a3864a826c@group.calendar.google.com' },
  { name: '佐藤 医師',  google_calendar_id: 'c_36188ef578d225630a927fbd832617c43efe8e98893c4f4bab35b9b448ebdf93@group.calendar.google.com' },
  { name: '高橋 衛生士', google_calendar_id: 'c_f60e73e582f959e85eb56c51d25d35b9519136ac8d5276bc4f1c59a384b8f119@group.calendar.google.com' },
  { name: '伊藤 受付',  google_calendar_id: 'c_7f247bb4fa8f015cb4f6c9b86ffbff65439c0d963643ca4f6538939bc0ebefc7@group.calendar.google.com' },
  { name: '渡辺 衛生士', google_calendar_id: 'c_d6d616b9d3817ab19538507784881e1413146bc70452bcca4df670ec6af576c5@group.calendar.google.com' },
];

/**
 * GAS API を安全に呼び出すヘルパー（GETパラメータ経由でCORS完全回避）
 */
export async function callGasApi(action, params = {}) {
  if (!GAS_API_URL) return { ok: false, error: 'GAS_API_URL未設定' };

  try {
    const url = new URL(GAS_API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    });

    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    console.error(`[GAS API] ${action} エラー:`, e);
    return { ok: false, error: e.message };
  }
}

/**
 * イベントタイトルを高度にパースして「患者名」「メニュー名」を抽出
 */
export function parseEventTitle(title = '') {
  let customerName = '予約患者';
  let menuName = '一般診療・定期検診';

  const p1 = title.match(/【(.+?)】\s*(.+?)(?:様|$)/);
  if (p1) return { menuName: p1[1].trim(), customerName: p1[2].trim() };

  const p2 = title.match(/\[.+?\]\s*(.+?)\s*様(?:\s*\((.+?)\))?/);
  if (p2) return { customerName: p2[1].trim(), menuName: p2[2] ? p2[2].trim() : menuName };

  const p3 = title.match(/^(.+?)\s*様(?:\s*-\s*(.+))?/);
  if (p3) return { customerName: p3[1].trim(), menuName: p3[2] ? p3[2].trim() : menuName };

  customerName = title.replace(/様/g, '').trim() || '予約患者';
  return { customerName, menuName };
}

/**
 * Googleカレンダーに新規予約を作成する（手動予約・Web予約時）
 */
export async function createGoogleCalendarEvent({
  calendarId,
  customerName,
  phone,
  menuName,
  startAt,
  endAt,
  memo = '',
  reservationId = null,
}) {
  if (!calendarId) return null;

  try {
    const json = await callGasApi('create_calendar_event', {
      calendarId,
      customerName,
      phone: phone || '',
      menuName: menuName || '診療',
      startAt,
      endAt,
      memo: memo || '',
      reservationId: reservationId || '',
    });

    if (json.ok && json.eventId) {
      if (supabase && reservationId) {
        await supabase
          .from('reservations')
          .update({ google_event_id: json.eventId, updated_at: new Date().toISOString() })
          .eq('id', reservationId);
      }
      return json.eventId;
    }
  } catch (e) {
    console.error('[GoogleCalSync] 新規作成エラー:', e);
  }
  return null;
}

/**
 * 予約の移動・日時変更時にGoogleカレンダー側をリアルタイム自動同期する
 */
export async function moveOrUpdateCalendarReservation({
  oldCalendarId,
  newCalendarId,
  eventId,
  customerName,
  phone,
  menuName,
  startAt,
  endAt,
  memo = '',
  reservationId,
}) {
  try {
    let finalEventId = eventId;

    if (oldCalendarId && newCalendarId && oldCalendarId !== newCalendarId) {
      if (eventId) {
        await callGasApi('delete_calendar_event', { calendarId: oldCalendarId, eventId });
      }

      const createRes = await callGasApi('create_calendar_event', {
        calendarId: newCalendarId,
        customerName,
        phone: phone || '',
        menuName: menuName || '診療',
        startAt,
        endAt,
        memo: memo || '',
        reservationId: reservationId || '',
      });

      if (createRes.ok && createRes.eventId) {
        finalEventId = createRes.eventId;
      }

    } else if (newCalendarId) {
      const updateRes = await callGasApi('update_calendar_event', {
        calendarId: newCalendarId,
        eventId: eventId || '',
        startAt,
        endAt,
        title: `${customerName} 様 - ${menuName || '診療'}`,
        customerName,
        phone: phone || '',
        menuName: menuName || '診療',
        memo: memo || '',
        reservationId: reservationId || '',
      });

      if (updateRes.ok && updateRes.eventId) {
        finalEventId = updateRes.eventId;
      }
    }

    if (supabase && reservationId && finalEventId) {
      await supabase
        .from('reservations')
        .update({ google_event_id: finalEventId, updated_at: new Date().toISOString() })
        .eq('id', reservationId);
    }

    return { success: true, eventId: finalEventId };
  } catch (e) {
    console.error('[GoogleCalSync] 移動更新同期エラー:', e);
    return { success: false, error: e.message };
  }
}

/**
 * 予約キャンセル時にGoogleカレンダーからイベントを削除する
 */
export async function deleteGoogleCalendarEvent({ calendarId, eventId }) {
  if (!calendarId || !eventId) return;
  try {
    await callGasApi('delete_calendar_event', { calendarId, eventId });
  } catch (e) {
    console.warn('[GoogleCalSync] カレンダー削除エラー:', e);
  }
}

/**
 * ══════════════════════════════════════════════════════════════
 * メイン同期関数（超高速・完全双方向同期）
 *
 * 1. 全スタッフのカレンダーイベントを並列取得
 * 2. Googleカレンダーに存在しないSupabase予約を一括削除
 * 3. 新規予約を一括バルクINSERT
 * ══════════════════════════════════════════════════════════════
 */
export async function batchSyncGoogleCalendar(facilityId, staffsFromDb) {
  if (!GAS_API_URL) return { syncedCount: 0, error: 'GAS URL未設定' };
  if (!supabase) return { syncedCount: 0, error: 'Supabase未接続' };

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 90);
  const fromIso = from.toISOString();
  const toIso   = to.toISOString();

  // 1. スタッフマッピング
  let staffMap = {};
  if (staffsFromDb && staffsFromDb.length > 0) {
    staffsFromDb.forEach((s) => {
      if (s.google_calendar_id) staffMap[s.google_calendar_id] = s;
    });
  } else {
    const { data: dbStaffs } = await supabase.from('staffs').select('id, name, google_calendar_id');
    (dbStaffs || []).forEach((s) => {
      if (s.google_calendar_id) staffMap[s.google_calendar_id] = s;
    });
  }

  // 2. 既存顧客
  const { data: existingCustomers } = await supabase.from('customers').select('id, name').limit(5000);
  const customerMapByName = new Map();
  (existingCustomers || []).forEach((c) => {
    if (c.name) customerMapByName.set(c.name.trim(), c.id);
  });

  // 3. Supabase上の既存予約一覧を取得（上限5000件）
  const { data: existingRecs } = await supabase
    .from('reservations')
    .select('id, google_event_id, start_at, end_at, staff_id, status')
    .not('google_event_id', 'is', null)
    .limit(5000);

  const existingEventMap = new Map();
  (existingRecs || []).forEach((r) => {
    existingEventMap.set(r.google_event_id, r);
  });

  const activeGoogleEventIds = new Set();
  const allReservationsToInsert = [];
  const reservationsToUpdate = [];
  const newCustomersToCreate = new Set();

  // 4. 全スタッフのカレンダーイベントを並列取得
  const fetchPromises = STAFF_CALENDARS.map(async (staffCal) => {
    const calId = staffCal.google_calendar_id;
    const dbStaff = staffMap[calId];

    const json = await callGasApi('get_events', {
      calendarId: calId,
      from: fromIso,
      to: toIso,
    });

    if (!json.ok || !Array.isArray(json.events)) return;

    for (const ev of json.events) {
      activeGoogleEventIds.add(ev.id);
      const { customerName, menuName } = parseEventTitle(ev.title);

      if (existingEventMap.has(ev.id)) {
        const existing = existingEventMap.get(ev.id);
        if (
          existing.start_at !== ev.start ||
          existing.end_at !== ev.end ||
          (dbStaff?.id && existing.staff_id !== dbStaff.id)
        ) {
          reservationsToUpdate.push({
            id: existing.id,
            staff_id: dbStaff?.id || existing.staff_id,
            start_at: ev.start,
            end_at: ev.end,
            ai_summary: menuName,
          });
        }
      } else {
        allReservationsToInsert.push({
          facility_id:      facilityId || null,
          staff_id:         dbStaff?.id || null,
          customer_name:    customerName,
          start_at:         ev.start,
          end_at:           ev.end,
          status:           'confirmed',
          customer_type:    'returning',
          ai_summary:       menuName,
          staff_memo:       ev.description || `${staffCal.name} 担当（Googleカレンダー同期）`,
          google_event_id:  ev.id,
        });

        if (!customerMapByName.has(customerName)) {
          newCustomersToCreate.add(customerName);
        }
      }
    }
  });

  await Promise.all(fetchPromises);

  // 5. 【削除同期】Googleカレンダーに存在しなくなった予約を一括削除
  const deletedIds = [];
  existingEventMap.forEach((rec, eventId) => {
    if (!activeGoogleEventIds.has(eventId) && rec.status !== 'cancelled') {
      deletedIds.push(rec.id);
    }
  });

  if (deletedIds.length > 0) {
    const BATCH_DELETE_SIZE = 200;
    const deletePromises = [];
    for (let i = 0; i < deletedIds.length; i += BATCH_DELETE_SIZE) {
      const chunk = deletedIds.slice(i, i + BATCH_DELETE_SIZE);
      deletePromises.push(supabase.from('reservations').delete().in('id', chunk));
    }
    await Promise.all(deletePromises);
  }

  // 6. 新規顧客を一括作成
  if (newCustomersToCreate.size > 0) {
    const cusPayload = Array.from(newCustomersToCreate).map((name) => ({
      facility_id: facilityId || null,
      name,
      phone: '090-0000-0000',
      customer_rank: 'regular',
    }));

    const { data: createdCustomers } = await supabase
      .from('customers')
      .insert(cusPayload)
      .select('id, name');

    (createdCustomers || []).forEach((c) => {
      customerMapByName.set(c.name.trim(), c.id);
    });
  }

  // 7. 新規予約を一括バルクINSERT（並列処理で高速化）
  let insertedCount = 0;
  if (allReservationsToInsert.length > 0) {
    const recordsToInsert = allReservationsToInsert.map((r) => ({
      facility_id:      r.facility_id,
      staff_id:         r.staff_id,
      customer_id:      customerMapByName.get(r.customer_name) || null,
      start_at:         r.start_at,
      end_at:           r.end_at,
      status:           r.status,
      customer_type:    r.customer_type,
      ai_summary:       r.ai_summary,
      staff_memo:       r.staff_memo,
      google_event_id:  r.google_event_id,
    }));

    const BATCH_SIZE = 100;
    const insertPromises = [];
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const chunk = recordsToInsert.slice(i, i + BATCH_SIZE);
      insertPromises.push(supabase.from('reservations').insert(chunk));
    }
    const insResults = await Promise.all(insertPromises);
    insResults.forEach((res, idx) => {
      if (!res.error) {
        insertedCount += Math.min(BATCH_SIZE, recordsToInsert.length - idx * BATCH_SIZE);
      }
    });
  }

  // 8. 既存変更分の更新
  let updatedCount = 0;
  if (reservationsToUpdate.length > 0) {
    const updatePromises = reservationsToUpdate.map((up) =>
      supabase
        .from('reservations')
        .update({
          staff_id: up.staff_id,
          start_at: up.start_at,
          end_at: up.end_at,
          ai_summary: up.ai_summary,
          updated_at: new Date().toISOString(),
        })
        .eq('id', up.id)
    );
    await Promise.all(updatePromises);
    updatedCount = reservationsToUpdate.length;
  }

  console.log(`[GoogleCalSync] 超高速同期完了: 追加 ${insertedCount}件, 更新 ${updatedCount}件, 削除 ${deletedIds.length}件`);
  return {
    syncedCount: insertedCount + updatedCount,
    insertedCount,
    updatedCount,
    deletedCount: deletedIds.length,
  };
}
