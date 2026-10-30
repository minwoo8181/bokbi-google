'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { CardStrip, StripTone } from '@/lib/deal/deal';
import { fill } from '@/components/my-requests/format';
import { shortDate } from './DealTimeline';

const t = SITE_CONTENT.brokerDeal;

/** 색 띠 뜻: 빨강 기한 / 파랑 내가 확인할 것 / 노랑 24시간 안 / 초록 다음 일정 / 회색 끝남 */
export const STRIP_TONE: Record<StripTone, string> = {
  RISK: 'bg-status-risk-light text-[var(--status-risk-strong)]',
  ACTION: 'bg-brand-light text-brand-hover',
  CAUTION: 'bg-status-caution-light text-text-primary',
  GOOD: 'bg-status-good-light text-[var(--status-good-strong)]',
  DONE: 'bg-surface-subtle text-text-tertiary',
};

/** 띠 문구와 오른쪽 짧은 값 (남은 시간·D-day) */
export function stripText(s: CardStrip): { label: string; right: string } {
  const v = s.vars;
  const date = typeof v.date === 'string' ? shortDate(v.date) : '';
  const vars: Record<string, string | number> = {
    ...v,
    date,
    field: typeof v.field === 'string' ? t.fields[v.field as 'CONTRACT' | 'BALANCE'] : '',
    step: typeof v.step === 'string' ? t.steps[v.step as 'PROVISIONAL'] : '',
  };
  const label = fill(t.strip[s.key], vars);
  let right = '';
  if (typeof v.h === 'number' && (s.key === 'VISIT_SOON' || s.key === 'AD_LEFT' || s.key === 'AD_SOON' || s.key === 'REMOVE_AD' || s.key === 'REMOVE_AD_PAUSED')) right = fill(t.strip.hours, { h: v.h });
  if (typeof v.dday === 'number') right = v.dday === 0 ? t.strip.today : v.dday === 1 ? t.strip.tomorrow : fill(t.dday, { n: v.dday });
  return { label, right };
}

/** 내가 할 일(파랑)은 눌러야 한다는 게 보이게 꽉 찬 파랑 + 동작 이름 (대표님 2026-10-25: "어딜 눌러야 할지 모르겠다") */
const ACTION_SOLID = 'bg-brand text-white';

/**
 * 목록 카드·거래 페이지 아래 색 띠 한 줄. 상태가 바뀌면 색이 부드럽게 바뀐다.
 * tappable(목록 카드): 오른쪽에 ›, 내가 할 일이면 `확인하기 ›`처럼 동작 이름까지
 */
export default function DealStrip({ strip, tappable = false }: { strip: CardStrip; tappable?: boolean }) {
  const { label, right } = stripText(strip);
  const action = tappable && strip.tone === 'ACTION';
  const cta = action ? (t.strip.cta as Partial<Record<string, string>>)[strip.key] ?? t.strip.cta.default : '';
  return (
    <p
      className={`px-4 ${action ? 'py-3' : 'py-3'} flex items-center justify-between gap-2 text-[13px] font-bold transition-colors duration-base ease-out-soft ${
        action ? ACTION_SOLID : STRIP_TONE[strip.tone]
      }`}
      data-testid="deal-strip"
      data-tone={strip.tone}
    >
      <span className="min-w-0 break-keep">{label}</span>
      {(right || tappable) && (
        <span className="shrink-0 inline-flex items-center gap-1 tabular-nums">
          {right}
          {action && <span className="ml-1 h-7 px-3 rounded-full bg-surface-card text-brand inline-flex items-center">{cta}</span>}
          {tappable && <ChevronRight className="w-4 h-4" aria-hidden />}
        </span>
      )}
    </p>
  );
}
