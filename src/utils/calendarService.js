import { supabase } from './supabaseClient';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';
import { isClosedDay, getSlotsForDate } from './clinicSchedule';

const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

/**
 * Googleカレンダーから予約済み時間を取得し、空きスロットを動的に算出する
 * @param {number} durationMinutes
 * @returns {Promise<Array<{label: string, value: string, datetime: string}>>}
 */
export async function fetchAvailableSlots(durationMinutes = 30) {
  let bookedTimes = [];

  if (GAS_API_URL) {
    try {
      const res = await fetch(GAS_API_URL);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.booked)) {
          bookedTimes = json.booked;
        }
      }
    } catch (err) {
      console.warn('GASカレンダー空き枠取得エラー（デフォルト枠を使用）:', err);
    }
  }

  // 医院の開院・休診スケジュールをもとに今後7日間の空き枠を探索
  const slots = [];
  // 明日から順に最大7日間探索
  for (let dayOffset = 1; dayOffset <= 7 && slots.length < 6; dayOffset++) {
    const targetDate = addDays(new Date(), dayOffset);
    if (isClosedDay(targetDate)) continue; // 日曜・木曜などの休診日はスキップ！

    const dayCandidateSlots = getSlotsForDate(targetDate);
    for (const ch of dayCandidateSlots) {
      const slotTime = setMinutes(setHours(targetDate, ch.h), ch.m);
      const slotEnd = new Date(slotTime.getTime() + durationMinutes * 60000);

      // Googleカレンダーで埋まっていないかチェック
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
 * 予約をGoogleカレンダー（GAS）とSupabase（appointmentsテーブル）の両方に保存する
 * @param {object} param0
 * @returns {Promise<object>}
 */
export async function createReservation({ patient, service, slot }) {
  const result = {
    googleCalendarEventId: null,
    supabaseAppointmentId: null,
    scheduled_at: slot.label,
  };

  // 1. Googleカレンダー（GAS）に予定を書き込む
  if (GAS_API_URL) {
    try {
      const params = new URLSearchParams({
        action: 'book',
        patient_name: patient.name,
        phone: patient.phone,
        patient_type: patient.patient_type_label || (patient.patient_type === 'returning' ? '再診' : '新患'),
        menu_type: service.service_label,
        duration: String(service.estimated_duration),
        start_at: slot.datetime,
        symptom: service.symptom_detail || '',
      });

      // GETリクエストで確実にGASに予約作成を指示
      await fetch(`${GAS_API_URL}?${params.toString()}`);
      result.googleCalendarSaved = true;
    } catch (err) {
      console.warn('Googleカレンダー書き込みエラー:', err);
    }
  }

  // 2. Supabase（appointmentsテーブル）に保存する
  if (supabase) {
    try {
      const recordToInsert = {
        patient_name: patient.name,
        phone: patient.phone,
        menu_type: service.service_id || 'treatment',
        duration_minutes: service.estimated_duration || 30,
        start_at: slot.datetime,
        status: 'booked',
        emergency_level: 1,
        ai_summary: service.symptom_detail || '',
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([recordToInsert])
        .select();

      if (!error && data && data.length > 0) {
        result.supabaseAppointmentId = data[0].id;
        result.supabaseSaved = true;
      } else if (error) {
        console.warn('Supabase保存エラー:', error);
      }
    } catch (err) {
      console.warn('Supabase insert例外:', err);
    }
  }

  return result;
}
