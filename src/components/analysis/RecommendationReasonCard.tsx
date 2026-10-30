'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { ENGINE_PARAMS } from '@/lib/analysis/marketEngine';
import { positionNote } from '@/lib/analysis/explain';
import type { FloorCategory, RecommendationView, TradeType } from './types';

interface RecommendationReasonCardProps {
  tradeType: TradeType;
  recommendation: RecommendationView | null;
  observedAt: string;
  /** 분석 데이터 규모 (부제) */
  datasetStats: { complexes: number; trades: number; saleListings: number; jeonseListings: number };
  /** AI 설명 요청용 식별자 (숫자는 서버가 다시 계산한다) */
  complexId: number;
  pyeongId: string;
  floorCategory: FloorCategory;
}

type Narrative = { source: 'AI' | 'TEMPLATE'; headline: string; body: string };

const shortDate = (iso: string) => iso.slice(2).replace(/-/g, '.');
/** 시장 위치 스펙트럼: 다산동 중앙 단지 대비 희소도 비를 log2로 펴서 −1.5~+1.5 구간에 놓는다 */
const SPAN = 1.5;
const toPct = (ratio: number) => ((Math.min(SPAN, Math.max(-SPAN, Math.log2(ratio))) + SPAN) / (2 * SPAN)) * 100;

/**
 * 집주인 분석 플로우의 추천 근거 카드 (대표님 지시 2026-10-22).
 * 이 평형 면적대의 수요·공급 위치(6개월) → AI 분석 요약 → 추천 할인 계산 순서 (엔진 v4).
 * 숫자는 모두 엔진 결과 그대로이며, 중개사 수입과 비교하는 문장은 쓰지 않는다.
 */
export default function RecommendationReasonCard({ tradeType, recommendation: r, observedAt, datasetStats, complexId, pyeongId, floorCategory }: RecommendationReasonCardProps) {
  const c = SITE_CONTENT.analysis.recommendationReason;
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // AI 설명: 평형·거래유형이 바뀔 때마다 서버에 요청 (서버가 하루 단위로 캐시, 실패하면 템플릿 설명)
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams({ complexId: String(complexId), pyeongId, tradeType, floor: floorCategory });
    fetch(`/api/analysis/explain?${qs}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Narrative | null) => {
        setNarrative(data && typeof data.body === 'string' ? data : null);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setNarrative(null);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [complexId, pyeongId, tradeType, floorCategory]);

  if (!r) return null;
  const grade = r.grade;
  const listingsTotal = tradeType === '매매' ? datasetStats.saleListings : datasetStats.jeonseListings;

  // 계산 흐름 (v4): 추천 범위 → 이 면적대 매물 소화 속도 → 추천. 기준값·보정 줄은 두지 않는다
  const bandName = c.bandLabels[r.areaBand];
  const bandRange = c.bandRanges[r.areaBand];
  // 계산표 아래 한 줄: 이 평형이 범위 안 어디에 왜 있는지 (단지별로 달라진다)
  const pn = positionNote(r);
  const note =
    pn.key === 'NO_DATA'
      ? SITE_CONTENT.analysis.customizer.defaultReasonText.NO_DATA.replace('{n}', String(r.complexSales12m))
      : c.stepNotes[pn.key].replace('{diff}', String(pn.diffPp));
  const speed =
    r.speedRatio === null
      ? { value: c.stepSpeedUnknown, sub: c.stepSpeedUnknownSub.replace('{n}', String(r.complexSales12m)) }
      : {
          value: c.stepSpeedValue.replace('{ratio}', r.speedRatio.toFixed(1)),
          sub:
            (r.rank
              ? c.stepSpeedSub
                  .replace('{band}', bandName)
                  .replace('{range}', bandRange)
                  .replace('{total}', String(r.rank.total))
                  .replace('{position}', String(r.rank.position))
              : c.stepSpeedSubComplex.replace('{band}', bandName)) + (r.atLimit ? c.stepLimit[r.atLimit] : ''),
        };

  const marker = r.speedRatio === null ? null : toPct(r.speedRatio);
  const slowEdge = toPct(ENGINE_PARAMS.slowRatio);
  const fastEdge = toPct(ENGINE_PARAMS.fastRatio);

  const pct = Math.round(r.discount * 100);
  // 추천(초록) 구간의 다른 끝 = 많은 요청 구간 경계 (feeZone과 같은 값)
  const minPct = Math.round(ENGINE_PARAMS.wideZoneMaxDiscount * 100);
  const headline = narrative?.headline ?? c.headlineFallback.replace('{position}', c.positionLabels[tradeType][grade]).replace('{pct}', String(pct));

  // 범위 막대 (20%~50%) 위 위치: 이 평형 추천과 다산동 평균 단지(30%)
  const P = ENGINE_PARAMS;
  const rangePos = (d: number) => ((d - P.minRecDiscount) / (P.maxRecDiscount - P.minRecDiscount)) * 100;
  const markerPos = Math.min(100, Math.max(0, rangePos(r.discount)));
  const avgPos = rangePos(P.midRecDiscount);
  const tiles = [
    { value: `${r.listings.toLocaleString()}건`, label: c.tileListings },
    { value: `${r.recentDeals.toLocaleString()}건`, label: c.tileDeals },
    { value: r.speedRatio === null ? '—' : `${r.speedRatio.toFixed(1)}배`, label: c.tileSpeed },
  ];

  return (
    // 강조 B안 (대표님 승인 2026-10-24): 연한 파랑 카드 + 큰 숫자 칸 3개 + 범위 막대(C안)
    // 다른 카드와 같은 흰 카드 (파랑 배경·테두리는 토스 톤에서 튐, 대표님 2026-10-24). 강조는 파란 숫자·범위 막대로만
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4" data-testid="reason-card">
      {/* 제목 B안: 회색 라벨 + 결론 문장 (숫자 강조는 칸·막대가 맡는다, 대표님 승인 2026-10-24) */}
      <div className="space-y-1">
        <div className="text-[13px] font-bold text-text-tertiary">{c.titleLabel}</div>
        <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight break-keep" data-testid="reason-title">
          {c.titleConclusion[pn.key].replace('{verb}', c.titleVerb[tradeType])}
        </h2>
      </div>

      {/* ── 접힌 요약: 숫자 칸 3개 · 범위 막대 · 평균 대비 한 줄 ── */}
      <div className="space-y-3" aria-live="polite" data-testid="reason-summary">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="p-3 rounded-xl bg-surface-subtle text-center">
              <div className="text-[17px] font-extrabold text-text-primary tabular-nums">{t.value}</div>
              <div className="text-[12px] font-medium text-text-tertiary mt-1">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1" data-testid="reason-range">
          <div className="relative h-7">
            {/* 이 평형 위치 */}
            {/* 범위 끝(20%·50%)에서는 라벨이 카드 밖으로 나가지 않게 정렬을 바꾼다 */}
            <div
              className={`absolute top-0 text-[12px] font-extrabold text-brand whitespace-nowrap ${markerPos < 10 ? '' : markerPos > 90 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${markerPos}%` }}
            >
              ▼{pct}%
            </div>
            <div className="absolute bottom-0 inset-x-0 h-2 rounded-full bg-border-default" />
            <div className="absolute bottom-0 left-0 h-2 rounded-full bg-brand" style={{ width: `${markerPos}%` }} />
            {/* 다산동 평균 단지 눈금 */}
            <div className="absolute -bottom-0.5 w-0.5 h-3 bg-text-secondary" style={{ left: `${avgPos}%` }} aria-hidden />
          </div>
          <div className="relative h-4 text-[12px] font-medium text-text-tertiary">
            <span className="absolute left-0">{Math.round(P.minRecDiscount * 100)}%</span>
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${avgPos}%` }}>{c.rangeAvgLabel}</span>
            <span className="absolute right-0">{Math.round(P.maxRecDiscount * 100)}%</span>
          </div>
        </div>

        <p className="text-[13px] font-medium text-text-secondary leading-normal break-keep">{note}</p>
      </div>

      <button
        type="button"
        data-testid="reason-expand"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        // 펼치기·접기 같은 모양 (연한 파랑 + 파란 글씨), 반짝이 아이콘 없음 (2026-10-27 대표님)
        className="w-full min-h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1 active:scale-98 transition-all bg-brand-light text-brand-hover"
      >
        {expanded ? c.collapseButton : c.expandButton}
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {expanded && (
      <div className="space-y-4" data-testid="reason-details">
      {/* AI(또는 템플릿) 헤드라인: 제목이 질문형이 되어 펼침 안으로 (출처 표시 겸) */}
      {loading ? (
        <div className="h-5 w-2/3 rounded bg-brand-light animate-pulse" aria-label={c.aiLoading} />
      ) : (
        <div className="space-y-2">
          {/* 출처 표시는 헤드라인 위 한 줄 (뒤에 붙이면 제목 중간에서 줄이 끊긴다) */}
          <span className="inline-flex items-center h-5 px-2 rounded-md bg-brand-light text-[12px] font-bold text-brand-hover">
            {c.title}
          </span>
          <p className="text-[15px] font-extrabold leading-snug tracking-tight text-text-primary break-keep">{headline}</p>
        </div>
      )}
      <p className="text-[13px] leading-relaxed text-text-tertiary break-keep">
        {c.subTitle
          .replace('{complexes}', String(datasetStats.complexes))
          .replace('{trades}', datasetStats.trades.toLocaleString())
          .replace('{listings}', listingsTotal.toLocaleString())}
      </p>

      {/* ── 1. 수요·공급: 이 평형 면적대의 시장 위치 (6개월) ── */}
      <div className="space-y-3">
        <span className="block text-[17px] font-extrabold text-text-primary tracking-tight">{c.positionLabels[tradeType][grade]}</span>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-surface-subtle">
            <div className="text-[12px] font-medium text-text-tertiary">{c.metricListings}</div>
            <div className="text-[17px] font-extrabold text-text-primary tabular-nums mt-1">{r.listings.toLocaleString()}건</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-subtle">
            <div className="text-[12px] font-medium text-text-tertiary">{c.metricDeals}</div>
            <div className="text-[17px] font-extrabold text-text-primary tabular-nums mt-1">{r.recentDeals.toLocaleString()}건</div>
          </div>
        </div>
        <p className="text-[12px] text-text-tertiary -mt-2">{c.metricScope.replace('{band}', bandName).replace('{range}', bandRange)}</p>

        {marker !== null && (
          <div className="space-y-1" aria-hidden>
            <div className="relative h-2 rounded-full bg-border-default">
              {/* 균형 구간 음영 */}
              <div className="absolute inset-y-0 bg-border-default" style={{ left: `${slowEdge}%`, width: `${fastEdge - slowEdge}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-brand border-2 border-surface-card shadow-xs"
                style={{ left: `${marker}%` }}
              />
            </div>
            <div className="flex justify-between text-[12px] font-medium text-text-tertiary">
              <span>{c.spectrumLeft[tradeType]}</span>
              <span>{c.spectrumRight[tradeType]}</span>
            </div>
          </div>
        )}

        <p className="text-[13px] text-text-secondary leading-relaxed break-keep">{c.positionDesc[grade]}</p>
      </div>

      {/* ── 2. 분석 요약 본문 (AI 설명, 실패 시 템플릿). 헤드라인은 위 요약에 ── */}
      {narrative && (
        <div className="p-4 rounded-xl bg-brand-subtle border border-brand-light">
          <p className="text-[13px] text-text-secondary leading-relaxed break-keep">{narrative.body}</p>
        </div>
      )}

      {/* ── 3. 추천 할인 계산 흐름 ── */}
      <div className="pt-3 border-t border-border-light space-y-2">
        <div className="text-[13px] font-extrabold text-text-primary">{c.stepsTitle}</div>
        <ul className="space-y-1 text-[13px]">
          <li className="flex items-center justify-between gap-2">
            <span className="text-text-secondary">{c.stepRange}</span>
            <span className="font-bold text-text-primary tabular-nums">{c.stepRangeValue}</span>
          </li>
          <li className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-secondary whitespace-nowrap">{c.stepSpeed}</span>
              <span className="font-bold text-text-primary tabular-nums text-right">{speed.value}</span>
            </div>
            <div className="text-[12px] text-text-tertiary text-right break-keep">{speed.sub}</div>
          </li>
          <li className="flex items-center justify-between gap-2 pt-2 border-t border-border-light">
            <span className="font-extrabold text-text-primary">{c.stepResult}</span>
            <span className="text-[15px] font-extrabold text-brand tabular-nums" data-testid="reason-result">
              {pct > minPct ? c.stepResultRange.replace('{min}', String(minPct)).replace('{max}', String(pct)) : `${pct}%`}
            </span>
          </li>
        </ul>
      </div>

      <p className="text-[12px] text-text-tertiary leading-normal break-keep">
        {c.basisNote.replace('{start}', shortDate(r.windowStart)).replace('{end}', shortDate(r.windowEnd)).replace('{observedAt}', shortDate(observedAt))}
        {c.basisNoteAi}
      </p>
      </div>
      )}
    </section>
  );
}
