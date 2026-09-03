/**
 * 医院の開院・診療スケジュール設定
 * 将来の管理画面から動的に設定変更できるように分離
 */
export const CLINIC_SCHEDULE_CONFIG = {
  // 休診曜日: 0 (日曜), 4 (木曜)
  closedDays: [0, 4],

  // 平日（月・火・水・金）の診療スロット
  weekdaySlots: [
    // 午前
    { h: 9, m: 30 },
    { h: 10, m: 0 },
    { h: 10, m: 30 },
    { h: 11, m: 0 },
    { h: 11, m: 30 },
    { h: 12, m: 0 },
    // 午後
    { h: 14, m: 30 },
    { h: 15, m: 0 },
    { h: 15, m: 30 },
    { h: 16, m: 0 },
    { h: 16, m: 30 },
    { h: 17, m: 0 },
    { h: 17, m: 30 },
  ],

  // 土曜日の診療スロット（午後は少し早めに終わる設定）
  saturdaySlots: [
    { h: 9, m: 30 },
    { h: 10, m: 0 },
    { h: 10, m: 30 },
    { h: 11, m: 0 },
    { h: 11, m: 30 },
    { h: 12, m: 0 },
    { h: 14, m: 0 },
    { h: 14, m: 30 },
    { h: 15, m: 0 },
    { h: 15, m: 30 },
    { h: 16, m: 0 },
    { h: 16, m: 30 },
  ],
};

/**
 * 指定した日付が休診日かどうかを判定
 * @param {Date} date
 * @returns {boolean}
 */
export function isClosedDay(date) {
  const dayOfWeek = date.getDay();
  return CLINIC_SCHEDULE_CONFIG.closedDays.includes(dayOfWeek);
}

/**
 * 指定した曜日に応じた診療枠スロット一覧を取得
 * @param {Date} date
 * @returns {Array<{h: number, m: number}>}
 */
export function getSlotsForDate(date) {
  if (isClosedDay(date)) return [];
  if (date.getDay() === 6) {
    return CLINIC_SCHEDULE_CONFIG.saturdaySlots;
  }
  return CLINIC_SCHEDULE_CONFIG.weekdaySlots;
}
