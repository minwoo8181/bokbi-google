'use client';

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import {
  CURRENT_THEME,
  LAB_THEME_STORAGE_KEY,
  THEME_PRESETS,
  type ThemePreset,
} from '@/theme/themeConfig';

const THEME_IDS = Object.keys(THEME_PRESETS) as ThemePreset[];

/** design-lab 전용: 왼쪽 아래 작은 버튼을 누를 때마다 다음 테마로 (고른 값은 브라우저에 저장) */
export default function ThemeLabSwitcher() {
  const [theme, setTheme] = useState<ThemePreset>(CURRENT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemePreset | undefined;
    if (current && THEME_IDS.includes(current)) setTheme(current);
  }, []);

  const next = () => {
    const id = THEME_IDS[(THEME_IDS.indexOf(theme) + 1) % THEME_IDS.length];
    document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem(LAB_THEME_STORAGE_KEY, id);
    } catch {
      // 저장이 막힌 브라우저는 이번 화면에서만 바뀜
    }
    setTheme(id);
  };

  return (
    <button
      type="button"
      onClick={next}
      aria-label={`테마 바꾸기 (지금: ${THEME_PRESETS[theme].name})`}
      className="fixed bottom-24 left-2 z-[60] flex min-h-[44px] items-center gap-1 rounded-full border border-border-default bg-surface-card px-3 text-[12px] font-semibold text-text-secondary"
    >
      <Palette size={16} aria-hidden="true" />
      {THEME_PRESETS[theme].name}
    </button>
  );
}

/** 첫 그림 전에 저장된 테마를 붙여 깜빡임을 막는 스크립트 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem('${LAB_THEME_STORAGE_KEY}');if(t&&${JSON.stringify(
  THEME_IDS,
)}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}`;
