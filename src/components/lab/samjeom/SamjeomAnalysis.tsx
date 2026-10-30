'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatWon } from '@/lib/utils';
import type { ComplexInfo } from '@/lib/market/repository';
import type { ApartmentStat } from '@/types';
import type { FloorCategory, PyeongDetailStat, RecommendationView, ReferencePrice, TradeType } from '@/components/analysis/types';
import { Answer, Ask } from './SamjeomUi';
import { ComplexBlock, ConditionSheet, FeeHero, MineCard, WhyCompare, shortApt } from './SamjeomAnalysisParts';

const t = LAB_CONTENT.samjeom.analysis;

export interface SamjeomAnalysisProps {
  apartment: ApartmentStat;
  complexInfo: ComplexInfo | null;
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
  /** 원래 카드: 추천 이유(계산·AI 설명) · 실거래 그래프 · 투표 */
  sections: { chart: React.ReactNode; reason: React.ReactNode; poll: React.ReactNode };
}

function useVisible(selector: string, initial: boolean) {
  const [visible, setVisible] = useState(initial);
  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [selector]);
  return visible;
}

/**
 * design-lab 삼쩜삼 분석 2차 (2026-10-30 대표님이 짚은 이용자 순서 그대로, 위→아래 한 줄):
 * ① 단지 정보(이름·세대·준공·사실 칩·계산 조건) → ② 얼마(금액 40px + 법정 상한 막대) → ③ 왜(말풍선 → 소화 속도 막대 + 계산·AI)
 * → ④ "우리 집도 이 금액?"(말풍선 → 실거래 한 건 기준이라는 사실 + 실제 거래·매물 그래프) → ⑤ 우리 집 기준 계산(매칭 요청 창: 희망가→복비→동·호수→확인)
 * → 투표 → 중개사 링크. 바닥 바 버튼은 ⑤와 같은 이름(행동 하나에 이름 하나), ⑤가 보이면 내려간다. 계산은 AnalysisClient 그대로
 */
export default function SamjeomAnalysis(p: SamjeomAnalysisProps) {
  const [conditionOpen, setConditionOpen] = useState(false);
  const amountVisible = useVisible('[data-samjeom-amount]', true);
  const mineVisible = useVisible('[data-testid="samjeom-mine"]', false);
  const r = p.recommendation;
  const name = shortApt(p.apartment.apt_name);
  const openCondition = () => setConditionOpen(true);

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-32">
      <header className="sticky top-0 z-30 h-14 px-2 bg-surface-card flex items-center justify-between">
        <button type="button" onClick={p.onBack} aria-label="뒤로가기" className="w-11 h-11 flex items-center justify-center text-text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {/* 금액이 화면 밖으로 나가면 머리줄 가운데에 단지 이름 (지금 어디인지) */}
        <span className={`min-w-0 truncate text-[15px] font-bold text-text-primary transition-opacity duration-base ${amountVisible ? 'opacity-0' : 'opacity-100'}`}>
          {name}
        </span>
        <button type="button" onClick={p.onShare} className="h-11 px-2 flex items-center">
          <span className="h-8 px-3 rounded-lg border border-border-default bg-surface-card text-[12px] font-medium text-text-secondary flex items-center">{t.share}</span>
        </button>
      </header>

      <ComplexBlock
        apartment={p.apartment}
        complexInfo={p.complexInfo}
        selectedPyeong={p.selectedPyeong}
        floorCategory={p.floorCategory}
        tradeType={p.tradeType}
        onOpenCondition={openCondition}
      />
      <FeeHero totalWon={p.totalCommissionWon} legalMaxWon={p.legalMaxWon} reference={p.reference} />

      <div className="px-4">
        <Ask>{t.askWhy}</Ask>
        <Answer flush testId="samjeom-why">
          {r && <WhyCompare recommendation={r} tradeType={p.tradeType} complexName={name} />}
          {/* 원래 추천 이유 카드: 제목·숫자 칸은 위와 같은 사실이라 숨기고 범위 막대 + AI 설명만 (globals.css .lab-flat) */}
          <div className="lab-flat px-5 pt-2 pb-6">{p.sections.reason}</div>
        </Answer>

        <Ask>{t.askMine}</Ask>
        <Answer lead={t.mineAnswer} testId="samjeom-estimate">
          <p className="mt-2 text-[15px] text-text-secondary leading-relaxed">{t.mineBody}</p>
          <div className="lab-flat mt-6">{p.sections.chart}</div>
        </Answer>

        <MineCard onStart={p.onOpenModal} />

        <Ask>{t.askPoll}</Ask>
        <Answer flush>
          <div className="lab-flat px-5 py-6">{p.sections.poll}</div>
        </Answer>

        <Link href="/#broker" className="mt-8 h-14 px-5 rounded-2xl bg-surface-card flex items-center justify-between text-[15px] font-bold text-text-secondary">
          {t.brokerLink}
          <ChevronRight className="w-5 h-5 text-text-tertiary" aria-hidden />
        </Link>
      </div>

      <ConditionSheet
        open={conditionOpen}
        onClose={() => setConditionOpen(false)}
        pyeongList={p.pyeongList}
        selectedPyeong={p.selectedPyeong}
        onSelectPyeong={p.onSelectPyeong}
        tradeType={p.tradeType}
        onChangeTradeType={p.onChangeTradeType}
        floorCategory={p.floorCategory}
        onSelectFloor={p.onSelectFloor}
      />

      {/* 바닥 바: 안심 줄 + (금액이 화면 밖이면 금액) + ⑤와 같은 버튼. ⑤가 보이면 내려가 같은 버튼이 겹치지 않게 */}
      <div
        aria-hidden={mineVisible}
        className={`fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light transition-transform duration-base ${
          mineVisible ? 'translate-y-full' : ''
        }`}
      >
        <p className="h-8 flex items-center justify-center gap-1 bg-brand-light text-[12px] font-bold text-brand-hover">
          <ShieldCheck className="w-4 h-4" aria-hidden />
          {SITE_CONTENT.analysis.stickyBar.securityGuarantee}
        </p>
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          {!amountVisible && (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-text-tertiary truncate">{t.fairLabel}</p>
              <p className="text-[17px] font-bold text-text-primary tabular-nums truncate">{formatWon(p.totalCommissionWon)}</p>
            </div>
          )}
          <button
            type="button"
            data-testid="matching-sticky-cta"
            tabIndex={mineVisible ? -1 : 0}
            onClick={p.onOpenModal}
            className={`h-13 px-5 rounded-xl bg-brand text-text-inverse text-[15px] font-bold ${amountVisible ? 'flex-1' : 'flex-shrink-0'}`}
          >
            {t.mineCta}
          </button>
        </div>
      </div>
    </div>
  );
}
