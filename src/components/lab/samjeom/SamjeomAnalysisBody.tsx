'use client';

import React, { useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import TradeTypeToggle from '@/components/analysis/TradeTypeToggle';
import FloorSelectorChips from '@/components/analysis/FloorSelectorChips';
import KeepFeeReportHero from '@/components/lab/keeps/KeepFeeReportHero';
import KeepSpeedCompare from '@/components/lab/keeps/KeepSpeedCompare';
import type { ApartmentStat } from '@/types';
import type {
  FloorCategory,
  PyeongDetailStat,
  RecommendationView,
  ReferencePrice,
  TradeType,
} from '@/components/analysis/types';

const t = LAB_CONTENT.samjeom.analysis;

interface SamjeomAnalysisBodyProps {
  apartment: ApartmentStat;
  pyeongList: PyeongDetailStat[];
  selectedPyeong: PyeongDetailStat;
  onSelectPyeong: (id: string) => void;
  tradeType: TradeType;
  onChangeTradeType: (t: TradeType) => void;
  floorCategory: FloorCategory;
  onSelectFloor: (c: FloorCategory) => void;
  reference: ReferencePrice | null;
  recommendation: RecommendationView | null;
  totalCommissionWon: number;
  legalMaxWon: number;
  onBack: () => void;
  onShare: () => void;
  onOpenModal: () => void;
  /** 실거래 그래프·추천 이유·투표 (원래 카드 그대로, 회색 띠로 나눈 납작한 구획) */
  sections: React.ReactNode;
}

/**
 * design-lab 삼쩜삼 분석 = 리포트 구성 (레퍼런스: 삼쩜삼 2024 종합소득세 리포트).
 * 킵 K1 머리 띠·근거 목록 → 킵 K2 막대 비교 → 조건 바꾸기 → 원래 근거 카드들 → 바닥 두 버튼(조건 바꾸기 | 매칭 요청).
 * 계산은 AnalysisClient 그대로, 이 파일은 배치만
 */
export default function SamjeomAnalysisBody(p: SamjeomAnalysisBodyProps) {
  const conditionRef = useRef<HTMLElement>(null);
  const r = p.recommendation;
  const shortName = p.apartment.apt_name.replace(/\s*\([^)]*\)$/, '');
  const pyeongShort = p.selectedPyeong.name.replace(/\s*\(.*\)$/, '');
  const band = SITE_CONTENT.analysis.floorSelector.bands[p.floorCategory].label;

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-24">
      <KeepFeeReportHero
        top={
          <div className="h-14 -mx-2 flex items-center justify-between">
            <button type="button" onClick={p.onBack} aria-label="뒤로가기" className="w-11 h-11 flex items-center justify-center text-text-primary">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={p.onShare}
              className="h-8 px-3 mr-2 rounded-lg border border-border-default bg-surface-card text-[12px] font-medium text-text-secondary"
            >
              {t.share}
            </button>
          </div>
        }
        contextLine={`${shortName} · ${pyeongShort} · ${band}`}
        totalWon={p.totalCommissionWon}
        legalMaxWon={p.legalMaxWon}
        reference={p.reference}
        discountPct={r ? Math.round(r.discount * 100) : null}
        tradeType={p.tradeType}
      />

      {r && (
        <div className="mt-2">
          <KeepSpeedCompare recommendation={r} tradeType={p.tradeType} complexName={shortName} />
        </div>
      )}

      {/* ── 조건 바꾸기 ── */}
      <section ref={conditionRef} className="mt-2 bg-surface-card px-5 pt-8 pb-8 space-y-4 scroll-mt-4" data-testid="pyeong-floor-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[20px] font-bold text-text-primary">{t.conditionTitle}</h2>
          <TradeTypeToggle tradeType={p.tradeType} onChangeTradeType={p.onChangeTradeType} />
        </div>
        <div role="radiogroup" aria-label={t.pyeongLabel} className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {p.pyeongList.map((py) => {
            const on = py.id === p.selectedPyeong.id;
            return (
              <button
                key={py.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => p.onSelectPyeong(py.id)}
                className={`h-11 px-4 flex-shrink-0 rounded-xl border text-[15px] whitespace-nowrap ${
                  on ? 'bg-brand-light border-brand text-brand-hover font-bold' : 'bg-surface-card border-border-default text-text-secondary'
                }`}
              >
                {py.name.replace(/\s*\(.*\)$/, '')}
              </button>
            );
          })}
        </div>
        <FloorSelectorChips floorCategory={p.floorCategory} pyeong={p.selectedPyeong} tradeType={p.tradeType} onSelectFloor={p.onSelectFloor} />
      </section>

      {/* ── 원래 근거 카드들: 회색 띠로 나눈 납작한 흰 구획 ── */}
      <div className="lab-flat mt-2 flex flex-col gap-2">{p.sections}</div>

      {/* ── 바닥 두 버튼 (삼쩜삼 "이전 | 다음") ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card">
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] grid grid-cols-[2fr_3fr] gap-2">
          <button
            type="button"
            onClick={() => conditionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="h-13 rounded-xl border border-border-default bg-surface-card text-[15px] font-bold text-text-secondary"
          >
            {t.conditionTitle}
          </button>
          <button
            type="button"
            data-testid="matching-sticky-cta"
            onClick={p.onOpenModal}
            className="h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
          >
            {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
          </button>
        </div>
      </div>
    </div>
  );
}
