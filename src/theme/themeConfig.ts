/**
 * ============================================================================
 * 🎨 복비(Bokbi) V2 - 디자인 시스템 (토스 라이트 단일 고정)
 * ============================================================================
 * 
 * [대표님 확정 정책]
 * - 타 디자인 프리셋 테스트를 종료하고 '토스 라이트(Toss Light)' 단일 디자인으로 영구 확정되었습니다.
 * - 다중 테마 전환 시스템(Theme Switcher)은 폐기되었으며, 모든 UI는 토스 블루(#0064FF)와
 *   토스 라이트 서피스(#F2F4F6) 단일 기준에 맞춰 렌더링됩니다.
 */

// design-lab 복사본: 원본 토스 + 레퍼런스 실험 테마 (전환 버튼 components/lab/ThemeLabSwitcher, 색은 globals.css [data-theme])
export type ThemePreset = 'toss' | 'samjeom';

export interface ThemeDefinition {
  id: ThemePreset;
  name: string;
  description: string;
  primaryColor: string;
  lightColor: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemeDefinition> = {
  toss: {
    id: 'toss',
    name: '토스 라이트 (Toss Light)',
    description: '청량하고 경쾌한 토스 블루 (#0064FF) 기반의 간결한 핀테크 스타일',
    primaryColor: '#0064FF',
    lightColor: '#EBF3FF',
  },
  samjeom: {
    id: 'samjeom',
    name: '삼쩜삼 레퍼런스',
    description: '삼쩜삼 리포트 흐름: 단지 → 얼마 → 왜 → 실거래 기준 → 우리 집 → 매칭 요청, 중개사 보기 따로',
    primaryColor: '#2377F7',
    lightColor: '#E9F2FF',
  },
};

/**
 * ⚡ 활성화 테마: 토스 라이트 (영구 확정)
 */
export const CURRENT_THEME: ThemePreset = 'toss';

/** design-lab: 전환 버튼이 고른 테마를 저장하는 키 (e2e는 저장값이 없어 원본 토스로 검사) */
export const LAB_THEME_STORAGE_KEY = 'bokbi_lab_theme';
