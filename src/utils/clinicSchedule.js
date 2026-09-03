/**
 * 医院の開院・診療スケジュール設定
 * localStorageと連動して動的に管理画面から変更可能
 */

const STORAGE_KEY = 'maeda_dental_clinic_schedule_config';

export const DEFAULT_CLINIC_CONFIG = {
  // 休診曜日: 0 (日曜), 4 (木曜)
  closedDays: [0, 4],

  // 診療時間帯
  morningStart: '09:30',
  morningEnd: '13:00',
  afternoonStart: '14:30',
  afternoonEnd: '18:00',

  // 土曜の午後終了時間（平日より早い場合）
  saturdayAfternoonEnd: '16:30',

  // スロット間隔（分）
  slotInterval: 30,
};

// 設定の取得（localStorageに保存されていればそれを優先）
export function getClinicScheduleConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CLINIC_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('スケジュール設定読み込み失敗:', e);
  }
  return { ...DEFAULT_CLINIC_CONFIG };
}

// 設定の保存
export function saveClinicScheduleConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('スケジュール設定保存失敗:', e);
  }
}

/**
 * 時間文字列 "09:30" から {h: 9, m: 30} のオブジェクトを生成
 */
function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return { h, m };
}

/**
 * 開始時間から終了時間までのスロット一覧を生成
 */
function generateSlotsBetween(startStr, endStr, intervalMinutes = 30) {
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  const slots = [];

  let currentMinutes = start.h * 60 + start.m;
  const endMinutes = end.h * 60 + end.m;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push({ h, m });
    currentMinutes += intervalMinutes;
  }
  return slots;
}

/**
 * 指定した日付が休診日かどうかを判定
 */
export function isClosedDay(date) {
  const config = getClinicScheduleConfig();
  const dayOfWeek = date.getDay();
  return config.closedDays.includes(dayOfWeek);
}

/**
 * 指定した日付に応じた診療スロット一覧を動的に生成
 */
export function getSlotsForDate(date) {
  if (isClosedDay(date)) return [];

  const config = getClinicScheduleConfig();
  const isSaturday = date.getDay() === 6;

  // 午前のスロット
  const morningSlots = generateSlotsBetween(config.morningStart, config.morningEnd, config.slotInterval);

  // 午後のスロット（土曜は終了時間が異なる設定に対応）
  const afternoonEnd = isSaturday ? config.saturdayAfternoonEnd : config.afternoonEnd;
  const afternoonSlots = generateSlotsBetween(config.afternoonStart, afternoonEnd, config.slotInterval);

  return [...morningSlots, ...afternoonSlots];
}
