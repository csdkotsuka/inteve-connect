/**
 * URL解析およびパス生成ユーティリティ
 * 例:
 *  /                       -> { slug: null, viewMode: 'booking' }
 *  /tsubaki-dental         -> { slug: 'tsubaki-dental', viewMode: 'booking' }
 *  /tsubaki-dental/admin   -> { slug: 'tsubaki-dental', viewMode: 'admin' }
 *  /tsubaki-dental/leaflet -> { slug: 'tsubaki-dental', viewMode: 'leaflet' }
 *  /super-admin            -> { slug: null, viewMode: 'super_admin' }
 *  /admin                  -> { slug: null, viewMode: 'admin' }
 *  /leaflet                -> { slug: null, viewMode: 'leaflet' }
 */

export const RESERVED_SLUGS = ['super-admin', 'admin', 'leaflet', 'api', 'auth', 'login'];

export const VIEW_MODES = {
  BOOKING: 'booking',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  LEAFLET: 'leaflet',
};

/**
 * 現在のURL（または指定URL）を解析して slug と viewMode を返す
 */
export function parseUrl(location = typeof window !== 'undefined' ? window.location : null) {
  if (!location) {
    return { slug: null, viewMode: VIEW_MODES.BOOKING };
  }

  const pathname = location.pathname.replace(/^\/+|\/+$/g, '');
  const search = location.search;
  const hash = location.hash;
  const segments = pathname ? pathname.split('/') : [];

  // 1. スーパー管理者画面
  if (segments[0] === 'super-admin' || hash === '#super-admin' || search.includes('mode=super-admin')) {
    return { slug: null, viewMode: VIEW_MODES.SUPER_ADMIN };
  }

  // 2. クエリパラメータ（?facility=slug または ?slug=slug）のチェック
  let querySlug = null;
  try {
    const params = new URLSearchParams(search);
    querySlug = params.get('facility') || params.get('slug');
  } catch (e) {}

  // 3. ルート後方互換 (/admin, /leaflet)
  if (segments[0] === 'admin' || (!querySlug && (hash === '#admin' || search.includes('mode=admin')))) {
    return { slug: querySlug, viewMode: VIEW_MODES.ADMIN };
  }
  if (segments[0] === 'leaflet' || (!querySlug && (hash === '#leaflet' || search.includes('mode=leaflet')))) {
    return { slug: querySlug, viewMode: VIEW_MODES.LEAFLET };
  }

  // 4. セグメントが存在する場合 (例: /tsubaki-dental または /tsubaki-dental/admin)
  if (segments.length >= 1 && !RESERVED_SLUGS.includes(segments[0])) {
    const slug = segments[0];
    const subPath = segments[1] || '';

    if (subPath === 'admin' || hash === '#admin' || search.includes('mode=admin')) {
      return { slug, viewMode: VIEW_MODES.ADMIN };
    }
    if (subPath === 'leaflet' || hash === '#leaflet' || search.includes('mode=leaflet')) {
      return { slug, viewMode: VIEW_MODES.LEAFLET };
    }
    return { slug, viewMode: VIEW_MODES.BOOKING };
  }

  // 5. ルートパス (/) かつ querySlug がある場合
  if (querySlug) {
    return { slug: querySlug, viewMode: VIEW_MODES.BOOKING };
  }

  // 6. デフォルト (/) -> slug なし（デフォルト施設表示）, BOOKING
  return { slug: null, viewMode: VIEW_MODES.BOOKING };
}

/**
 * slug と viewMode から適切なブラウザパスを生成
 */
export function createPath(slug, viewMode) {
  if (viewMode === VIEW_MODES.SUPER_ADMIN) {
    return '/super-admin';
  }

  const base = slug ? `/${slug}` : '';

  if (viewMode === VIEW_MODES.ADMIN) {
    return base ? `${base}/admin` : '/admin';
  }
  if (viewMode === VIEW_MODES.LEAFLET) {
    return base ? `${base}/leaflet` : '/leaflet';
  }
  return base || '/';
}
