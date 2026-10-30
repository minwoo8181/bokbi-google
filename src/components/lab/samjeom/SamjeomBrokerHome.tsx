'use client';

import React from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';
import { Answer, Ask, FactRows, SectionTitle } from './SamjeomUi';

const t = LAB_CONTENT.samjeom.broker;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));

/**
 * 중개사 홈 (집주인 홈과 같은 뼈대, 관점만 중개사):
 * ① 주장 + 한 문장 + 등록(주 행동) ② 이런 의뢰가 와요(받는 화면 예시, 실제 예시 단지 계산값) ③ 중개사가 먼저 묻는 것
 * ④ 등록은 이렇게 해요(가입 4단계) + 같은 등록 버튼. 비용 표현(광고비·0원·무료·크레딧)은 쓰지 않는다 (siteContent partnerBanner 규칙)
 */
export default function SamjeomBrokerHome({ examples }: { examples: HomeComplexExample[] }) {
  const ex = examples[0];
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  const register = (
    <Link
      href="/agent/register"
      data-testid="lab-broker-register"
      className="w-full h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold flex items-center justify-center"
    >
      {t.cta}
    </Link>
  );

  return (
    <>
      <section className="rounded-2xl bg-surface-card px-5 pt-8 pb-5">
        <h1 className="text-[26px] font-bold text-text-primary leading-[1.35] whitespace-pre-line">{t.title}</h1>
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">{t.lead}</p>
        <div className="mt-6">{register}</div>
        <Link href="/login" className="mt-1 w-full h-11 flex items-center justify-center text-[13px] font-bold text-text-secondary underline underline-offset-4">
          {t.login}
        </Link>
      </section>

      {ex && (
        <>
          <SectionTitle>{t.sampleTitle}</SectionTitle>
          {/* 중개사가 받는 의뢰 카드 모양 (예시 표시를 붙여 실제 의뢰로 읽히지 않게) */}
          <figure>
            <div className="rounded-2xl bg-surface-card px-5 pt-5 pb-5 border border-border-default">
              <span className="inline-flex h-6 px-2 items-center rounded-md bg-surface-subtle text-[12px] font-bold text-text-tertiary">{t.sampleBadge}</span>
              <p className="mt-3 text-[17px] font-bold text-text-primary">
                {ex.label} · {t.sampleTrade}
              </p>
              <dl className="mt-3 divide-y divide-border-light">
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-[15px] text-text-secondary">{t.sampleFee}</dt>
                  <dd className="text-[20px] font-bold text-brand tabular-nums">{man(ex.avgLegalCapWon - ex.cutWon)}</dd>
                </div>
                <div className="py-3 flex items-baseline justify-between gap-4">
                  <dt className="text-[15px] text-text-secondary">{t.sampleUnit}</dt>
                  <dd className="inline-flex items-center gap-1 text-[15px] font-bold text-text-primary">
                    <Lock className="w-4 h-4 text-text-tertiary" aria-hidden />
                    {t.sampleUnitValue}
                  </dd>
                </div>
              </dl>
            </div>
            <figcaption className="mt-3 text-center text-[12px] text-text-tertiary">{fill(t.sampleCaption, { pct })}</figcaption>
          </figure>
        </>
      )}

      <SectionTitle>{t.askTitle}</SectionTitle>
      <div className="-mt-8">
        {t.qa.map((item) => (
          <div key={item.q}>
            <Ask>{item.q}</Ask>
            <Answer lead={item.a}>
              <FactRows rows={item.rows} />
            </Answer>
          </div>
        ))}
      </div>

      <SectionTitle>{t.joinTitle}</SectionTitle>
      <section className="rounded-2xl bg-surface-card px-5 pt-6 pb-5">
        {/* 순서가 있는 단계라 번호를 쓴다 (frontend-design: 순서일 때만 번호) */}
        <ol>
          {t.joinSteps.map((s, i) => (
            <li key={s.title} className="relative pl-10 pb-5 last:pb-2">
              {i < t.joinSteps.length - 1 && <span className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-border-default" aria-hidden />}
              <span className="absolute left-0 top-0 w-6 h-6 rounded-full bg-brand-light text-[12px] font-bold text-brand-hover flex items-center justify-center">
                {i + 1}
              </span>
              <span className="block text-[15px] font-bold text-text-primary">{s.title}</span>
              <span className="mt-1 block text-[13px] text-text-secondary leading-normal">{s.desc}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4">{register}</div>
      </section>
    </>
  );
}
