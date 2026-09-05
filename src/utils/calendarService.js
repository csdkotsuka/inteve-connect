import { supabase } from './supabaseClient';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';
import { isClosedDay, getSlotsForDate } from './clinicSchedule';
import { getFacilityProfile, getFacilityStaffs } from './facilityService';
import { callGasApi, createGoogleCalendarEvent, STAFF_CALENDARS } from './googleCalendarSyncService';

/**
 * Googleカレンダー & Supabaseから予約済み時間を取得し、空きスロットを動的に算出する
 * @param {number} durationMinutes
 * @param {object} [patient] - 予約患者情報（担当スタッフ情報を含む場合あり）
 * @returns {Promise<Array<{label: string, value: string, datetime: string}>>}
 */
export async function fetchAvailableSlots(durationMinutes = 30, patient = null) {
  let bookedTimes = [];

  const now = new Date();
  const fromIso = now.toISOString();
  const maxDate = addDays(now, 8);
  const toIso = maxDate.toISOString();

  const facility = await getFacilityProfile();
  const isStaffAssignmentEnabled = facility?.is_staff_assignment_enabled !== false;
  const staffs = await getFacilityStaffs();

  // 対象カレンダーの選定（担当制ONかつ再診で担当者がいる場合、または新規受付カレンダー）
  const newPatientStaff = staffs.find((s) => s.is_active !== false && s.accepts_new_patients)
    || staffs.find((s) => s.is_active !== false)
    || staffs[0];

  let targetStaff = null;
  const isRet = patient?.isReturning || patient?.patient_type === 'returning';
  const assignedStaffId = patient?.assigned_staff_id || patient?.record?.assigned_staff_id;

  if (isRet && isStaffAssignmentEnabled && assignedStaffId) {
    targetStaff = staffs.find((s) => s.id === assignedStaffId && s.is_active !== false) || newPatientStaff;
  } else {
    targetStaff = newPatientStaff;
  }

  const targetCalendarId = targetStaff?.google_calendar_id || STAFF_CALENDARS[0]?.google_calendar_id || '';

  // 1. Supabaseの有効な予約を取得（高速）
  if (supabase) {
    try {
      let query = supabase
        .from('reservations')
        .select('start_at, end_at, staff_id')
        .neq('status', 'cancelled')
        .gte('start_at', fromIso)
        .lte('start_at', toIso);

      // 特定スタッフの空き枠を算出する場合はそのスタッフの予約を対象に
      if (targetStaff?.id) {
        query = query.or(`staff_id.eq.${targetStaff.id},staff_id.is.null`);
      }

      const { data: dbRes } = await query;

      if (dbRes && dbRes.length > 0) {
        dbRes.forEach((r) => {
          bookedTimes.push({ start: r.start_at, end: r.end_at });
        });
      }
    } catch (e) {
      console.warn('[calendarService] Supabase予約取得エラー:', e);
    }
  }

  // 2. Googleカレンダーからも直接取得（対象カレンダーIDを使用）
  try {
    if (targetCalendarId) {
      const json = await callGasApi('get_events', {
        calendarId: targetCalendarId,
        from: fromIso,
        to: toIso,
      });
      if (json.ok && Array.isArray(json.events)) {
        json.events.forEach((ev) => {
          bookedTimes.push({ start: ev.start, end: ev.end });
        });
      }
    }
  } catch (err) {
    console.warn('[calendarService] GASカレンダー空き枠取得エラー:', err);
  }

  // 医院の開院・休診スケジュールをもとに今後7日間の空き枠を探索
  const slots = [];
  for (let dayOffset = 1; dayOffset <= 7 && slots.length < 6; dayOffset++) {
    const targetDate = addDays(new Date(), dayOffset);
    if (isClosedDay(targetDate)) continue;

    const dayCandidateSlots = getSlotsForDate(targetDate);
    for (const ch of dayCandidateSlots) {
      const slotTime = setMinutes(setHours(targetDate, ch.h), ch.m);
      const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60000);

      // 予約済み時間と重複していないかチェック
      const isConflict = bookedTimes.some((b) => {
        const bStart = new Date(b.start).getTime();
        const bEnd = new Date(b.end).getTime();
        return slotTime.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      if (!isConflict) {
        const dateLabel = format(targetDate, 'M月d日(E)', { locale: ja });
        const timeLabel = format(slotTime, 'HH:mm');
        slots.push({
          label: `${dateLabel} ${timeLabel}`,
          value: `${format(targetDate, 'M/d')} ${timeLabel}`,
          datetime: slotTime.toISOString(),
          formattedStartAt: `${format(slotTime, 'yyyy-MM-dd HH:mm:ss')}+09`,
        });

        if (slots.length >= 6) break;
      }
    }
  }

  return slots;
}

/**
 * WEBチャット予約確定時：担当制・新患カレンダーフラグに基づいて適切なGoogleカレンダーとSupabaseへ保存
 * @param {object} param0
 * @returns {Promise<object>}
 */
export async function createReservation({ patient, service, slot }) {
  const result = {
    googleCalendarEventId: null,
    supabaseReservationId: null,
    scheduled_at: slot.label,
  };

  const facility = await getFacilityProfile();
  const facilityId = facility?.id || null;
  const isStaffAssignmentEnabled = facility?.is_staff_assignment_enabled !== false;
  const staffs = await getFacilityStaffs();

  // 1. 新規患者（新患）受け入れカレンダー（accepts_new_patients: true）
  const newPatientStaff = staffs.find((s) => s.is_active !== false && s.accepts_new_patients)
    || staffs.find((s) => s.is_active !== false)
    || staffs[0];

  let assignedStaff = null;
  const isRet = patient.isReturning || patient.patient_type === 'returning';
  const targetStaffId = patient.assigned_staff_id || patient.record?.assigned_staff_id;

  // 2. 再診で担当制が有効な場合：患者の担当スタッフを割り当て
  if (isRet && isStaffAssignmentEnabled && targetStaffId) {
    assignedStaff = staffs.find((s) => s.id === targetStaffId && s.is_active !== false);
  }

  // 3. 担当スタッフが見つからない場合（新患、または担当制OFF、または担当未設定）：新患用受付カレンダー
  if (!assignedStaff) {
    assignedStaff = newPatientStaff;
  }

  const calendarId = assignedStaff?.google_calendar_id || STAFF_CALENDARS[0]?.google_calendar_id || '';

  const startDate = new Date(slot.datetime);
  const duration = service.estimated_duration || 30;
  const endDate = new Date(startDate.getTime() + duration * 60000);
  const startAtIso = startDate.toISOString();
  const endAtIso = endDate.toISOString();

  // 4. Googleカレンダー（GAS）に対象スタッフのカレンダーIDで予定を書き込む
  try {
    const eventId = await createGoogleCalendarEvent({
      calendarId,
      customerName: patient.name,
      phone: patient.phone,
      menuName: service.service_label || service.service_id || '一般診療',
      startAt: startAtIso,
      endAt: endAtIso,
      memo: `${service.symptom_detail || 'WEB問診回答あり'} (担当: ${assignedStaff?.name || '新患受付'})`,
    });

    if (eventId) {
      result.googleCalendarEventId = eventId;
      result.googleCalendarSaved = true;
    }
  } catch (err) {
    console.warn('[calendarService] Googleカレンダー書き込みエラー:', err);
  }

  // 2. Supabase（customers & reservations テーブル）に保存する
  if (supabase) {
    try {
      // 顧客を検索または作成
      let customerId = null;
      if (patient.phone) {
        const { data: matchedCust } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', patient.phone)
          .maybeSingle();

        if (matchedCust) {
          customerId = matchedCust.id;
        }
      }

      if (!customerId) {
        const { data: newCust } = await supabase
          .from('customers')
          .insert([{
            facility_id: facilityId,
            name: patient.name,
            phone: patient.phone || '090-0000-0000',
            email: patient.email || null,
            customer_rank: patient.isReturning ? 'regular' : 'new',
          }])
          .select()
          .single();
        if (newCust) customerId = newCust.id;
      }

      const reservationRecord = {
        facility_id: facilityId,
        customer_id: customerId,
        staff_id: assignedStaff?.id || null,
        start_at: startAtIso,
        end_at: endAtIso,
        status: 'confirmed',
        customer_type: patient.isReturning ? 'returning' : 'new',
        ai_summary: service.service_label || 'WEB予約',
        staff_memo: service.symptom_detail || 'WEBチャット予約問診回答あり',
        google_event_id: result.googleCalendarEventId || `gcal-${Date.now()}`,
      };

      const { data: savedRes, error: resErr } = await supabase
        .from('reservations')
        .insert([reservationRecord])
        .select()
        .single();

      if (!resErr && savedRes) {
        result.supabaseReservationId = savedRes.id;
        result.supabaseSaved = true;
      } else {
        console.warn('[calendarService] Supabase予約保存エラー:', resErr);
      }
    } catch (err) {
      console.warn('[calendarService] Supabase例外:', err);
    }
  }

  return result;
}
