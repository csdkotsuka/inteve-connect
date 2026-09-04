/**
 * 医院の開院・診療スケジュール設定
 * 日本の祝祭日判定 ＆ 医院独自の休診日（夏季・年末年始・研修等）に対応
 * localStorageと連動して動的に管理画面から変更可能
 */
import { format } from 'date-fns';

const STORAGE_KEY = 'inteve_connect_dental_clinic_schedule_config';

// 日本の祝日データ（2025年〜2027年 主要祝祭日・振替休日）
export const JAPANESE_HOLIDAYS = {
  // 2025年
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-02-24': '振替休日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-05-06': '振替休日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',

  // 2026年
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '振替休日',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-22': '国民の休日',
  '2026-09-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',

  // 2027年
  '2027-01-01': '元日',
  '2027-01-11': '成人の日',
  '2027-02-11': '建国記念の日',
  '2027-02-23': '天皇誕生日',
  '2027-03-21': '春分の日',
  '2027-03-22': '振替休日',
  '2027-04-29': '昭和の日',
  '2027-05-03': '憲法記念日',
  '2027-05-04': 'みどりの日',
  '2027-05-05': 'こどもの日',
  '2027-07-19': '海の日',
  '2027-08-11': '山の日',
  '2027-09-20': '敬老の日',
  '2027-09-23': '秋分の日',
  '2027-10-11': 'スポーツの日',
  '2027-11-03': '文化の日',
  '2027-11-23': '勤労感謝の日',
};

const DAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'];

export const DEFAULT_CLINIC_CONFIG = {
  // 定期休診曜日: 0 (日曜), 4 (木曜)
  closedDays: [0, 4],

  // 祝祭日を自動休診にするか
  isHolidayClosed: true,

  // 医院独自の特別休診日（夏季休暇、年末年始、院内研修など）
  specialClosedDays: [
    { date: '2026-08-13', name: '夏季休暇' },
    { date: '2026-08-14', name: '夏季休暇' },
    { date: '2026-08-15', name: '夏季休暇' },
    { date: '2026-12-29', name: '年末年始休診' },
    { date: '2026-12-30', name: '年末年始休診' },
    { date: '2026-12-31', name: '年末年始休診' },
    { date: '2027-01-02', name: '年始休診' },
    { date: '2027-01-03', name: '年始休診' },
  ],

  // 診療時間帯（10分刻み）
  morningStart: '09:30',
  morningEnd: '13:00',
  afternoonStart: '14:30',
  afternoonEnd: '18:00',

  // 土曜の午後終了時間
  saturdayAfternoonEnd: '16:30',

  // スロット間隔（分）
  slotInterval: 30,
};

/**
 * 日本の祝祭日判定
 */
export function getJapaneseHoliday(date) {
  if (!date) return null;
  const dStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const name = JAPANESE_HOLIDAYS[dStr];
  if (name) {
    return { isHoliday: true, name };
  }
  return null;
}

// 設定の取得（localStorageに保存されていればそれを優先）
export function getClinicScheduleConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_CLINIC_CONFIG,
        ...parsed,
        specialClosedDays: Array.isArray(parsed.specialClosedDays)
          ? parsed.specialClosedDays
          : DEFAULT_CLINIC_CONFIG.specialClosedDays,
      };
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
 * 指定した日付の休診情報（定期休診・祝日・医院独自休診日）を取得
 * @param {Date|string} date
 * @param {object} [customConfig]
 * @returns {{ isClosed: boolean, type: 'regular'|'holiday'|'special'|null, reason: string, shortReason: string }}
 */
export function getClosureInfo(date, customConfig) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    return { isClosed: false, type: null, reason: '', shortReason: '' };
  }

  const config = customConfig || getClinicScheduleConfig();
  const dateStr = format(d, 'yyyy-MM-dd');
  const dayOfWeek = d.getDay();

  // 1. 医院独自の休診日を最優先チェック
  const specialDay = (config.specialClosedDays || []).find((s) => s.date === dateStr);
  if (specialDay) {
    return {
      isClosed: true,
      type: 'special',
      reason: `休診: ${specialDay.name || '特別休診日'}`,
      shortReason: specialDay.name || '特別休診',
    };
  }

  // 2. 祝祭日チェック（祝日休診設定がONの場合）
  if (config.isHolidayClosed !== false) {
    const holiday = getJapaneseHoliday(d);
    if (holiday) {
      return {
        isClosed: true,
        type: 'holiday',
        reason: `祝日休診: ${holiday.name}`,
        shortReason: holiday.name,
      };
    }
  }

  // 3. 定期休診曜日チェック
  if (Array.isArray(config.closedDays) && config.closedDays.includes(dayOfWeek)) {
    const dayName = DAY_NAMES[dayOfWeek] || '曜日';
    return {
      isClosed: true,
      type: 'regular',
      reason: `定休日: ${dayName}休診`,
      shortReason: `${dayName}休診`,
    };
  }

  return { isClosed: false, type: null, reason: '', shortReason: '' };
}

/**
 * 指定した日付が休診日かどうかを判定
 */
export function isClosedDay(date, customConfig) {
  return getClosureInfo(date, customConfig).isClosed;
}

/**
 * 時間文字列 "09:30" から {h: 9, m: 30} のオブジェクトを生成
 */
function parseTime(timeStr) {
  const [h, m] = (timeStr || '09:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
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
 * 指定した日付に応じた診療スロット一覧を動的に生成
 */
export function getSlotsForDate(date, customConfig) {
  const config = customConfig || getClinicScheduleConfig();
  if (isClosedDay(date, config)) return [];

  const d = typeof date === 'string' ? new Date(date) : date;
  const isSaturday = d.getDay() === 6;

  // 午前のスロット
  const morningSlots = generateSlotsBetween(config.morningStart, config.morningEnd, config.slotInterval || 30);

  // 午後のスロット（土曜は終了時間が異なる設定に対応）
  const afternoonEnd = isSaturday ? (config.saturdayAfternoonEnd || config.afternoonEnd) : config.afternoonEnd;
  const afternoonSlots = generateSlotsBetween(config.afternoonStart, afternoonEnd, config.slotInterval || 30);

  return [...morningSlots, ...afternoonSlots];
}
