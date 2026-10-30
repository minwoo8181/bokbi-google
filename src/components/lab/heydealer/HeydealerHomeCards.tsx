'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import type { HomeFacts } from '@/lib/home/homeStats';
import { fill } from '@/components/my-requests/format';

const t = LAB_CONTENT.heydealer.home;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));
const n = (v: number) => v.toLocaleString('ko-KR');

export function HdSectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="pt-10 pb-4">
      <h2 className="text-[20px] font-bold text-text-primary">{children}</h2>
      {note && <p className="mt-1 text-[13px] text-text-tertiary">{note}</p>}
    </div>
  );
}

/**
 * 전광판 (헤이딜러 메인 숫자판 "차량 평균 견적수 7.9건 | 평균 거래차량 가격"): 큰 숫자 2칸 + 작은 숫자 2칸.
 * 숫자는 데이터 파일 사실만 (page.tsx HOME_FACTS)
 */
export function HdFactBoard({ facts }: { facts: HomeFacts }) {
  const big = [
    { label: t.boardTrades, value: fill(t.unitCount, { n: n(facts.trades) }) },
    { label: t.boardListings, value: fill(t.unitCount, { n: n(facts.listings) }) },
  ];
  const small = [
    { label: t.boardComplexes, value: fill(t.unitComplex, { n: n(facts.complexes) }) },
    { label: t.boardOffices, value: fill(t.unitOffice, { n: n(facts.offices) }) },
  ];
  return (
    <section className="rounded-2xl bg-surface-card border border-border-light" data-testid="home-stats">
      <dl className="grid grid-cols-2 divide-x divide-border-light">
        {big.map((b) => (
          <div key={b.label} className="px-5 pt-6 pb-5">
            <dt className="text-[13px] text-text-tertiary">{b.label}</dt>
            {/* 20px: 첫 화면의 주인공은 위 질문(26px) 하나 (taste 앱 화면 "큰 것 하나") */}
            <dd className="mt-1 text-[20px] font-bold text-text-primary tabular-nums leading-tight">{b.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-2 divide-x divide-border-light border-t border-border-light">
        {small.map((b) => (
          <div key={b.label} className="px-5 py-4 flex items-baseline justify-between gap-2">
            <dt className="text-[13px] text-text-tertiary">{b.label}</dt>
            <dd className="text-[15px] font-bold text-text-primary tabular-nums">{b.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * 단지별 복비 예시 = 헤이딜러 "실시간 견적" 펼침 카드: 이름 | 거래 수 · 오른쪽 파랑 금액 → 누르면 n% 낮게 정한 경우.
 * 숫자는 원래 숫자 카드와 같은 homeComplexExamples 값 (법정 상한 평균 · 가정 할인율만큼 낮아지는 금액)
 */
export function HdExampleList({ examples }: { examples: HomeComplexExample[] }) {
  const [open, setOpen] = useState<string | null>(examples[0]?.label ?? null);
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  if (examples.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2" data-testid="hd-examples">
      {examples.map((ex) => {
        const on = open === ex.label;
        return (
          <li key={ex.label} className={`rounded-2xl bg-surface-card border ${on ? 'border-brand-line' : 'border-border-light'}`}>
            <button
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : ex.label)}
              className="w-full min-h-[72px] px-5 py-4 flex items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-text-primary truncate">{ex.label}</span>
                <span className="mt-1 block text-[13px] text-text-tertiary">{fill(t.exampleSub, { n: n(ex.brokeredCount) })}</span>
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span className="flex flex-col items-end">
                  <span className="text-[17px] font-bold text-brand tabular-nums">{man(ex.avgLegalCapWon)}</span>
                  <span className="text-[12px] text-text-tertiary">{t.exampleCapLabel}</span>
                </span>
                <ChevronDown className={`w-5 h-5 text-text-disabled transition-transform duration-fast ${on ? 'rotate-180' : ''}`} aria-hidden />
              </span>
            </button>
            {on && (
              <div className="mx-5 mb-4 px-4 py-3 rounded-xl bg-brand-subtle flex items-center justify-between gap-2">
                <span className="text-[13px] text-text-secondary">{fill(t.exampleCut, { pct })}</span>
                <span className="text-[15px] font-bold text-brand-hover tabular-nums">{fill(t.exampleCutValue, { amount: man(ex.cutWon) })}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 진행 순서 = 헤이딜러 경매 "진행상황" 점 + 점선 타임라인 (번호 대신 점, 단계마다 한 줄 설명) */
export function HdProcessTimeline({ onMore }: { onMore: () => void }) {
  const { process } = SITE_CONTENT.home;
  return (
    <section className="rounded-2xl bg-surface-card border border-border-light px-5 pt-6 pb-5" data-testid="home-process">
      <ol>
        {process.steps.map((step, i) => {
          const last = i === process.steps.length - 1;
          return (
            <li key={step.title} className="relative pl-8 pb-6 last:pb-2">
              {!last && <span className="absolute left-[7px] top-5 bottom-0 border-l-2 border-dotted border-brand-line-strong" aria-hidden />}
              <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-brand ring-4 ring-brand-light" aria-hidden />
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-bold text-text-primary">{step.title}</span>
                <span className="text-[12px] font-bold text-brand-hover">{step.chip}</span>
              </span>
              <span className="mt-1 block text-[13px] text-text-secondary leading-normal">{step.desc}</span>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={onMore}
        data-testid="home-process-more"
        className="mt-2 w-full h-12 rounded-xl border border-brand text-brand text-[15px] font-bold"
      >
        {process.more}
      </button>
    </section>
  );
}
