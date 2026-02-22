import { resolveThemeV2, applyThemeV2 } from '@/theme/resolveTheme';
import type { ThemeManifestV2 } from '@/theme/resolveTheme';

export const UI_V2_TOKENS_STORAGE_KEY = 'ui_v2_tokens';
export const UI_V2_THEME_MANIFEST_STORAGE_KEY = 'ui_v2_theme_manifest';

function readFlagFromQuery(): boolean | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ui_v2_tokens');
  if (raw === null) return null;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}

function readPersistedFlag(): boolean | null {
  const raw = window.localStorage.getItem(UI_V2_TOKENS_STORAGE_KEY);
  if (raw === null) return null;
  return raw === '1';
}

export function setUiV2TokensPreference(enabled: boolean) {
  window.localStorage.setItem(UI_V2_TOKENS_STORAGE_KEY, enabled ? '1' : '0');
}

export function readThemeManifestPreference(): ThemeManifestV2 | null {
  const raw = window.localStorage.getItem(UI_V2_THEME_MANIFEST_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ThemeManifestV2;
  } catch {
    return null;
  }
}

export function setThemeManifestPreference(manifest: ThemeManifestV2) {
  window.localStorage.setItem(UI_V2_THEME_MANIFEST_STORAGE_KEY, JSON.stringify(manifest));
}

export function clearThemeManifestPreference() {
  window.localStorage.removeItem(UI_V2_THEME_MANIFEST_STORAGE_KEY);
}

export function shouldEnableUiV2Tokens(): boolean {
  const queryValue = readFlagFromQuery();
  if (queryValue !== null) {
    setUiV2TokensPreference(queryValue);
    return queryValue;
  }

  const persisted = readPersistedFlag();
  if (persisted !== null) return persisted;

  return import.meta.env.VITE_UI_V2_TOKENS === 'true';
}

export function initThemeV2() {
  if (!shouldEnableUiV2Tokens()) return;
  const { theme } = resolveThemeV2(readThemeManifestPreference() ?? undefined);
  applyThemeV2(theme);
}
