'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { positionNote } from '@/lib/analysis/explain';
import { fill } from '@/components/my-requests/format';
import TradeTypeToggle from '@/components/analysis/TradeTypeToggle';
import FloorSelectorChips from '@/components/analysis/FloorSelectorChips';
import ActionSheet from '@/components/my-requests/ActionSheet';
import type { ComplexInfo } from '@/lib/market/repository';
import type { ApartmentStat } from '@/types';
import type { FloorCategory, PyeongDetailStat, RecommendationView, ReferencePrice, TradeType } from '@/components/analysis/types';
import { FactRows, StepBar } from './SamjeomUi';

const t = LAB_CONTENT.samjeom.analysis;
export const shortPyeong = (name: string) => name.replace(/\s*\(.*\)$/, '');
export const shortApt = (name: string) => name.replace(/\s*\([^)]*\)$/, '');

/** ① 단지 정보: 이름 → 동네·세대·준공 → 사실 칩 → 진행 막대 → 계산 조건 칩 (대표님 2026-10-30 "최상단 아파트 정보 부족") */
export function ComplexBlock({
  apartment,
  complexInfo,
  selectedPyeong,
  floorCategory,
  tradeType,
  onOpenCondition,
}: {
  apartment: ApartmentStat;
  complexInfo: ComplexInfo | null;
  selectedPyeong: PyeongDetailStat;
  floorCategory: FloorCategory;
  tradeType: TradeType;
  onOpenCondition: () => void;
}) {
  const listings = tradeType === '매매' ? apartment.current_sale_listings : apartment.current_jeonse_listings;
  const facts = [
    listings > 0 ? fill(t.factListings, { n: listings.toLocaleString('ko-KR') }) : null,
    complexInfo?.elementarySchool && complexInfo.elementarySchoolWalkMin !== null
      ? fill(t.factSchool, { name: complexInfo.elementarySchool, min: complexInfo.elementarySchoolWalkMin })
      : null,
    complexInfo?.parkingPerHousehold ? fill(t.factParking, { n: complexInfo.parkingPerHousehold.toFixed(1) }) : null,
  ].filter((f): f is string => Boolean(f));
  const chips = [
    { key: 'pyeong', value: shortPyeong(selectedPyeong.name) },
    { key: 'floor', value: SITE_CONTENT.analysis.floorSelector.bands[floorCategory].label },
    { key: 'trade', value: tradeType },
  ];
  return (
    <section className="bg-surface-card px-5 pt-2 pb-6" data-testid="samjeom-complex">
      <h1 className="text-[20px] font-bold text-text-primary leading-snug">{shortApt(apartment.apt_name)}</h1>
      <p className="mt-1 text-[13px] text-text-tertiary">
        {fill(t.meta, { dong: apartment.dong_name, households: apartment.total_households.toLocaleString('ko-KR') })}
        {apartment.built_year ? fill(t.built, { year: apartment.built_year }) : ''}
      </p>
      {facts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {facts.map((f) => (
            <li key={f} className="h-8 px-3 rounded-lg bg-surface-subtle flex items-center text-[13px] font-medium text-text-secondary">
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <StepBar current={1} />
      </div>
      {/* 계산 조건: 금액이 어떤 집 기준인지 바로 아래 금액과 붙여 보이고, 누르면 시트에서 바꾼다 */}
      <div className="mt-5 flex flex-wrap gap-2" data-testid="samjeom-condition-chips">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={onOpenCondition}
            aria-label={fill(t.conditionOpen, { value: c.value })}
            className="h-11 pl-4 pr-3 rounded-full bg-surface-card border border-border-default text-[13px] font-bold text-text-primary inline-flex items-center gap-1"
          >
            {c.value}
            <ChevronDown className="w-4 h-4 text-text-tertiary" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}

/** ② 얼마: 연파랑 띠 두 줄(금액 40px) → 기준 실거래 → 법정 상한 vs 적정 복비 가로 막대 둘 → 차이 한 줄 */
export function FeeHero({ totalWon, legalMaxWon, reference: ref }: { totalWon: number; legalMaxWon: number; reference: ReferencePrice | null }) {
  const when = ref?.date ? fill(t.when, { date: ref.date, floor: ref.floor ? fill(t.floorSuffix, { n: ref.floor }) : '' }) : '';
  const diff = Math.max(0, legalMaxWon - totalWon);
  const fairPct = legalMaxWon > 0 ? Math.max(4, Math.round((totalWon / legalMaxWon) * 100)) : 100;
  return (
    <section className="bg-brand-light px-5 pt-8 pb-8" data-testid="samjeom-hero">
      <h2 className="text-[26px] font-bold text-text-primary leading-[1.35]">
        {t.heroLead}
        <br />
        <span data-samjeom-amount className="text-[40px] leading-[1.2] text-brand tabular-nums">
          {formatWon(totalWon)}
        </span>
        {t.heroTail}
      </h2>
      {ref && (
        <p className="mt-3 text-[13px] text-text-tertiary">{fill(t.heroBasis, { deal: formatPriceTenThousand(ref.priceManwon), when })}</p>
      )}
      <div className="mt-6 space-y-3" role="img" aria-label={`${t.capLabel} ${formatWon(legalMaxWon)}, ${t.fairLabel} ${formatWon(totalWon)}`}>
        {[
          { label: t.capLabel, won: legalMaxWon, w: 100, bar: 'bg-border-default', text: 'text-text-secondary' },
          { label: t.fairLabel, won: totalWon, w: fairPct, bar: 'bg-brand', text: 'text-brand-hover' },
        ].map((b) => (
          <div key={b.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-text-secondary">{b.label}</span>
              <span className={`text-[15px] font-bold tabular-nums ${b.text}`}>{formatWon(b.won)}</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-surface-card overflow-hidden">
              <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${b.w}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[15px] font-bold text-brand-hover">{diff > 0 ? fill(t.capDiff, { amount: formatWon(diff) }) : t.capSame}</p>
    </section>
  );
}

const BAR_MAX = 112;
/** ③ 왜: 결론 → 소화 속도 한 줄 → 막대 둘(다산동 평균 1배 vs 이 단지 n배) → 시장 설명 → 지금 매물·6개월 거래 */
export function WhyCompare({ recommendation: r, tradeType, complexName }: { recommendation: RecommendationView; tradeType: TradeType; complexName: string }) {
  const rr = SITE_CONTENT.analysis.recommendationReason;
  const conclusion = rr.titleConclusion[positionNote(r).key].replace('{verb}', rr.titleVerb[tradeType]);
  const ratio = r.speedRatio;
  const top = ratio !== null ? Math.max(1, ratio) : 1;
  return (
    <div className="px-5 pt-6 pb-2">
      <h3 className="text-[20px] font-bold text-text-primary leading-snug break-keep">{conclusion}</h3>
      {ratio !== null && (
        <>
          <p className="mt-2 text-[15px] text-text-secondary">
            {rr.stepSpeed} <span className="font-bold text-brand-hover">{rr.stepSpeedValue.replace('{ratio}', ratio.toFixed(1))}</span>
          </p>
          <div className="mt-6 flex items-end justify-center gap-10" role="img" aria-label={`${t.compareAvg} 1배, ${complexName} ${ratio.toFixed(1)}배`}>
            {[
              { label: t.compareAvg, v: 1, bar: 'bg-[var(--lab-compare)]', text: 'text-text-secondary' },
              { label: complexName, v: ratio, bar: 'bg-brand', text: 'text-brand-hover' },
            ].map((b) => (
              <div key={b.label} className="w-24 flex flex-col items-center">
                <span className={`text-[15px] font-bold tabular-nums ${b.text}`}>{fill(t.compareUnit, { n: b.v.toFixed(1) })}</span>
                <div className={`mt-2 w-16 rounded-lg ${b.bar}`} style={{ height: Math.max(8, Math.round((b.v / top) * BAR_MAX)) }} />
                <span className="mt-2 text-[13px] text-text-tertiary text-center leading-tight line-clamp-2">{b.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <p className="mt-6 text-[15px] text-text-secondary leading-relaxed">{rr.positionDesc[r.grade]}</p>
      <FactRows
        rows={[
          { label: t.listings, value: fill(t.countUnit, { n: r.listings.toLocaleString('ko-KR') }) },
          { label: t.deals, value: fill(t.countUnit, { n: r.recentDeals.toLocaleString('ko-KR') }) },
        ]}
      />
    </div>
  );
}

/** ⑤ 우리 집 기준: 제목 두 줄 → 이어질 단계 3줄 → 주 버튼 → 다음에 무슨 일이 있는지 한 줄 */
export function MineCard({ onStart }: { onStart: () => void }) {
  return (
    <section className="mt-10 rounded-2xl bg-surface-card border-2 border-brand px-5 pt-6 pb-5" data-testid="samjeom-mine">
      <h2 className="text-[20px] font-bold text-text-primary leading-snug whitespace-pre-line">{t.mineTitle}</h2>
      <FactRows rows={t.mineSteps} />
      <button
        type="button"
        onClick={onStart}
        data-testid="samjeom-mine-cta"
        className="mt-5 w-full h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold"
      >
        {t.mineCta}
      </button>
      <p className="mt-3 text-center text-[12px] text-text-tertiary">{t.mineNote}</p>
    </section>
  );
}

/** 계산 조건 시트: 거래 · 평형 · 층 (바꾸면 위 금액이 바로 바뀐다) */
export function ConditionSheet(p: {
  open: boolean;
  onClose: () => void;
  pyeongList: PyeongDetailStat[];
  selectedPyeong: PyeongDetailStat;
  onSelectPyeong: (id: string) => void;
  tradeType: TradeType;
  onChangeTradeType: (t: TradeType) => void;
  floorCategory: FloorCategory;
  onSelectFloor: (c: FloorCategory) => void;
}) {
  return (
    <ActionSheet
      open={p.open}
      title={t.conditionTitle}
      cancelLabel={SITE_CONTENT.common.close}
      confirmLabel={t.conditionDone}
      onConfirm={p.onClose}
      onCancel={p.onClose}
      testId="samjeom-condition-sheet"
    >
      <div className="space-y-5" data-testid="pyeong-floor-card">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-text-primary">{t.tradeLabel}</span>
          <TradeTypeToggle tradeType={p.tradeType} onChangeTradeType={p.onChangeTradeType} />
        </div>
        <div>
          <p className="text-[15px] font-bold text-text-primary">{t.pyeongLabel}</p>
          <div role="radiogroup" aria-label={t.pyeongLabel} className="mt-2 grid grid-cols-4 gap-2">
            {p.pyeongList.map((py) => {
              const on = py.id === p.selectedPyeong.id;
              return (
                <button
                  key={py.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => p.onSelectPyeong(py.id)}
                  className={`h-11 rounded-xl border text-[15px] ${
                    on ? 'bg-brand-light border-brand text-brand-hover font-bold' : 'bg-surface-card border-border-default text-text-secondary'
                  }`}
                >
                  {shortPyeong(py.name)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[15px] font-bold text-text-primary">{t.floorLabel}</p>
          <div className="mt-2">
            <FloorSelectorChips floorCategory={p.floorCategory} pyeong={p.selectedPyeong} tradeType={p.tradeType} onSelectFloor={p.onSelectFloor} />
          </div>
        </div>
      </div>
    </ActionSheet>
  );
}
