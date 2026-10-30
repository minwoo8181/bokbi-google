'use client';

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatWon } from '@/lib/utils';
import TradeTypeToggle from '@/components/analysis/TradeTypeToggle';
import FloorSelectorChips from '@/components/analysis/FloorSelectorChips';
import ActionSheet from '@/components/my-requests/ActionSheet';
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
const short = (name: string) => name.replace(/\s*\(.*\)$/, '');

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
 * design-lab 삼쩜삼 분석 = 리포트 구성 (레퍼런스: 삼쩜삼 2024 종합소득세 리포트), 2026-10-30 CTA 재배치.
 * 이용자 순서 = ① 금액 ② 내 평형·층 맞나 ③ 왜 ④ 요청:
 * 킵 K1 머리 띠(조건 칩을 금액 바로 위에 → 누르면 "내 집 조건" 시트) → 킵 K2 왜 → 실거래 → AI 설명 → 투표.
 * 바닥 바는 주 버튼 하나(안심 한 줄 + 금액 + 매칭 요청). 계산은 AnalysisClient 그대로, 이 파일은 배치만
 */
export default function SamjeomAnalysisBody(p: SamjeomAnalysisBodyProps) {
  const [conditionOpen, setConditionOpen] = useState(false);
  const r = p.recommendation;
  const shortName = p.apartment.apt_name.replace(/\s*\([^)]*\)$/, '');
  const band = SITE_CONTENT.analysis.floorSelector.bands[p.floorCategory].label;
  const chips = [
    { key: 'pyeong', value: short(p.selectedPyeong.name) },
    { key: 'floor', value: band },
    { key: 'trade', value: p.tradeType },
  ];

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-32">
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
        contextLine={
          <>
            <p className="text-[15px] font-medium text-text-secondary truncate">{shortName}</p>
            {/* 조건 칩: 금액이 어떤 집 기준인지 바로 위에서 보이고 바로 바꾼다 */}
            <div className="mt-2 flex flex-wrap gap-2" data-testid="samjeom-condition-chips">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setConditionOpen(true)}
                  aria-label={t.conditionOpen.replace('{value}', c.value)}
                  className="h-11 pl-4 pr-3 rounded-full bg-surface-card border border-border-default text-[13px] font-bold text-text-primary inline-flex items-center gap-1"
                >
                  {c.value}
                  <ChevronDown className="w-4 h-4 text-text-tertiary" aria-hidden />
                </button>
              ))}
            </div>
          </>
        }
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

      {/* 근거 카드들: 실거래 → AI 설명 → 투표 (회색 띠로 나눈 납작한 흰 구획) */}
      <div className="lab-flat mt-2 flex flex-col gap-2">{p.sections}</div>

      {/* 내 집 조건 시트: 거래 · 평형 · 층 (바꾸면 위 금액이 바로 바뀐다) */}
      <ActionSheet
        open={conditionOpen}
        title={t.conditionTitle}
        cancelLabel={SITE_CONTENT.common.close}
        confirmLabel={t.conditionDone}
        onConfirm={() => setConditionOpen(false)}
        onCancel={() => setConditionOpen(false)}
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
                    {short(py.name)}
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

      {/* ── 바닥 바: 안심 한 줄 + 금액 + 주 버튼 하나 ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light">
        <p className="h-8 flex items-center justify-center gap-1 bg-brand-light text-[12px] font-bold text-brand-hover">
          <ShieldCheck className="w-4 h-4" aria-hidden />
          {SITE_CONTENT.analysis.stickyBar.securityGuarantee}
        </p>
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-text-tertiary truncate">
              {t.barFee} · {t.barLegal.replace('{amount}', formatWon(p.legalMaxWon))}
            </p>
            <p className="text-[17px] font-bold text-text-primary tabular-nums truncate">{formatWon(p.totalCommissionWon)}</p>
          </div>
          <button
            type="button"
            data-testid="matching-sticky-cta"
            onClick={p.onOpenModal}
            className="h-13 px-5 flex-shrink-0 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
          >
            {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
          </button>
        </div>
      </div>
    </div>
  );
}
