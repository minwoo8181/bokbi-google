'use client';

import { useSyncExternalStore } from 'react';
import { CURRENT_THEME, THEME_PRESETS, type ThemePreset } from '@/theme/themeConfig';

/** <html data-theme>이 바뀌면 다시 그리기 (ThemeLabSwitcher가 바꾼다) */
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}

function read(): ThemePreset {
  const t = document.documentElement.dataset.theme;
  return t && t in THEME_PRESETS ? (t as ThemePreset) : CURRENT_THEME;
}

/** design-lab: 지금 테마 (서버 그림은 CURRENT_THEME, 붙은 뒤 브라우저 값으로 다시 그림) */
export function useLabTheme(): ThemePreset {
  return useSyncExternalStore(subscribe, read, () => CURRENT_THEME);
}
