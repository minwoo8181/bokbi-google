'use client';

/**
 * 빠진 칸 안내 (인라인 오류, 2026-10-27): 다음 버튼은 늘 켜 두고, 빠진 칸이 있으면
 * 첫 칸으로 스크롤·포커스 + 칸 아래 빨간 한 줄 + 버튼 위 남은 개수. 칸을 채우면 그 줄은 바로 사라진다.
 * 칸 위치는 data-field="{MissingField}" 로 찾는다
 */
import { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MissingField } from '@/lib/requests/missingFields';

export function useMissingGuard(missing: MissingField[]) {
  const [tried, setTried] = useState(false);
  const shown = (f: MissingField) => tried && missing.includes(f);

  const attempt = (onPass: () => void) => {
    if (missing.length === 0) return onPass();
    setTried(true);
    const el = document.querySelector<HTMLElement>(`[data-field="${missing[0]}"]`);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const target = el.matches('input, select, button') ? el : el.querySelector<HTMLElement>('input, select, button');
    target?.focus({ preventScroll: true });
  };

  return { shown, attempt, tried, left: missing.length };
}

export type MissingGuard = ReturnType<typeof useMissingGuard>;

/** 빨간 테두리 대신 링: 기존 테두리 색 클래스와 부딪히지 않는다 */
export const errorRing = (on: boolean) => (on ? 'ring-1 ring-status-risk' : '');

export function FieldError({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <p role="alert" className="mt-2 flex items-center gap-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep">
      <span className="w-1.5 h-1.5 rounded-full bg-status-risk flex-shrink-0" aria-hidden />
      {text}
    </p>
  );
}

/** 다음 버튼 위 "N개 더 채우면 넘어갈 수 있어요" */
export function MissingCount({ guard }: { guard: MissingGuard }) {
  if (!guard.tried || guard.left === 0) return null;
  return (
    <p data-testid="missing-count" className="text-center text-[13px] font-bold text-[var(--status-risk-strong)]">
      {SITE_CONTENT.matchingModal.missing.remaining.replace('{n}', String(guard.left))}
    </p>
  );
}
