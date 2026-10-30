'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';

const t = LAB_CONTENT.samjeom.home;
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));
/** 법정 상한 막대 높이 (px) — 낮춘 막대는 같은 비율로 */
const CAP_BAR = 144;
/** 끝 글자 받침이 있으면 "은", 없으면(또는 한글이 아니면) "는" */
const topicJosa = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '은' : '는';
};

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
 * 숫자 카드 삼쩜삼판 v2 (2026-10-30 대표님 "다시 디자인", 킵 K2 막대 비교와 같은 말투):
 * 단지 탭(밑줄) → 두 줄 문장(차이 금액만 파랑) → 막대 둘(법정 상한 평균 회색 · n% 낮게 파랑) + 두 막대 꼭대기 사이 차이 표시
 * → 기준 한 줄 → 연파랑 보조 버튼(검색창으로). 숫자는 원래 숫자 카드와 같은 homeComplexExamples 값
 */
export function SamjeomSavingsCard({ examples, onCta }: { examples: HomeComplexExample[]; onCta: () => void }) {
  const s = SITE_CONTENT.home.stats;
  const [i, setI] = useState(0);
  const ex = examples[i];
  if (!ex) return null;
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  const lowWon = ex.avgLegalCapWon - ex.cutWon;
  const lowBar = Math.round((lowWon / ex.avgLegalCapWon) * CAP_BAR);

  return (
    <section className="rounded-2xl bg-surface-card pb-5 overflow-hidden" data-testid="home-stats">
      {/* 단지 탭: 밑줄 탭 (삼쩜삼 리포트 상단 탭) */}
      <div role="radiogroup" aria-label={s.exampleChipsLabel} className="grid grid-cols-3 border-b border-border-light">
        {examples.map((e, k) => (
          <button
            key={e.label}
            type="button"
            role="radio"
            aria-checked={k === i}
            onClick={() => setI(k)}
            className={`h-12 px-1 text-[13px] break-keep border-b-2 -mb-px ${
              k === i ? 'border-text-primary text-text-primary font-bold' : 'border-transparent text-text-tertiary font-medium'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="px-5">
        <p className="mt-6 text-[20px] font-bold text-text-primary leading-snug" aria-live="polite">
          {t.savingsLead.replace('{label}', ex.label).replace('{josa}', topicJosa(ex.label))}
          <br />
          <span className="text-brand tabular-nums">{man(ex.cutWon)}</span>
          {t.savingsTail}
        </p>

        {/* 두 막대 + 차이: 낮춘 막대 위 빈칸이 곧 줄어드는 금액 */}
        <div
          className="mt-8 grid grid-cols-2 gap-6 items-end"
          role="img"
          aria-label={`${t.barCap} ${man(ex.avgLegalCapWon)}, ${fill(t.barLow, { pct })} ${man(lowWon)}`}
        >
          {[
            { label: t.barCap, won: ex.avgLegalCapWon, h: CAP_BAR, bar: 'bg-border-default', text: 'text-text-secondary' },
            { label: fill(t.barLow, { pct }), won: lowWon, h: lowBar, bar: 'bg-brand', text: 'text-brand-hover' },
          ].map((b, k) => (
            <div key={b.label} className="flex flex-col items-center">
              <span className={`text-[15px] font-bold tabular-nums ${b.text}`}>{man(b.won)}</span>
              <div className="mt-2 w-full max-w-[96px] relative" style={{ height: CAP_BAR }}>
                {k === 1 && (
                  // 법정 상한 높이까지 점선 칸 = 줄어드는 금액
                  <div
                    className="absolute inset-x-0 top-0 rounded-t-lg border-2 border-dashed border-brand-line-strong flex items-center justify-center"
                    style={{ height: CAP_BAR - lowBar }}
                  >
                    <span className="text-[12px] font-bold text-brand-hover tabular-nums">−{man(ex.cutWon)}</span>
                  </div>
                )}
                <div className={`absolute inset-x-0 bottom-0 rounded-lg ${b.bar}`} style={{ height: b.h }} />
              </div>
              <span className="mt-2 text-[13px] text-text-tertiary">{b.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12px] text-text-tertiary">{fill(s.exampleBasis, { n: ex.brokeredCount.toLocaleString('ko-KR') })}</p>
        <button
          type="button"
          onClick={onCta}
          className="mt-4 w-full h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
        >
          {t.savingsCta}
        </button>
      </div>
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
          className="mt-2 w-full h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
        >
          {process.more}
        </button>
      </section>
    </>
  );
}
