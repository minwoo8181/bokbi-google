'use client';

import React from 'react';
import type { CardStrip } from '@/lib/deal/deal';

/**
 * 카드 상태 점 알약 (2026-10-27 대표님: 집주인 진행 중인 부동산 카드 기준으로 집주인·중개사 화면 통일).
 * 초록 = 광고 중, 빨강 = 기한 지남, 노랑 = 확인 중·24시간 안 방문, 파랑 = 새 소식, 회색 속 빈 점 = 기다림·멈춤, 옅은 회색 = 끝남
 */
export type PillTone = 'GOOD' | 'RISK' | 'CAUTION' | 'ACTION' | 'WAIT' | 'DONE';

const PILL = 'inline-flex items-center gap-2 min-h-9 px-3 rounded-full text-[13px] font-bold break-keep tabular-nums';
const TONE: Record<PillTone, { box: string; dot: string }> = {
  GOOD: { box: 'bg-status-good-light text-[var(--status-good-strong)]', dot: 'bg-status-good' },
  RISK: { box: 'bg-status-risk-light text-[var(--status-risk-strong)]', dot: 'bg-status-risk' },
  CAUTION: { box: 'bg-status-caution-light text-text-primary', dot: 'bg-status-caution' },
  ACTION: { box: 'bg-brand-light text-brand-hover', dot: 'bg-brand' },
  WAIT: { box: 'bg-surface-subtle text-text-secondary', dot: 'border-[1.5px] border-text-tertiary' },
  DONE: { box: 'bg-surface-subtle text-text-tertiary', dot: 'border-[1.5px] border-text-tertiary' },
};

export default function StatusPill({ tone, href, testId, children }: { tone: PillTone; href?: string; testId?: string; children: React.ReactNode }) {
  const className = `${PILL} ${TONE[tone].box}`;
  const body = (
    <>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TONE[tone].dot}`} aria-hidden />
      {children}
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className={className}>
      {body}
    </a>
  ) : (
    <span data-testid={testId} className={className}>
      {body}
    </span>
  );
}

/** 카드 상태 줄에서 빼는 띠: 광고(알약에 있음)·방문·다가오는 계약일(지금 할 일에 있음)·뜻 없는 "진행 중" */
export const CARD_HIDDEN_STRIPS = new Set<CardStrip['key']>([
  'AD_LEFT', 'AD_SOON', 'AD_OVERDUE', 'AD_LIVE', 'VISIT_SOON', 'VISIT_ON', 'CONTRACT_DAY', 'BALANCE_DAY', 'IN_PROGRESS',
]);

/** 카드 상태 줄 앞 점 색 */
export const STATUS_DOT: Record<CardStrip['tone'], string> = {
  RISK: 'bg-status-risk',
  ACTION: 'bg-brand',
  CAUTION: 'bg-status-caution',
  GOOD: 'bg-status-good',
  DONE: 'bg-text-tertiary',
};
