import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { positionNote } from '@/lib/analysis/explain';
import type { RecommendationView, TradeType } from '@/components/analysis/types';
import ReportRow from './ReportRow';

const t = LAB_CONTENT.keeps.speedCompare;
/** 비교 막대 최대 높이 (px) */
const BAR_MAX = 120;

/**
 * 🔖 킵 K2 (2026-10-30, 출처 삼쩜삼 "또래 평균 vs 나"): 결론 문장 → 소화 속도 한 줄 → 막대 둘(다산동 평균 1배 vs 이 단지 n배)
 * → 시장 설명 → 지금 매물·6개월 거래. 막대 높이는 엔진 speedRatio 그대로, 데이터 부족이면 막대를 그리지 않는다
 */
export default function KeepSpeedCompare({
  recommendation: r,
  tradeType,
  complexName,
}: {
  recommendation: RecommendationView;
  tradeType: TradeType;
  complexName: string;
}) {
  const rr = SITE_CONTENT.analysis.recommendationReason;
  const conclusion = rr.titleConclusion[positionNote(r).key].replace('{verb}', rr.titleVerb[tradeType]);
  const ratio = r.speedRatio;
  const barMax = ratio !== null ? Math.max(1, ratio) : 1;

  return (
    <section className="bg-surface-card px-5 pt-8 pb-8" data-keep="K2">
      <h2 className="text-[26px] font-bold text-text-primary leading-[1.35] break-keep">{conclusion}</h2>
      {ratio !== null && (
        <>
          <p className="mt-2 text-[15px] text-text-secondary">
            {rr.stepSpeed} <span className="font-bold text-brand-hover">{rr.stepSpeedValue.replace('{ratio}', ratio.toFixed(1))}</span>
          </p>
          <div
            className="mt-8 flex items-end justify-center gap-10"
            role="img"
            aria-label={`${t.compareAvg} 1배, ${complexName} ${ratio.toFixed(1)}배`}
          >
            {[
              { label: t.compareAvg, v: 1, color: 'bg-[var(--lab-compare,var(--status-caution))]', text: 'text-text-secondary' },
              { label: complexName, v: ratio, color: 'bg-brand', text: 'text-brand-hover' },
            ].map((b) => (
              <div key={b.label} className="w-24 flex flex-col items-center">
                <span className={`text-[15px] font-bold tabular-nums ${b.text}`}>{t.compareUnit.replace('{n}', b.v.toFixed(1))}</span>
                <div className={`mt-2 w-16 rounded-lg ${b.color}`} style={{ height: Math.max(8, Math.round((b.v / barMax) * BAR_MAX)) }} />
                <span className="mt-2 text-[13px] text-text-tertiary text-center leading-tight line-clamp-2">{b.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-8 text-[15px] text-text-secondary leading-relaxed">{rr.positionDesc[r.grade]}</p>
      <ul className="mt-4 divide-y divide-border-light">
        <ReportRow label={t.listings} value={t.countUnit.replace('{n}', String(r.listings))} />
        <ReportRow label={t.deals} value={t.countUnit.replace('{n}', String(r.recentDeals))} />
      </ul>
    </section>
  );
}
