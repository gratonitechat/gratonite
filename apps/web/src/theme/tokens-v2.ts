export type ThemeDensity = 'compact' | 'comfortable';
export type ThemeMotion = 'reduced' | 'normal';
export type ThemeCornerStyle = 'rounded' | 'soft';

export type ThemeSettingsV2 = {
  density: ThemeDensity;
  motion: ThemeMotion;
  cornerStyle: ThemeCornerStyle;
  glassIntensity: number;
};

export type ThemeTokensV2 = Record<string, string>;

export type ThemeV2 = {
  version: string;
  name: string;
  settings: ThemeSettingsV2;
  tokens: ThemeTokensV2;
};

export const DEFAULT_THEME_V2: ThemeV2 = {
  version: '2.0.0',
  name: 'Aurora Glass',
  settings: {
    density: 'comfortable',
    motion: 'normal',
    cornerStyle: 'rounded',
    glassIntensity: 0.72,
  },
  tokens: {
    'semantic/surface/base': '#08101c',
    'semantic/surface/raised': 'rgba(16, 25, 43, 0.84)',
    'semantic/surface/soft': 'rgba(23, 35, 58, 0.82)',
    'semantic/surface/float': 'rgba(10, 18, 34, 0.9)',
    'semantic/surface/input': 'rgba(8, 13, 24, 0.82)',
    'semantic/text/primary': '#f2f7ff',
    'semantic/text/muted': '#a6b7cc',
    'semantic/text/faint': '#7386a0',
    'semantic/border/default': 'rgba(151, 193, 241, 0.18)',
    'semantic/border/strong': 'rgba(151, 193, 241, 0.3)',
    'semantic/action/accent': '#66dcff',
    'semantic/action/accent-2': '#ffd27d',
    'semantic/action/accent-3': '#9fffe5',
    'semantic/status/danger': '#ff7676',
    'semantic/status/danger-bg': 'rgba(255, 118, 118, 0.14)',
    'semantic/gradient/primary':
      'linear-gradient(120deg, rgba(102, 220, 255, 0.3), rgba(255, 210, 125, 0.22))',
    'semantic/gradient/accent': 'linear-gradient(135deg, #66dcff, #ffd27d)',
  },
};

export const TOKEN_KEY_WHITELIST = new Set(Object.keys(DEFAULT_THEME_V2.tokens));
