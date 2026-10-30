'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Lock, Share2, X } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { fill } from '@/components/my-requests/format';
import LabConditionSheet from '@/components/lab/LabConditionSheet';
import type { ComplexInfo } from '@/lib/market/repository';
import type { ApartmentStat } from '@/types';
import type {
  FloorCategory,
  PyeongDetailStat,
  RecommendationView,
  ReferencePrice,
  TradeType,
} from '@/components/analysis/types';
import HeydealerFeeCurve from './HeydealerFeeCurve';

const t = LAB_CONTENT.heydealer.analysis;
const TIP_KEY = 'bokbi_lab_hd_tip';

interface HeydealerAnalysisBodyProps {
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
  dealPriceWon: number;
  totalCommissionWon: number;
  legalMaxWon: number;
  onBack: () => void;
  onShare: () => void;
  onOpenModal: () => void;
  /** 원래 카드들: 추천 이유(계산·AI 설명) · 실거래 그래프 · 투표 */
  sections: { chart: React.ReactNode; reason: React.ReactNode; poll: React.ReactNode };
}

/**
 * design-lab 헤이딜러 분석 = "내차 예상시세" 화면 구성 (레퍼런스: 헤이딜러 2023 시세 조회).
 * 위 번호판 배지(단지 이름) → 회색 이름표·값 제원 목록(거래·평형·층 옆 파란 "수정" → 내 집 조건 시트, 처음 한 번 검은 말풍선)
 * → 적정 복비 큰 파랑 금액 + 할인율 곡선(핀) + 테두리 버튼(실거래 근거로) → 납작한 근거 구획 → 바닥 바(안심 글 + 파랑 버튼, 금액이 화면 밖이면 버튼 위 검은 꼬리표).
 * 계산은 AnalysisClient 그대로, 이 파일은 배치만
 */
export default function HeydealerAnalysisBody(p: HeydealerAnalysisBodyProps) {
  const [conditionOpen, setConditionOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tip, setTip] = useState(false);
  const [amountVisible, setAmountVisible] = useState(true);

  useEffect(() => {
    try {
      setTip(localStorage.getItem(TIP_KEY) !== '1');
    } catch {}
  }, []);
  useEffect(() => {
    const el = document.querySelector('[data-hd-amount]');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAmountVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hideTip = () => {
    setTip(false);
    try {
      localStorage.setItem(TIP_KEY, '1');
    } catch {}
  };
  const openCondition = () => {
    hideTip();
    setConditionOpen(true);
  };
  const toProof = () => document.querySelector('[data-testid="trade-card"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const r = p.recommendation;
  const ref = p.reference;
  const shortName = p.apartment.apt_name.replace(/\s*\([^)]*\)$/, '');
  const band = SITE_CONTENT.analysis.floorSelector.bands[p.floorCategory];
  const pct = r ? Math.round(r.discount * 100) : 0;
  const info = p.complexInfo;

  const rows: { label: string; value: string; fix?: boolean }[] = [
    { label: t.rowTrade, value: p.tradeType, fix: true },
    {
      label: t.rowPyeong,
      value: fill(t.pyeongValue, { name: p.selectedPyeong.name.replace(/\s*\(.*\)$/, ''), area: p.selectedPyeong.exclusiveArea.toFixed(0) }),
      fix: true,
    },
    { label: t.rowFloor, value: fill(t.floorValue, { band: band.label, range: band.range }), fix: true },
  ];
  if (ref) {
    const when = [ref.date, ref.floor ? `${ref.floor}층` : null].filter(Boolean).join(' · ');
    rows.push({ label: t.rowDeal, value: `${formatPriceTenThousand(ref.priceManwon)}${when ? ` (${when})` : ''}` });
  }
  const more: { label: string; value: string }[] = [
    { label: t.rowHouseholds, value: fill(t.householdsValue, { n: p.apartment.total_households.toLocaleString('ko-KR') }) },
  ];
  if (p.apartment.built_year) more.push({ label: t.rowBuilt, value: fill(t.builtValue, { n: p.apartment.built_year }) });
  if (info?.elementarySchool && info.elementarySchoolWalkMin !== null)
    more.push({ label: t.rowSchool, value: fill(t.schoolValue, { name: info.elementarySchool, min: info.elementarySchoolWalkMin }) });
  if (info?.parkingPerHousehold) more.push({ label: t.rowParking, value: fill(t.parkingValue, { n: info.parkingPerHousehold.toFixed(1) }) });

  const Row = ({ label, value, fix }: { label: string; value: string; fix?: boolean }) => (
    <div className="grid grid-cols-[80px_1fr] gap-3 py-2">
      <dt className="text-[15px] text-text-tertiary">{label}</dt>
      <dd className="text-[15px] text-text-primary break-keep">
        {value}
        {fix && (
          <button
            type="button"
            onClick={openCondition}
            aria-label={`${label} ${t.fix}`}
            className="ml-1 h-11 min-w-[44px] -my-3 px-1 text-[15px] font-medium text-brand underline underline-offset-4"
          >
            {t.fix}
          </button>
        )}
      </dd>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-32">
      <header className="sticky top-0 z-30 h-14 px-2 bg-surface-card flex items-center justify-between gap-2">
        <button type="button" onClick={p.onBack} aria-label="뒤로가기" className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {/* 번호판 배지 = 단지 이름 */}
        <span className="lab-plate-badge min-w-0 h-9 px-4 rounded-lg border-2 border-text-primary bg-surface-card flex items-center text-[17px] font-bold text-text-primary">
          <span className="truncate">{shortName}</span>
        </span>
        <button type="button" onClick={p.onShare} aria-label={t.share} className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-text-primary">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      {/* 제원 목록 */}
      <section className="bg-surface-card px-5 pt-4 pb-4" data-testid="hd-spec">
        <dl>
          {rows.map((row, i) => (
            <React.Fragment key={row.label}>
              <Row {...row} />
              {/* 처음 한 번: 조건 줄 바로 아래 검은 말풍선 (아래 줄을 가리지 않게 자리를 차지한다) */}
              {i === 2 && tip && (
                <div className="pl-[92px] pb-2" role="status">
                  <span className="relative inline-flex items-center gap-1 rounded-lg bg-[var(--lab-ink)] pl-3 text-[13px] font-medium text-text-inverse">
                    <span className="absolute -top-1 left-4 w-2 h-2 rotate-45 bg-[var(--lab-ink)]" aria-hidden />
                    {t.tip}
                    <button type="button" onClick={hideTip} aria-label={t.tipClose} className="w-11 h-11 flex items-center justify-center">
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
          {moreOpen && more.map((row) => <Row key={row.label} {...row} />)}
        </dl>
        <div className="flex justify-end">
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className="h-11 -mr-1 px-1 inline-flex items-center gap-1 text-[13px] text-text-tertiary"
          >
            {moreOpen ? t.less : t.more}
            <ChevronDown className={`w-4 h-4 transition-transform duration-fast ${moreOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
      </section>

      {/* 적정 복비 = 헤이딜러 "내차 예상시세" */}
      <section className="mt-2 bg-surface-card px-5 pt-8 pb-6" data-testid="hd-estimate">
        <h1 className="text-[20px] font-bold text-text-primary">{t.estimateTitle}</h1>
        <p data-hd-amount className="mt-2 text-[40px] font-bold text-brand tabular-nums leading-[1.2]">
          {formatWon(p.totalCommissionWon)}
        </p>
        <p className="mt-2 text-[13px] text-text-tertiary">
          {pct > 0 ? fill(t.estimateSub, { legal: formatWon(p.legalMaxWon), pct }) : t.estimateSame}
        </p>
        {r && <HeydealerFeeCurve dealPriceWon={p.dealPriceWon} tradeType={p.tradeType} recommendation={r} />}
        <button
          type="button"
          onClick={toProof}
          className="mt-6 w-full h-13 rounded-xl border border-brand text-brand text-[15px] font-bold"
        >
          {t.proofButton}
        </button>
      </section>

      {/* 근거: 추천 이유 → 실거래 → 투표 (회색 틈으로 나눈 납작한 흰 구획) */}
      <div className="lab-hd-flat mt-2 flex flex-col gap-2">
        {p.sections.reason}
        {p.sections.chart}
        {p.sections.poll}
      </div>

      <LabConditionSheet
        open={conditionOpen}
        onClose={() => setConditionOpen(false)}
        testId="hd-condition-sheet"
        pyeongList={p.pyeongList}
        selectedPyeong={p.selectedPyeong}
        onSelectPyeong={p.onSelectPyeong}
        tradeType={p.tradeType}
        onChangeTradeType={p.onChangeTradeType}
        floorCategory={p.floorCategory}
        onSelectFloor={p.onSelectFloor}
      />

      {/* 바닥 바 = 헤이딜러 "내차견적 받기 | 경매방법 선택" */}
      <div className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light">
        <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center gap-3">
          <p className="min-w-0 flex-1 flex items-start gap-1 text-[13px] font-bold text-text-primary leading-snug">
            <Lock className="w-4 h-4 mt-1 flex-shrink-0 text-brand" aria-hidden />
            <span>{SITE_CONTENT.analysis.stickyBar.securityGuarantee}</span>
          </p>
          <div className="relative flex-shrink-0">
            {!amountVisible && (
              <span
                data-testid="hd-bar-tag"
                className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-[var(--lab-ink)] px-2 py-1 text-[12px] font-bold text-text-inverse tabular-nums"
              >
                {fill(t.barTag, { amount: formatWon(p.totalCommissionWon) })}
              </span>
            )}
            <button
              type="button"
              data-testid="matching-sticky-cta"
              onClick={p.onOpenModal}
              className="h-13 px-5 rounded-xl bg-brand text-text-inverse text-[15px] font-bold"
            >
              {SITE_CONTENT.analysis.stickyBar.ctaDefaultText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
