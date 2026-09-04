/**
 * 施設用カラーテーマプリセット & 動的テーママネージャー
 */

export const THEME_PRESETS = [
  {
    id: 'terracotta',
    name: 'つばきテラコッタ (椿・温かみ・親しみ)',
    description: '温もりと清潔感のあるテラコッタオレンジ＆ブラウン',
    primary: '#E06A3B',
    primaryHover: '#C95527',
    primaryLight: '#FFF4E5',
    secondary: '#3D2B1F',
    accent: '#C59B27',
    background: '#FAF7EF',
    headerText: '#FFFFFF',
  },
  {
    id: 'ocean',
    name: 'メディカルオーシャン (清潔・信頼・医療ブルー)',
    description: '高い信頼感と爽やかな清潔感を与えるオーシャンブルー',
    primary: '#0284C7',
    primaryHover: '#0369A1',
    primaryLight: '#F0F9FF',
    secondary: '#0F172A',
    accent: '#38BDF8',
    background: '#F8FAFC',
    headerText: '#FFFFFF',
  },
  {
    id: 'forest',
    name: 'フォレストヒーリング (癒やし・自然・ミントグリーン)',
    description: 'リラックスと安心感を与えるナチュラルグリーン',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#F0FDF4',
    secondary: '#064E3B',
    accent: '#34D399',
    background: '#F9FDF9',
    headerText: '#FFFFFF',
  },
  {
    id: 'rose',
    name: 'エレガントローズ (上品・美容・さくらピンク)',
    description: '美容クリニックやサロンに最適な上品で華やかなローズピンク',
    primary: '#E11D48',
    primaryHover: '#BE123C',
    primaryLight: '#FFF1F2',
    secondary: '#4C0519',
    accent: '#FB7185',
    background: '#FFF9F9',
    headerText: '#FFFFFF',
  },
  {
    id: 'slate',
    name: 'モダンシック (高級感・スタイリッシュグレー)',
    description: '洗練された都会的な高級感を演出するスレート＆チャコール',
    primary: '#475569',
    primaryHover: '#334155',
    primaryLight: '#F8FAFC',
    secondary: '#0F172A',
    accent: '#94A3B8',
    background: '#F8FAFC',
    headerText: '#FFFFFF',
  },
  {
    id: 'indigo',
    name: 'ロイヤルインディゴ (格式・洗練・パープルネイビー)',
    description: '格式高く落ち着きのあるインディゴ＆ラベンダー',
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryLight: '#EEF2FF',
    secondary: '#1E1B4B',
    accent: '#A5B4FC',
    background: '#FBFBFF',
    headerText: '#FFFFFF',
  },
];

/**
 * IDからテーマプリセットを取得
 */
export function getThemeById(themeId) {
  return THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
}

/**
 * 現在設定されているテーマを取得
 */
export function getCurrentTheme(themeId) {
  if (themeId) {
    return getThemeById(themeId);
  }
  return THEME_PRESETS[0];
}

/**
 * テーマをCSS変数としてDOMに適用
 */
export function applyTheme(theme) {
  if (!theme || !theme.primary) return;
  const root = document.documentElement;

  root.style.setProperty('--color-brand-primary', theme.primary);
  root.style.setProperty('--color-brand-primary-hover', theme.primaryHover);
  root.style.setProperty('--color-brand-primary-light', theme.primaryLight);
  root.style.setProperty('--color-brand-secondary', theme.secondary);
  root.style.setProperty('--color-brand-accent', theme.accent);
  root.style.setProperty('--color-brand-bg', theme.background);

  // 下位互換用
  root.style.setProperty('--color-brand-orange', theme.primary);
  root.style.setProperty('--color-brand-brown', theme.secondary);
  root.style.setProperty('--color-brand-gold', theme.accent);
  root.style.setProperty('--color-brand-ivory', theme.background);
}
