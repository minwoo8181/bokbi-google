'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatWon } from '@/lib/utils';
import LabConditionSheet from '@/components/lab/LabConditionSheet';
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
  /** 원래 카드들: 실거래 그래프 · 추천 이유(계산·AI 설명) · 투표 */
  sections: { chart: React.ReactNode; reason: React.ReactNode; poll: React.ReactNode };
}

/**
 * design-lab 삼쩜삼 분석 = 리포트 구성 (레퍼런스: 삼쩜삼 2024 종합소득세 리포트), 2026-10-30 CTA 재배치.
 * 이용자 순서 = ① 금액 ② 내 평형·층 맞나 ③ 왜 ④ 요청:
 * 킵 K1 머리 띠(조건 칩을 금액 바로 위에 → 누르면 "내 집 조건" 시트) → 킵 K2 왜 → 추천 할인 계산(AI 설명 펼치기) → 실거래 → 투표.
 * 추천 이유 카드의 제목·숫자 칸은 K2와 같은 사실이라 globals.css에서 숨긴다 (2026-10-30 스킬 점검).
 * 바닥 바는 주 버튼 하나(안심 한 줄 + 금액 + 매칭 요청). 계산은 AnalysisClient 그대로, 이 파일은 배치만
 */
export default function SamjeomAnalysisBody(p: SamjeomAnalysisBodyProps) {
  const [conditionOpen, setConditionOpen] = useState(false);
  // 바닥 바 금액은 머리 띠 금액이 화면 밖으로 나간 뒤에만 (스킬 점검: 같은 숫자가 한 화면에 두 번 보이지 않게)
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const h1 = document.querySelector('[data-keep="K1"] h1');
    if (!h1 || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting));
    io.observe(h1);
    return () => io.disconnect();
  }, []);
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
            {/* 보이는 알약은 32px, 누르는 영역은 44px */}
            <button type="button" onClick={p.onShare} className="h-11 px-2 flex items-center">
              <span className="h-8 px-3 rounded-lg border border-border-default bg-surface-card text-[12px] font-medium text-text-secondary flex items-center">
                {t.share}
              </span>
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

      {/* 추천 할인 계산: K2(왜) 바로 다음 — 범위 막대 + AI 설명 펼치기 */}
      <section className="lab-reason mt-2 bg-surface-card px-5 pt-8 pb-8">
        <h2 className="mb-4 text-[20px] font-bold text-text-primary">{SITE_CONTENT.analysis.recommendationReason.stepsTitle}</h2>
        {p.sections.reason}
      </section>

      {/* 근거 카드들: 실거래 → 투표 (회색 띠로 나눈 납작한 흰 구획) */}
      <div className="lab-flat mt-2 flex flex-col gap-2">
        {p.sections.chart}
        {p.sections.poll}
      </div>

      {/* 내 집 조건 시트: 거래 · 평형 · 층 (바꾸면 위 금액이 바로 바뀐다) */}
      <LabConditionSheet
        open={conditionOpen}
        onClose={() => setConditionOpen(false)}
        testId="samjeom-condition-sheet"
        pyeongList={p.pyeongList}
        selectedPyeong={p.selectedPyeong}
        onSelectPyeong={p.onSelectPyeong}
        tradeType={p.tradeType}
        onChangeTradeType={p.onChangeTradeType}
        floorCategory={p.floorCategory}
        onSelectFloor={p.onSelectFloor}
      />

      {/* ── 바닥 바: 안심 한 줄 + 금액 + 주 버튼 하나 ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light">
        <p className="h-8 flex items-center justify-center gap-1 bg-brand-light text-[12px] font-bold text-brand-hover">
          <ShieldCheck className="w-4 h-4" aria-hidden />
          {SITE_CONTENT.analysis.stickyBar.securityGuarantee}
        </p>
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          {!heroVisible && (
            <div className="min-w-0 flex-1" data-testid="samjeom-bar-amount">
              <p className="text-[12px] text-text-tertiary truncate">
                {t.barFee} · {t.barLegal.replace('{amount}', formatWon(p.legalMaxWon))}
              </p>
              <p className="text-[17px] font-bold text-text-primary tabular-nums truncate">{formatWon(p.totalCommissionWon)}</p>
            </div>
          )}
          <button
            type="button"
            data-testid="matching-sticky-cta"
            onClick={p.onOpenModal}
            className={`h-13 px-5 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast ${
              heroVisible ? 'flex-1' : 'flex-shrink-0'
            }`}
          >
            {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
          </button>
        </div>
      </div>
    </div>
  );
}
