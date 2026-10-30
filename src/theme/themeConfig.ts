/**
 * ============================================================================
 * 🎨 복비(Bokbi) V2 - 디자인 시스템
 * ============================================================================
 *
 * 원본 정책은 '토스 라이트' 단일 고정. 이 폴더(design-lab 복사본)에서만 테마 전환을 되살려
 * 여러 디자인을 시험한다 — 색 값은 globals.css의 [data-theme="..."] 블록, 전환은 components/lab/ThemeLabSwitcher.
 * 레퍼런스 테마는 화면 구성까지 바꾼다 (components/lab/<테마>/, LabThemeView·useLabTheme로 고름)
 */

export type ThemePreset = 'toss' | 'samjeom' | 'samjeom2' | 'heydealer';

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
    name: '토스 라이트',
    description: '원본 그대로: 토스 블루 (#0064FF) + 회색 바탕',
    primaryColor: '#0064FF',
    lightColor: '#EBF3FF',
  },
  samjeom: {
    id: 'samjeom',
    name: '삼쩜삼 레퍼런스',
    description: '파랑 (#2377F7) + 구획 제목·흰 카드 홈, 연파랑 머리 띠 리포트형 분석 (화면 구성까지 바뀜)',
    primaryColor: '#2377F7',
    lightColor: '#E9F2FF',
  },
  samjeom2: {
    id: 'samjeom2',
    name: '삼쩜삼 심화',
    description: '삼쩜삼 색·부품 그대로 + "질문 말풍선 → 답 카드" 리포트 흐름 (의문을 다 풀고 매칭 요청, 중개사 입구 두 곳)',
    primaryColor: '#2377F7',
    lightColor: '#E9F2FF',
  },
  heydealer: {
    id: 'heydealer',
    name: '헤이딜러 레퍼런스',
    description: '파랑 (#3366F5) + 먹색 머리줄·탭, 명패 검색, 제원 목록·시세 곡선형 분석 (화면 구성까지 바뀜)',
    primaryColor: '#3366F5',
    lightColor: '#EBF0FF',
  },
};

/**
 * 처음 열 때 테마 (전환 버튼으로 고른 값은 브라우저에 저장돼 이보다 우선).
 * 원본 토스로 둔다: e2e는 새 브라우저(저장값 없음)라 원래 화면 흐름을 그대로 검사한다
 */
export const CURRENT_THEME: ThemePreset = 'toss';

/** 전환 버튼이 고른 테마를 저장하는 키 */
export const LAB_THEME_STORAGE_KEY = 'bokbi_lab_theme';
