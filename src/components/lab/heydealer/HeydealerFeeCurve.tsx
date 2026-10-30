import React from 'react';
import { LAB_CONTENT } from '@/config/labContent';
import { commissionFromDiscount } from '@/lib/commission';
import { fill } from '@/components/my-requests/format';
import type { RecommendationView, TradeType } from '@/components/analysis/types';

const t = LAB_CONTENT.heydealer.analysis;
const W = 320;
const H = 200;
const PAD = { l: 48, r: 12, t: 16, b: 32 };
/** 가로축 끝 할인율 (다산동 추천 범위 20~50%가 가운데 오게) */
const X_MAX = 0.6;
const manLabel = (won: number) => `${Math.floor(won / 10_000).toLocaleString('ko-KR')}만`;

/**
 * 헤이딜러 "주행거리 → 예상시세" 내려가는 곡선 그래프의 복비판: 가로 = 법정 상한에서 낮춘 비율, 세로 = 복비.
 * 선은 commissionFromDiscount 그대로(직선), 파란 구름 = 엔진 추천 범위, 핀 = 이 집 추천 할인율. 가짜 점(산점도)은 그리지 않는다
 */
export default function HeydealerFeeCurve({
  dealPriceWon,
  tradeType,
  recommendation: r,
}: {
  dealPriceWon: number;
  tradeType: TradeType;
  recommendation: RecommendationView;
}) {
  const fee = (d: number) => commissionFromDiscount(dealPriceWon, tradeType, d);
  const top = fee(0);
  if (top <= 0) return null;
  const x = (d: number) => PAD.l + (d / X_MAX) * (W - PAD.l - PAD.r);
  const y = (won: number) => PAD.t + (1 - won / top) * (H - PAD.t - PAD.b);
  const base = H - PAD.b;
  const pinD = r.discount;
  const pct = (d: number) => Math.round(d * 100);
  const band = `M${x(r.band.min)},${base} L${x(r.band.min)},${y(fee(r.band.min))} L${x(r.band.max)},${y(fee(r.band.max))} L${x(r.band.max)},${base} Z`;

  return (
    <figure className="mt-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={fill(t.curveLabel, { min: pct(r.band.min), max: pct(r.band.max), pct: pct(pinD) })}
      >
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(top * k)} y2={y(top * k)} stroke="var(--border-light)" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(top * k) + 4} textAnchor="end" fontSize={12} fill="var(--text-tertiary)">
              {manLabel(top * k)}
            </text>
          </g>
        ))}
        {[0, 0.2, 0.4, 0.6].map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--text-tertiary)">
            {pct(d)}%
          </text>
        ))}
        <path d={band} fill="var(--brand-primary-light)" />
        <line x1={x(0)} y1={y(top)} x2={x(X_MAX)} y2={y(fee(X_MAX))} stroke="var(--brand-primary)" strokeWidth={4} strokeLinecap="round" />
        <circle cx={x(0)} cy={y(top)} r={4} fill="var(--bg-surface)" stroke="var(--text-tertiary)" strokeWidth={2} />
        <line x1={x(pinD)} x2={x(pinD)} y1={y(fee(pinD))} y2={base} stroke="var(--brand-primary)" strokeWidth={2} strokeDasharray="2 4" />
        <circle cx={x(pinD)} cy={y(fee(pinD))} r={8} fill="var(--brand-primary)" stroke="var(--bg-surface)" strokeWidth={3} />
        {/* 핀 오른쪽 위 꼬리표 (헤이딜러 핀 아래 "10만km" 상자) */}
        <text x={x(pinD) + 12} y={y(fee(pinD)) - 12} fontSize={12} fontWeight={700} fill="var(--brand-primary-hover)">
          {fill(t.curvePin, { pct: pct(pinD) })}
        </text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-tertiary">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-brand-light" aria-hidden />
          {fill(t.curveBand, { min: pct(r.band.min), max: pct(r.band.max) })}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border-2 border-text-tertiary" aria-hidden />
          {t.curveLegal}
        </span>
      </figcaption>
    </figure>
  );
}
