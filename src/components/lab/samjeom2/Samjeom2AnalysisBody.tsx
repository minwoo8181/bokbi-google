'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatWon } from '@/lib/utils';
import LabConditionSheet from '@/components/lab/LabConditionSheet';
import KeepSpeedCompare from '@/components/lab/keeps/KeepSpeedCompare';
import SamjeomReportHero from '@/components/lab/samjeom/SamjeomReportHero';
import type { ApartmentStat } from '@/types';
import type { FloorCategory, PyeongDetailStat, RecommendationView, ReferencePrice, TradeType } from '@/components/analysis/types';
import { Answer, Ask, FactRows } from './Report';

const t = LAB_CONTENT.samjeom2.analysis;
const home = LAB_CONTENT.samjeom2.home;
const sj = LAB_CONTENT.samjeom.analysis;

interface Samjeom2AnalysisBodyProps {
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
  sections: { chart: React.ReactNode; reason: React.ReactNode; poll: React.ReactNode };
}

/** 보이는지 지켜보기 (바닥 바를 숨기거나 금액을 띄울 때) */
function useVisible(selector: string) {
  const [visible, setVisible] = useState(true);
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
 * design-lab 삼쩜삼 심화 분석 = 복비 상담 리포트 (레퍼런스: 삼쩜삼 종합소득세 결과 "왜 납부인가요?" 흐름).
 * 시선·이동: 킵 K1 금액(답) → 집주인 의문을 묻는 순서대로 말풍선 → 답 카드
 *   ① 왜 이 금액? (K2) ② 할인율은? (계산·AI 설명) ③ 실제 거래는? (실거래) ④ 중개사가 받아 줄까? ⑤ 내 정보는?
 * → 의문을 다 푼 자리에 요약 카드(삼쩜삼 "예상 환급내역" 파랑 칸) + 매칭 요청 → 투표 → 중개사 링크.
 * 바닥 바는 언제든 누를 수 있는 탈출구, 요약 카드가 보이면 숨긴다(같은 버튼 두 개 금지). 계산은 AnalysisClient 그대로
 */
export default function Samjeom2AnalysisBody(p: Samjeom2AnalysisBodyProps) {
  const [conditionOpen, setConditionOpen] = useState(false);
  const heroVisible = useVisible('[data-keep="K1"] h1');
  const summaryVisible = useVisible('[data-testid="samjeom2-summary"]');
  const r = p.recommendation;
  const shortName = p.apartment.apt_name.replace(/\s*\([^)]*\)$/, '');
  const band = SITE_CONTENT.analysis.floorSelector.bands[p.floorCategory].label;
  const cond = `${p.selectedPyeong.name.replace(/\s*\(.*\)$/, '')} · ${band} · ${p.tradeType}`;
  const qaBroker = home.qa[0].rows;
  const qaPrivacy = home.qa[1].rows;

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-32">
      <SamjeomReportHero
        aptName={p.apartment.apt_name}
        selectedPyeong={p.selectedPyeong}
        floorCategory={p.floorCategory}
        tradeType={p.tradeType}
        reference={p.reference}
        recommendation={r}
        totalCommissionWon={p.totalCommissionWon}
        legalMaxWon={p.legalMaxWon}
        onBack={p.onBack}
        onShare={p.onShare}
        onOpenCondition={() => setConditionOpen(true)}
      />

      <div className="px-4">
        {r && (
          <>
            <Ask>{t.askWhy}</Ask>
            <Answer flush>
              <KeepSpeedCompare recommendation={r} tradeType={p.tradeType} complexName={shortName} />
            </Answer>
          </>
        )}

        <Ask>{t.askHow}</Ask>
        <Answer>
          <div className="lab-reason">{p.sections.reason}</div>
        </Answer>

        <Ask>{t.askDeal}</Ask>
        <Answer flush>
          <div className="lab-flat">{p.sections.chart}</div>
        </Answer>

        <Ask>{t.askBroker}</Ask>
        <Answer lead={t.brokerAnswer} testId="samjeom2-broker-answer">
          <FactRows rows={qaBroker} />
        </Answer>

        <Ask>{t.askPrivacy}</Ask>
        <Answer lead={t.privacyAnswer}>
          <FactRows rows={qaPrivacy} strong />
        </Answer>

        {/* 의문을 다 푼 자리: 요약 + 행동 */}
        <section className="mt-10 rounded-2xl bg-surface-card overflow-hidden" data-testid="samjeom2-summary">
          <div className="bg-brand px-5 py-5 text-text-inverse">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[17px] font-bold">{t.summaryLabel}</span>
              <span className="text-[26px] font-bold tabular-nums">{formatWon(p.totalCommissionWon)}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed">{t.summaryNote}</p>
          </div>
          <div className="px-5 pb-5">
            <FactRows
              rows={[
                { label: t.summaryRows.apt, value: shortName },
                { label: t.summaryRows.cond, value: cond },
                { label: t.summaryRows.legal, value: formatWon(p.legalMaxWon) },
              ]}
            />
            <button
              type="button"
              onClick={p.onOpenModal}
              data-testid="samjeom2-summary-cta"
              className="mt-4 w-full h-13 rounded-xl bg-brand text-text-inverse text-[15px] font-bold"
            >
              {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
            </button>
            <button
              type="button"
              onClick={() => setConditionOpen(true)}
              className="mt-1 w-full h-11 text-[13px] font-bold text-text-secondary underline underline-offset-4"
            >
              {t.summaryChange}
            </button>
          </div>
        </section>

        <Ask>{t.askPoll}</Ask>
        <Answer flush>
          <div className="lab-flat">{p.sections.poll}</div>
        </Answer>

        {/* 중개사가 이 화면을 공유받아 들어왔을 때의 입구 (조용한 줄) */}
        <Link
          href="/agent/register"
          className="mt-8 h-14 px-5 rounded-2xl bg-surface-card flex items-center justify-between text-[15px] font-bold text-text-secondary"
        >
          {t.brokerLink}
          <ChevronRight className="w-5 h-5 text-text-disabled" aria-hidden />
        </Link>
      </div>

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

      {/* 바닥 바: 요약 카드가 보이면 숨김 */}
      <div
        aria-hidden={summaryVisible}
        className={`fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light transition-transform duration-base ${
          summaryVisible ? 'translate-y-full' : ''
        }`}
      >
        <p className="h-8 flex items-center justify-center gap-1 bg-brand-light text-[12px] font-bold text-brand-hover">
          <ShieldCheck className="w-4 h-4" aria-hidden />
          {SITE_CONTENT.analysis.stickyBar.securityGuarantee}
        </p>
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          {!heroVisible && (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-text-tertiary truncate">{sj.barFee}</p>
              <p className="text-[17px] font-bold text-text-primary tabular-nums truncate">{formatWon(p.totalCommissionWon)}</p>
            </div>
          )}
          <button
            type="button"
            data-testid="matching-sticky-cta"
            tabIndex={summaryVisible ? -1 : 0}
            onClick={p.onOpenModal}
            className={`h-13 px-5 rounded-xl bg-brand text-text-inverse text-[15px] font-bold ${heroVisible ? 'flex-1' : 'flex-shrink-0'}`}
          >
            {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
          </button>
        </div>
      </div>
    </div>
  );
}
