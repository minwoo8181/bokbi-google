'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand } from '@/lib/utils';
import { EMPTY_LIVE, homeStatsView, parseLiveStats, type HomeFacts, type LiveStats } from '@/lib/home/homeStats';
import { HOME_SCENARIO_DISCOUNT, type HomeComplexExample } from '@/lib/home/homeMarket';
import { fill } from '@/components/my-requests/format';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '@/components/analysis/segmentStyles';

const t = SITE_CONTENT.home.stats;
const num = (n: number) => n.toLocaleString('ko-KR');
const man = (won: number) => formatPriceTenThousand(Math.floor(won / 10_000));

/**
 * 단지 예시 칩 + 큰 숫자 + 막대 한 줄 (대표님 2026-10-29 C안, dataviz: 큰 숫자 하나 + 같은 색 진하기 두 단계).
 * 진한 칸 = 가정 할인율만큼 낮게 정한 복비, 연한 칸 = 그만큼 절약하는 금액. 둘을 더하면 법정 상한 평균
 */
function ExamplePanel({ examples }: { examples: HomeComplexExample[] }) {
  const [i, setI] = useState(0);
  const ex = examples[i];
  const pct = Math.round(HOME_SCENARIO_DISCOUNT * 100);
  const lowWon = ex.avgLegalCapWon - ex.cutWon;
  return (
    <div className="mt-4" data-testid="home-stats-example">
      <div role="radiogroup" aria-label={t.exampleChipsLabel} className={`${SEGMENT_TRACK} grid-cols-3`}>
        {examples.map((e, k) => (
          <button
            key={e.label}
            type="button"
            role="radio"
            aria-checked={k === i}
            onClick={() => setI(k)}
            className={`${SEGMENT_ITEM} ${segmentItemState(k === i)} px-1 text-[13px] break-keep ${k === i ? 'font-bold' : 'font-medium'}`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[40px] font-bold text-brand tracking-[-0.03em] leading-tight" aria-live="polite">
        {man(ex.cutWon)}
        <ArrowDown className="w-8 h-8" strokeWidth={2.6} aria-label={t.exampleArrowLabel} />
      </p>
      <p className="mt-1 inline-block rounded-xl border border-status-good-line bg-status-good-light px-3 py-2 text-[13px] font-bold text-[var(--status-good-strong)]">
        {fill(t.exampleUnit, { pct })}
      </p>
      <div className="mt-4 flex gap-0.5 h-6" aria-hidden>
        <span className="rounded-l bg-brand" style={{ width: `${(lowWon / ex.avgLegalCapWon) * 100}%` }} />
        <span className="flex-1 rounded-r bg-[var(--brand-mid)]" />
      </div>
      <div className="mt-2 flex justify-between gap-2 text-[12px] font-medium text-text-secondary">
        <span>
          {fill(t.exampleLow, { pct })} <span className="font-bold text-brand">{man(lowWon)}</span>
        </span>
        <span>{fill(t.exampleCap, { amount: man(ex.avgLegalCapWon) })}</span>
      </div>
      <p className="mt-2 text-[12px] font-medium text-text-tertiary">{fill(t.exampleBasis, { n: num(ex.brokeredCount) })}</p>
    </div>
  );
}

/**
 * 홈 숫자 카드 "우리 단지 복비, 이만큼 아낄 수 있어요" (대표님 2026-10-29 캔버스 확정):
 * 단지 칩 → 큰 숫자 → 막대 한 줄 → 기준 한 줄. 예전 107억 줄·월별 막대·실거래 스케일 3칸은 숫자와 관련이 없어 뺐다.
 * 매칭 1건부터는 단지 칩 위에 실적 줄(한 집 평균 n, ● LIVE)이 붙는다 (lib/home/homeStats.ts).
 * 사실 숫자는 서버가 데이터 파일에서, 실시간 집계는 /api/public-stats에서
 */
export default function HomeStatsCard({ facts, examples }: { facts: HomeFacts; examples: HomeComplexExample[] }) {
  const [live, setLive] = useState<LiveStats>(EMPTY_LIVE);

  useEffect(() => {
    let alive = true;
    fetch('/api/public-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((v: unknown) => alive && setLive(parseLiveStats(v)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const v = homeStatsView(facts, live, t);

  return (
    <section className="bg-surface-card rounded-3xl px-5 py-7" data-testid="home-stats" data-stage={v.stage}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[20px] font-bold text-text-primary tracking-tight break-keep">{t.sectionTitle}</h2>
        {v.left && live.calcCount !== null && (
          <span className="inline-flex items-center gap-2 flex-shrink-0 text-[13px] font-bold text-brand tabular-nums" data-testid="home-stats-calc">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
            {fill(t.calcShortValue, { n: num(live.calcCount) })}
          </span>
        )}
      </div>

      {v.stage === 'LIVE' && (
        <div className="mt-4 rounded-2xl bg-brand-light px-4 py-4" data-testid="home-stats-live">
          <p className="text-[13px] font-medium text-text-secondary">
            {v.title} <span className="font-bold text-brand-hover">● {v.badge}</span>
          </p>
          <p className="mt-1 text-[20px] font-bold text-text-primary tabular-nums tracking-tight">{v.big}</p>
          <p className="text-[13px] font-medium text-text-tertiary">{v.sub}</p>
        </div>
      )}

      {examples.length > 0 && <ExamplePanel examples={examples} />}
    </section>
  );
}
