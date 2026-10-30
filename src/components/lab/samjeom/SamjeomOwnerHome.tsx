'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';
import HomeSearchSection, { type SearchComplex } from '@/components/home/HomeSearchSection';
import { Answer, Ask, FactRows, SectionTitle, StepBar } from './SamjeomUi';

const t = LAB_CONTENT.samjeom.owner;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));

/** 결과 미리 보기: 휴대폰 틀 속 분석 머리 띠 축소판 (삼쩜삼 온보딩 방식). 숫자는 예시 단지의 실제 값 */
function ReportPreview({ examples }: { examples: HomeComplexExample[] }) {
  const [i, setI] = useState(0);
  const ex = examples[i];
  if (!ex) return null;
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  return (
    <figure data-testid="home-stats">
      <div className="mx-auto max-w-[312px] rounded-[28px] border-[6px] border-border-default bg-surface-card overflow-hidden">
        <div className="bg-brand-light px-5 pt-6 pb-6" aria-live="polite">
          <p className="text-[13px] font-medium text-text-secondary">{fill(t.previewLead, { label: ex.label })}</p>
          <p className="mt-2 text-[17px] font-bold text-text-primary leading-snug">
            <span className="text-[20px] text-brand tabular-nums">{man(ex.cutWon)}</span>
            <br />
            {t.previewCut}
          </p>
        </div>
        <dl className="px-5 py-2 divide-y divide-border-light">
          <div className="py-3 flex justify-between gap-2">
            <dt className="text-[13px] text-text-secondary">{t.previewCap}</dt>
            <dd className="text-[13px] font-bold text-text-primary tabular-nums">{man(ex.avgLegalCapWon)}</dd>
          </div>
          <div className="py-3 flex justify-between gap-2">
            <dt className="text-[13px] text-text-secondary">{fill(t.previewLow, { pct })}</dt>
            <dd className="text-[13px] font-bold text-brand-hover tabular-nums">{man(ex.avgLegalCapWon - ex.cutWon)}</dd>
          </div>
        </dl>
        <p className="px-5 pb-5 text-[12px] text-text-tertiary">{fill(t.previewBasis, { n: ex.brokeredCount.toLocaleString('ko-KR') })}</p>
      </div>
      <div role="radiogroup" aria-label={t.previewTitle} className="mt-4 flex flex-wrap justify-center gap-2">
        {examples.map((e, k) => (
          <button
            key={e.label}
            type="button"
            role="radio"
            aria-checked={k === i}
            onClick={() => setI(k)}
            className={`h-11 px-4 rounded-full text-[13px] ${
              k === i ? 'bg-text-primary text-text-inverse font-bold' : 'bg-surface-card text-text-secondary border border-border-default'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <figcaption className="mt-3 text-center text-[12px] text-text-tertiary">{t.previewCaption}</figcaption>
    </figure>
  );
}

/**
 * 집주인 홈 (논증 순서 = 화면 순서, taste copy §1):
 * ① 주장 두 줄 + 한 문장 + 검색(주 행동 하나) + 진행 막대(분석 화면 구획 순서와 같은 이름)
 * ② 이런 리포트를 받아요(실제 예시) ③ 집주인이 먼저 묻는 것 → 같은 행동 버튼 ④ 중개사 보기로 넘어가는 줄
 */
export default function SamjeomOwnerHome({
  complexes,
  examples,
  onFocusSearch,
  onBroker,
}: {
  complexes: SearchComplex[];
  examples: HomeComplexExample[];
  onFocusSearch: () => void;
  onBroker: () => void;
}) {
  return (
    <>
      <section className="rounded-2xl bg-surface-card px-5 pt-8 pb-6">
        <h1 className="text-[26px] font-bold text-text-primary leading-[1.35] whitespace-pre-line">{t.title}</h1>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">{t.lead}</p>
        <div className="mt-6">
          <HomeSearchSection complexes={complexes} />
        </div>
        <div className="mt-6">
          <StepBar current={0} />
        </div>
      </section>

      <SectionTitle>{t.previewTitle}</SectionTitle>
      <ReportPreview examples={examples} />

      <SectionTitle>{t.askTitle}</SectionTitle>
      <div className="-mt-8" data-testid="home-process">
        {t.qa.map((item) => (
          <div key={item.q}>
            <Ask>{item.q}</Ask>
            <Answer lead={item.a}>
              <FactRows rows={item.rows} />
            </Answer>
          </div>
        ))}
      </div>
      <button type="button" onClick={onFocusSearch} className="mt-6 w-full h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold">
        {t.askCta}
      </button>

      <button
        type="button"
        onClick={onBroker}
        data-testid="home-partner"
        className="mt-10 w-full min-h-[64px] px-5 rounded-2xl bg-surface-card flex items-center justify-between gap-3 text-left"
      >
        <span className="text-[15px] font-bold text-text-primary">{t.brokerCard}</span>
        <span className="flex-shrink-0 inline-flex items-center text-[13px] font-bold text-brand-hover">
          {t.brokerCardLink}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </span>
      </button>
    </>
  );
}
