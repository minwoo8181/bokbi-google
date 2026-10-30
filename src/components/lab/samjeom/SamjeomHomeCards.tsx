'use client';

import React, { useState } from 'react';
import { ChevronRight, Coins } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';
import ReportRow from '@/components/lab/keeps/ReportRow';

const t = LAB_CONTENT.samjeom.home;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));

/** 카드 밖 구획 제목 (삼쩜삼 "환급은 역시 삼쩜삼") */
export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-1 pt-8 pb-3 text-[20px] font-bold text-text-primary scroll-mt-16">
      {children}
    </h2>
  );
}

/** 카드 맨 위 작은 회색 라벨 + 꺾쇠 (삼쩜삼 "종합소득세 환급 >") */
export function CardLabel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <span>{children}</span>
      <ChevronRight className="w-4 h-4" aria-hidden />
    </>
  );
  const cls = 'w-full min-h-[44px] -mt-3 flex items-center justify-between text-[13px] font-medium text-text-tertiary';
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/**
 * 숫자 카드 삼쩜삼판 ("○○님의 기본 환급액은 56,045원이에요" 카드 방식):
 * 단지 칩 → 두 줄 문장(금액만 파랑) + 동전 아이콘 → 법정 상한 평균 · n% 낮게 정하면 · 낮아지는 금액 목록 → 기준 한 줄.
 * 숫자는 원래 숫자 카드와 같은 homeComplexExamples 값
 */
export function SamjeomSavingsCard({ examples }: { examples: HomeComplexExample[] }) {
  const s = SITE_CONTENT.home.stats;
  const [i, setI] = useState(0);
  const ex = examples[i];
  if (!ex) return null;
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  return (
    <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-5" data-testid="home-stats">
      <CardLabel>{t.savingsLabel}</CardLabel>
      <div role="radiogroup" aria-label={s.exampleChipsLabel} className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
        {examples.map((e, k) => (
          <button
            key={e.label}
            type="button"
            role="radio"
            aria-checked={k === i}
            onClick={() => setI(k)}
            className={`h-9 px-3 flex-shrink-0 rounded-full border text-[13px] whitespace-nowrap ${
              k === i ? 'bg-brand-light border-brand text-brand-hover font-bold' : 'bg-surface-card border-border-default text-text-secondary'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-start justify-between gap-3">
        <p className="text-[20px] font-bold text-text-primary leading-snug" aria-live="polite">
          {t.savingsLead.replace('{label}', ex.label)}
          <br />
          <span className="text-brand tabular-nums">{man(ex.cutWon)}</span>
          {t.savingsTail}
        </p>
        <span className="w-12 h-12 flex-shrink-0 rounded-full bg-[var(--lab-compare,var(--status-caution))] flex items-center justify-center" aria-hidden>
          <Coins className="w-6 h-6 text-text-inverse" />
        </span>
      </div>
      <ul className="mt-3 divide-y divide-border-light">
        <ReportRow label={t.savingsRows.cap} value={man(ex.avgLegalCapWon)} />
        <ReportRow label={t.savingsRows.low.replace('{pct}', String(pct))} value={man(ex.avgLegalCapWon - ex.cutWon)} />
        <ReportRow label={t.savingsRows.cut} value={man(ex.cutWon)} strong />
      </ul>
      <p className="mt-2 text-[12px] text-text-tertiary">{fill(s.exampleBasis, { n: ex.brokeredCount.toLocaleString('ko-KR') })}</p>
    </section>
  );
}

/**
 * "복비, 왜 다를까요?" 삼쩜삼판 ("돈이 되는 이야기" 목록 카드 방식):
 * 카드 밖 제목 → 카드 안 라벨 → 번호 타일 + 제목·칩 + 한 줄 설명 3줄 → 폭 꽉 찬 파랑 버튼(이용 방법 시트)
 */
export function SamjeomProcessCard({ onMore }: { onMore: () => void }) {
  const { process } = SITE_CONTENT.home;
  return (
    <>
      <SectionTitle>{process.sectionTitle}</SectionTitle>
      <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-5" data-testid="home-process">
        <CardLabel onClick={onMore}>{t.processLabel}</CardLabel>
        <ol className="flex flex-col">
          {process.steps.map((step, k) => (
            <li key={step.title} className="py-3 flex gap-3">
              <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-brand-light text-brand flex items-center justify-center text-[15px] font-bold" aria-hidden>
                {k + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-bold text-text-primary">{step.title}</span>
                  <span className="rounded-md bg-surface-subtle px-2 py-1 text-[12px] font-medium text-text-secondary">{step.chip}</span>
                </span>
                <span className="mt-1 block text-[13px] text-text-tertiary leading-normal">{step.desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onMore}
          data-testid="home-process-more"
          className="mt-2 w-full h-12 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
        >
          {process.more}
        </button>
      </section>
    </>
  );
}
