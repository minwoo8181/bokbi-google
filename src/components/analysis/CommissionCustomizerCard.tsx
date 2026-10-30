'use client';

/**
 * 분석 화면 추천 복비 카드 (2026-10-27 대표님 최종 시안).
 * 보여주기 전용: 기준가·법정 상한 → 추천 복비 + 아끼는 금액 → 추천 구간 막대 → 무료 매칭 버튼.
 * 금액 조절·더 빠른 매칭 옵션·부가세 자세히는 매칭 요청 창 "복비 정하기" 단계에서 (내 집 희망가 기준으로 다시 계산되는 곳)
 */
import React from 'react';
import { Calculator, Info, ChevronRight } from 'lucide-react';
import { formatWon } from '@/lib/utils';
import { commissionFromDiscount, computeCommissionQuote } from '@/lib/commission';
import { ENGINE_PARAMS } from '@/lib/analysis/marketEngine';
import { feeZoneBarLayout } from '@/lib/analysis/feeZoneBar';
import { TradeType, RecommendationView, ReferencePrice } from './types';
import { SITE_CONTENT } from '@/config/siteContent';
import FeeZoneBar from './FeeZoneBar';

interface CommissionCustomizerCardProps {
  tradeType: TradeType;
  dealPriceWon: number; // 선택 평형·층 구간의 최근 실거래가 (원)
  reference: ReferencePrice | null;
  /** 선택 층 구간 이름 ('중층') */
  floorBandName: string;
  /** 매칭 요청 창 열기 */
  onRequestMatch: () => void;
  recommendation: RecommendationView | null;
  /** 추천 복비 (원) */
  customCommissionWon: number;
}

export default function CommissionCustomizerCard({
  tradeType,
  dealPriceWon,
  reference,
  floorBandName,
  onRequestMatch,
  recommendation,
  customCommissionWon,
}: CommissionCustomizerCardProps) {
  const { customizer, stickyBar } = SITE_CONTENT.analysis;

  // ─── 단일 견적 엔진: 법정 상한·하한 30% (RULES 규칙 11) ────────────
  const quote = computeCommissionQuote({ basisPriceWon: dealPriceWon, tradeType, proposedWon: customCommissionWon, bonusWon: 0 });
  const legalMaxWon = quote.legal.maxWon;
  const savedWon = Math.max(0, legalMaxWon - customCommissionWon);
  const discountRatePercent = legalMaxWon > 0 ? Math.round((1 - customCommissionWon / legalMaxWon) * 100) : 0;

  // 추천 복비는 만 원 단위 내림이라 할인율이 추천값보다 조금 커진다 → 구간 경계는 실제 추천 금액의 할인율로
  const recDiscount = recommendation?.discount ?? ENGINE_PARAMS.midRecDiscount;
  const aiRecommendedWon = commissionFromDiscount(dealPriceWon, tradeType, recDiscount);
  const recEffective = legalMaxWon > 0 ? 1 - aiRecommendedWon / legalMaxWon : recDiscount;
  // 라벨에 쓰는 추천(초록) 구간 할인 범위 — 막대의 초록 칸 양 끝 그대로 (계산 규칙은 feeZoneBar/feeZone)
  const green = feeZoneBarLayout(legalMaxWon, quote.floorWon, recEffective).segments.find((s) => s.zone === 'RECOMMENDED');
  const recRange = green ? { min: Math.round(100 - green.to), max: Math.round(100 - green.from) } : null;

  // 버튼 문구는 아래 고정 바와 같다 ("약 ○○ 아끼고 무료 매칭", 어림값은 만 원 단위 내림)
  const ctaText =
    savedWon > 0
      ? stickyBar.ctaWithSavingsText.replace('{amount}', formatWon(Math.floor(savedWon / 10000) * 10000))
      : stickyBar.ctaDefaultText;

  return (
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
      {/* 카드 제목 통일: 17px · 검정 · 아이콘 없음 (파랑은 버튼·핵심 숫자에만, 대표님 승인 2026-10-24) */}
      <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight">{customizer.cardTitle}</h2>

      {/* ── 기준가 · 법정 상한 ── */}
      <div className="px-4 py-3 rounded-xl bg-surface-subtle border border-border-default space-y-2 text-[13px]">
        <div className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-1 text-text-secondary whitespace-nowrap">
            <Calculator className="w-3.5 h-3.5 text-brand" aria-hidden />
            {customizer.dealPricePrefix.replace('{tradeType}', tradeType)}
          </span>
          <strong className="text-text-primary font-extrabold tabular-nums whitespace-nowrap">{formatWon(dealPriceWon)}</strong>
        </div>
        {reference && (
          <div className="text-[12px] text-text-tertiary pl-[18px] break-keep">
            {customizer.dealPriceBasis[reference.source]
              .replace('{band}', floorBandName)
              .replace('{floor}', String(reference.floor ?? ''))
              .replace('{date}', reference.date ?? '')}
          </div>
        )}
        <div className="flex items-start justify-between gap-3 pl-[18px]">
          <span className="text-text-secondary whitespace-nowrap">
            {customizer.legalMaxPrefix} ({quote.legal.ratePercentLabel})
          </span>
          <span className="text-text-secondary font-bold tabular-nums whitespace-nowrap">{formatWon(legalMaxWon)}</span>
        </div>
      </div>

      {/* ── 추천 복비: 금액 옆에 아끼는 금액 배지 (초록은 이 배지 하나만, 2026-10-27) ── */}
      <div className="space-y-1 px-1">
        <div className="text-[12px] font-medium text-text-tertiary tabular-nums">
          {customizer.analysisFeeLabel.replace('{tradeType}', tradeType)}
          {recRange && (
            <>
              <span aria-hidden> · </span>
              {customizer.analysisFeeRange.replace('{min}', String(recRange.min)).replace('{max}', String(recRange.max))}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span data-testid="analysis-fee" className="text-[26px] font-extrabold text-brand tracking-tight tabular-nums leading-tight">
            {formatWon(customCommissionWon)}
          </span>
          <span className="text-[13px] font-extrabold text-[var(--status-good-strong)] bg-status-good-light px-3 py-1 rounded-md whitespace-nowrap">
            {savedWon > 0
              ? customizer.savingsBadgeText.replace('{saved}', formatWon(savedWon)).replace('{rate}', String(discountRatePercent))
              : customizer.savingsZeroText}
          </span>
        </div>
      </div>

      {/* ── 추천 구간 (보기 전용): ▼가 처음 한 번 추천 금액으로 미끄러져 멈춘다. ▼ 위 글자는 금액 대신 "추천" ── */}
      <FeeZoneBar
        legalMaxWon={legalMaxWon}
        floorWon={quote.floorWon}
        recEffective={recEffective}
        valueWon={customCommissionWon}
        markerLabel={customizer.analysisMarkerLabel}
        animateIn
      />

      {/* ── 데이터 부족 30% 안내 (사실 그대로, 대표님 2026-10-24) ── */}
      {recommendation?.defaultReason && (
        <p className="text-[12px] text-text-secondary leading-snug break-keep flex items-start gap-1">
          <Info className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0 mt-px" aria-hidden />
          <span>{customizer.defaultReasonText[recommendation.defaultReason].replace('{n}', String(recommendation.complexSales12m))}</span>
        </p>
      )}

      {/* ── CTA: 아래 고정 바와 같은 문구 ── */}
      <div className="space-y-2">
        <button
          type="button"
          data-testid="analysis-card-cta"
          onClick={onRequestMatch}
          className="w-full h-12 rounded-xl bg-brand hover:bg-brand-hover text-white font-extrabold text-[15px] flex items-center justify-center gap-1 shadow-md shadow-brand-glow active:scale-[0.98] transition-all"
        >
          <span>{ctaText}</span>
          <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden />
        </button>
        <p className="text-center text-[12px] font-medium text-text-tertiary break-keep">{customizer.ctaSubLine}</p>
      </div>
    </section>
  );
}
