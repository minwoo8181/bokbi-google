'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import StepCircles from '@/components/common/StepCircles';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerTerms;

/**
 * 복비 특약 만들기 단계 머리 카드 (대표님 2026-10-27 A안: 집주인 내 의뢰 현황판과 같은 틀).
 * 흰 카드 하나 = 단계 제목 → 이름 동그라미 진행(종류·상황·특약·복사) → 회색 점 안내 → (있으면) 구분선 아래 "내 상황" 줄
 */
export default function TermsHero({ title, step, situation }: { title: string; step: number; situation?: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface-card overflow-hidden" data-testid="terms-hero">
      <div className="p-5">
        <h2 className="text-[20px] font-extrabold tracking-tight text-text-primary break-keep">{title}</h2>
        <div className="mt-4" data-testid="terms-step">
          <StepCircles labels={t.stepLabels} current={step} ariaLabel={fill(t.stepOf, { n: step, label: t.stepLabels[step - 1] })} />
        </div>
        <p className="mt-3 flex items-start gap-2 text-[13px] font-medium text-text-secondary break-keep text-pretty">
          <span aria-hidden className="mt-[7px] w-1.5 h-1.5 rounded-full bg-text-tertiary shrink-0" />
          {t.notice}
        </p>
      </div>
      {situation && (
        <div className="px-5 py-4 border-t border-border-light" data-testid="terms-situation">
          <p className="text-[13px] font-bold text-text-tertiary">{t.situation}</p>
          <div className="mt-2">{situation}</div>
        </div>
      )}
    </section>
  );
}
