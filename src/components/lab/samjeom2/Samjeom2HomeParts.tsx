'use client';

import React, { useState } from 'react';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';
import { Answer, Ask, FactRows } from './Report';

const t = LAB_CONTENT.samjeom2.home;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));

/**
 * 결과 미리 보기 (삼쩜삼 온보딩 "휴대폰 화면 속 결과" 방식): 회색 테두리 휴대폰 틀 안에 분석 머리 띠(킵 K1) 축소판.
 * 숫자는 예시 단지의 실제 값(homeComplexExamples). "물건 자체를 크게 보여 준다" (taste copy §5)
 */
export function ReportPreview({ examples }: { examples: HomeComplexExample[] }) {
  const [i, setI] = useState(0);
  const ex = examples[i];
  if (!ex) return null;
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  const low = ex.avgLegalCapWon - ex.cutWon;
  return (
    <figure data-testid="home-stats">
      <div className="mx-auto max-w-[312px] rounded-[28px] border-[6px] border-border-default bg-surface-card overflow-hidden">
        <div className="bg-brand-light px-5 pt-6 pb-6">
          <p className="text-[13px] font-medium text-text-secondary">{fill(t.previewLead, { label: ex.label })}</p>
          {/* 축소판이라 20px: 첫 화면 주장(26px)이 홈에서 가장 크게 (taste 앱 "큰 것 하나") */}
          <p className="mt-2 text-[17px] font-bold text-text-primary leading-snug" aria-live="polite">
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
            <dd className="text-[13px] font-bold text-brand-hover tabular-nums">{man(low)}</dd>
          </div>
        </dl>
        <p className="px-5 pb-5 text-[12px] text-text-tertiary">{fill(t.previewBasis, { n: ex.brokeredCount.toLocaleString('ko-KR') })}</p>
      </div>
      {/* 예시 단지 바꾸기: 틀 아래 작은 알약 (보조 동작이라 작고 회색) */}
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

/** 집주인이 먼저 묻는 것 3개 → 답 카드, 끝에 행동 하나 (의문을 다 푼 자리에 버튼) */
export function OwnerQna({ offices, onCta }: { offices: number; onCta: () => void }) {
  return (
    <div data-testid="home-process">
      {t.qa.map((item) => (
        <div key={item.q}>
          <Ask>{item.q}</Ask>
          <Answer lead={item.a}>
            <FactRows rows={item.rows.map((r) => ({ label: r.label, value: fill(r.value, { offices: offices.toLocaleString('ko-KR') }) }))} />
          </Answer>
        </div>
      ))}
      <button
        type="button"
        onClick={onCta}
        className="mt-6 w-full h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold"
      >
        {t.askCta}
      </button>
    </div>
  );
}

/** 중개사 구획: 중개사 관점 한 줄 주장 + 사실 3줄 + 가입 버튼(주) · 먼저 보기(글자 링크) */
export function BrokerSection({ onRegister, onMore }: { onRegister: () => void; onMore: () => void }) {
  return (
    <section className="rounded-2xl bg-surface-card px-5 pt-6 pb-5" data-testid="home-partner" id="lab-broker">
      <h3 className="text-[20px] font-bold text-text-primary leading-snug whitespace-pre-line">{t.brokerHead}</h3>
      <FactRows rows={t.brokerRows} />
      <button
        type="button"
        onClick={onRegister}
        data-testid="lab-broker-register"
        className="mt-5 w-full h-13 rounded-xl bg-text-primary text-text-inverse text-[15px] font-bold"
      >
        {t.brokerCta}
      </button>
      <button type="button" onClick={onMore} className="mt-1 w-full h-11 text-[13px] font-bold text-text-secondary underline underline-offset-4">
        {t.brokerMore}
      </button>
    </section>
  );
}
