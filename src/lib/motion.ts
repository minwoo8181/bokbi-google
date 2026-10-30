/**
 * 모션 규칙 (DESIGN.md §6, 대표님 2026-10-25): 효과는 "눌렸다·생겼다·바뀌었다"를 알려 주는 5가지만.
 * 값은 tailwind.config.ts 토큰(duration-fast/base/slow, ease-out-soft, animate-rise-in, animate-check-draw)과 같다.
 * 휴대폰 "동작 줄이기"는 globals.css가 전부 끈다
 */

/** 스태거 간격과 최대 개수: 기록이 길어도 0.4초 안에 다 나오게 */
export const STAGGER_STEP_MS = 50;
export const STAGGER_MAX = 8;

/** i번째 줄의 지연 (CSS animation-delay 값) */
export function staggerDelay(i: number): string {
  return `${Math.min(Math.max(i, 0), STAGGER_MAX) * STAGGER_STEP_MS}ms`;
}
