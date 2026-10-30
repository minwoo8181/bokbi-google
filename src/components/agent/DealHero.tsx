'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { CardStrip, Viewer } from '@/lib/deal/deal';
import StepCircles from '@/components/common/StepCircles';
import { fill } from '@/components/my-requests/format';
import { stripText } from './DealStrip';

const t = SITE_CONTENT.brokerDeal;

/** 섹션 제목 (카드 밖, 내 사무소·내 매물과 같은 모양) */
export const DEAL_SECTION_TITLE = 'pt-3 pb-2 px-1 text-[17px] font-bold text-text-primary';

/**
 * 거래 페이지 머리 카드 (대표님 2026-10-27 A안, 내 의뢰 RequestHero·특약 TermsHero와 같은 틀).
 * 흰 카드 하나 = 상태 제목(전엔 색 띠) → 이름 동그라미(매칭·광고·계약·잔금·후기) → 회색 점 안내 → 구분선 아래 상대 정보 줄.
 * 색은 기한이 급할 때(빨강 띠)의 오른쪽 남은 시간 글자에만
 */
export default function DealHero({ strip, step, viewer, children }: { strip: CardStrip; step: number; viewer: Viewer; children: React.ReactNode }) {
  const { label, right } = stripText(strip);
  return (
    <section className="rounded-2xl bg-surface-card overflow-hidden" data-testid="deal-hero">
      <div className="p-5">
        <h2 className="flex items-start justify-between gap-3 text-[20px] font-extrabold tracking-tight text-text-primary break-keep text-pretty" data-testid="deal-strip" data-tone={strip.tone}>
          <span className="min-w-0">{label}</span>
          {right && <span className={`shrink-0 mt-1 text-[15px] font-bold tabular-nums ${strip.tone === 'RISK' ? 'text-[var(--status-risk-strong)]' : 'text-text-tertiary'}`}>{right}</span>}
        </h2>
        {step > 0 && (
          <div className="mt-4" data-testid="deal-step">
            <StepCircles labels={t.hero.stepLabels} current={step} ariaLabel={fill(t.hero.stepOf, { n: Math.min(step, t.hero.stepLabels.length), label: t.hero.stepLabels[Math.min(step, t.hero.stepLabels.length) - 1] })} />
          </div>
        )}
        <p className="mt-3 flex items-start gap-2 text-[13px] font-medium text-text-secondary break-keep text-pretty">
          <span aria-hidden className="mt-[7px] w-1.5 h-1.5 rounded-full bg-text-tertiary shrink-0" />
          {t.hero.hint[viewer]}
        </p>
      </div>
      <div className="px-5 py-3 border-t border-border-light">{children}</div>
    </section>
  );
}
