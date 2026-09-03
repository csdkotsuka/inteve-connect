import { supabase } from './supabaseClient';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { ja } from 'date-fns/locale';

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

  // 候補日（明日、明後日、3日後）の営業時間枠（10:00, 11:30, 14:00, 15:30, 16:30）
  const candidateHours = [
    { h: 10, m: 0 },
    { h: 11, m: 30 },
    { h: 14, m: 0 },
    { h: 15, m: 30 },
    { h: 16, m: 30 },
  ];

  const slots = [];
  for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
    const targetDate = addDays(new Date(), dayOffset);
    // 日曜・祝日を避けるならここでスキップも可能
    for (const ch of candidateHours) {
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
      }
    }
  }

  // 直近4〜6件の空きスロットを返す
  return slots.slice(0, 6);
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
      // GASのCORS制限を考慮しno-corsまたは通常fetch
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // GASのdoPostで受け取りやすいようにtext/plain
        },
        body: JSON.stringify({
          patient_name: patient.name,
          phone: patient.phone,
          patient_type: patient.patient_type_label || (patient.patient_type === 'returning' ? '再診' : '新患'),
          menu_type: service.service_label,
          duration: service.estimated_duration,
          start_at: slot.datetime,
          symptom: service.symptom_detail,
        }),
      });
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
