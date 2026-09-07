import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const DEV_STORAGE_KEY = 'inteve_dev_line_profile';

// ローカルテスト用モックプロフィール（LINE ID照合テスト用）
export const DEV_MOCK_LINE_PROFILES = [
  {
    userId: 'U98a1234567890abcdef1234567890ab',
    displayName: '大塚 一樹 (LINE)',
    pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=otsuka',
    statusMessage: '通院中・再診テスト患者',
    isPresetReturning: true,
  },
  {
    userId: 'U112233445566778899aabbccddeeff00',
    displayName: '佐藤 健 (LINE)',
    pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sato',
    statusMessage: '定期検診希望',
    isPresetReturning: true,
  },
  {
    userId: 'U_new_patient_demo_' + Date.now().toString().slice(-6),
    displayName: '新規 初診患者 (LINE)',
    pictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=newguest',
    statusMessage: '初診登録テスト',
    isPresetReturning: false,
  },
];

let liffInitPromise = null;

/**
 * LIFF SDKの初期化
 */
export async function initLiff() {
  if (!LIFF_ID) {
    // LIFF IDが未設定の場合はシミュレーションモードとして扱う
    return { isAvailable: false, isMock: true };
  }

  if (liffInitPromise) {
    return liffInitPromise;
  }

  liffInitPromise = (async () => {
    try {
      await liff.init({ liffId: LIFF_ID });
      return {
        isAvailable: true,
        isMock: false,
        isInClient: liff.isInClient(),
        isLoggedIn: liff.isLoggedIn(),
      };
    } catch (err) {
      console.warn('[LIFF Init] 初期化失敗 (開発シミュレーションモードへフォールバック):', err);
      return { isAvailable: false, isMock: true, error: err.message };
    }
  })();

  return liffInitPromise;
}

/**
 * 現在のLINEプロフィール情報を取得（LIFF本番 または 開発シミュレーション）
 */
export async function getLineProfile() {
  // 1. LIFF本番連携が利用可能な場合
  if (LIFF_ID) {
    try {
      const initRes = await initLiff();
      if (initRes.isAvailable && liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        return {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          isRealLiff: true,
        };
      }
    } catch (err) {
      console.warn('[LIFF getProfile] 取得エラー:', err);
    }
  }

  // 2. 開発シミュレーションモード（localStorageに保存されたモックLINE情報）
  try {
    const saved = localStorage.getItem(DEV_STORAGE_KEY);
    if (saved) {
      return { ...JSON.parse(saved), isRealLiff: false, isSimulated: true };
    }
  } catch (e) {}

  return null;
}

/**
 * LINEログインを実行
 */
export async function loginWithLine(customRedirectUri) {
  if (LIFF_ID) {
    try {
      const initRes = await initLiff();
      if (initRes.isAvailable) {
        if (!liff.isLoggedIn()) {
          // LIFFコンソールで設定されたエンドポイントURL（例: http://localhost:5173/）と前方一致させるため、
          // 余計なクエリパラメータを除いたベースURLを使用
          const origin = window.location.origin;
          const pathname = window.location.pathname.endsWith('/')
            ? window.location.pathname
            : window.location.pathname + '/';
          const defaultRedirectUri = origin + pathname;
          const redirectUri = customRedirectUri || defaultRedirectUri;

          liff.login({ redirectUri });
        }
        return;
      }
    } catch (e) {
      console.warn('[LIFF login] エラー:', e);
    }
  }
}

/**
 * LINEログアウトを実行
 */
export function logoutLine() {
  try {
    if (liff && liff.isLoggedIn()) {
      liff.logout();
    }
  } catch (e) {
    console.warn('[LIFF logout] エラー:', e);
  }
}

/**
 * 開発用：LINEプロフィールをシミュレート設定
 */
export function setSimulatedLineProfile(mockProfile) {
  try {
    localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(mockProfile));
  } catch (e) {}
}

/**
 * 開発用：シミュレートLINEプロフィールの解除
 */
export function clearSimulatedLineProfile() {
  try {
    localStorage.removeItem(DEV_STORAGE_KEY);
  } catch (e) {}
}

/**
 * LINE公式アカウントの友だち追加URLを生成
 */
export function getLineAddFriendUrl(lineOfficialId = '@776cdsuy') {
  return `https://line.me/R/ti/p/${encodeURIComponent(lineOfficialId)}`;
}
