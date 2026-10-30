'use client';

/**
 * 3단계: 복비 정하기 (2026-10-27 대표님 최종 시안).
 * 분석 카드에 있던 금액 조절(막대·±버튼·추천으로 되돌리기)·구간 안내·부가세·더 빠른 매칭 옵션을 이 단계로 옮겼다.
 * 계산은 예전 분석 카드와 같다: 기준 = 선택 층 구간 최근 실거래, 법정 상한·하한 30%·옵션 하드캡 (RULES 규칙 11)
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { formatWon } from '@/lib/utils';
import { commissionFromDiscount, commissionVat, computeCommissionQuote } from '@/lib/commission';
import { ENGINE_PARAMS } from '@/lib/analysis/marketEngine';
import { SITE_CONTENT } from '@/config/siteContent';
import FeeZoneBar from '../FeeZoneBar';
import FeeBonusOptions from './FeeBonusOptions';
import type { MatchingForm } from './useMatchingForm';

/** 처음 한 번만 보여 주는 조절 안내 */
const COACH_KEY = 'bokbi_fee_coach_seen';

const NOTE_DOT = { muted: 'bg-text-tertiary', caution: 'bg-status-caution', risk: 'bg-status-risk' } as const;

/** 색 점 + 한 줄 안내 */
function NoteLine({ tone, testId, children }: { tone: keyof typeof NOTE_DOT; testId: string; children: React.ReactNode }) {
  return (
    <p data-testid={testId} role="status" className={`flex items-start gap-2 px-1 text-[12px] font-bold break-keep ${tone === 'risk' ? 'text-[var(--status-risk-strong)]' : 'text-text-secondary'}`}>
      <span className={`mt-[5px] w-[7px] h-[7px] rounded-full flex-shrink-0 ${NOTE_DOT[tone]}`} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export default function StepFee({ form }: { form: MatchingForm }) {
  const { fee, customCommissionWon, bonusOptions, goNext, goPrev } = form;
  const { customizer } = SITE_CONTENT.analysis;
  const copy = SITE_CONTENT.matchingModal.stepFee;
  const { tradeType, dealPriceWon, recommendation, onCommissionChange } = fee;

  // ─── 단일 견적 엔진 (예전 분석 카드와 같은 계산) ────────────
  const totalBonusWon = bonusOptions.filter((b) => b.checked).reduce((sum, b) => sum + b.amountWon, 0);
  const quote = computeCommissionQuote({ basisPriceWon: dealPriceWon, tradeType, proposedWon: customCommissionWon, bonusWon: totalBonusWon });
  const legalMaxWon = quote.legal.maxWon;
  const floorWon = quote.floorWon;
  const vat = commissionVat(quote.totalWon);

  const recDiscount = recommendation?.discount ?? ENGINE_PARAMS.midRecDiscount;
  const aiRecommendedWon = commissionFromDiscount(dealPriceWon, tradeType, recDiscount);
  const recEffective = legalMaxWon > 0 ? 1 - aiRecommendedWon / legalMaxWon : recDiscount;

  const proposedDiscount = legalMaxWon > 0 ? 1 - customCommissionWon / legalMaxWon : 0;
  const isAtFloor = customCommissionWon <= floorWon;
  const isNearFloor = customCommissionWon - floorWon <= legalMaxWon * 0.1;
  const isAtCeiling = customCommissionWon >= legalMaxWon;
  const savedWon = Math.max(0, legalMaxWon - customCommissionWon);
  const discountRatePercent = Math.round(proposedDiscount * 100);

  const pos = (won: number) => (legalMaxWon > 0 ? Math.min(100, Math.max(0, (won / legalMaxWon) * 100)) : 0);
  const progressPercent = pos(customCommissionWon);
  const appliedBonusWon = Math.max(0, quote.totalWon - customCommissionWon);
  const totalPercent = pos(quote.totalWon);

  const handleStepChange = (delta: number) => {
    dismissCoach();
    onCommissionChange(Math.min(legalMaxWon, Math.max(floorWon, customCommissionWon + delta)));
  };

  // ─── 처음 한 번 안내 (코치마크) ────────────
  const [showCoach, setShowCoach] = useState(false);
  useEffect(() => {
    try {
      setShowCoach(localStorage.getItem(COACH_KEY) !== '1');
    } catch {}
  }, []);
  const dismissCoach = () => {
    if (!showCoach) return;
    setShowCoach(false);
    try {
      localStorage.setItem(COACH_KEY, '1');
    } catch {}
  };

  const [isVatOpen, setIsVatOpen] = useState(false);

  return (
    <div className="space-y-4" data-testid="modal-step-fee">
      <div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">{copy.title}</h3>
        <p className="text-[13px] font-medium text-text-tertiary mt-1 tabular-nums">
          {copy.subTitle.replace('{price}', formatWon(dealPriceWon)).replace('{max}', formatWon(legalMaxWon))}
        </p>
      </div>

      {/* ── 금액 + 아끼는 금액 배지, 약속 한 줄 ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span data-testid="fee-step-amount" className="text-[26px] font-extrabold text-brand tracking-tight tabular-nums leading-tight">
            {formatWon(customCommissionWon)}
          </span>
          <span className="text-[13px] font-extrabold text-[var(--status-good-strong)] bg-status-good-light px-3 py-1 rounded-md whitespace-nowrap">
            {savedWon > 0
              ? customizer.savingsBadgeText.replace('{saved}', formatWon(savedWon)).replace('{rate}', String(discountRatePercent))
              : customizer.savingsZeroText}
          </span>
        </div>
        {totalBonusWon > 0 && (
          <div data-testid="bonus-sum-line" className="text-[13px] font-bold text-text-secondary tabular-nums">
            {customizer.bonusSumLine
              .replace('{base}', formatWon(customCommissionWon))
              .replace('{bonus}', formatWon(appliedBonusWon))
              .replace('{total}', formatWon(quote.totalWon))}
          </div>
        )}
        <p data-testid="fee-promise" className="flex items-center gap-2 text-[13px] font-bold text-status-good">
          <span className="w-[7px] h-[7px] rounded-full bg-status-good flex-shrink-0" aria-hidden />
          {copy.promise}
        </p>
      </div>

      {/* ── 구간 막대 (분석 카드와 같은 막대, ▼가 처음 한 번 미끄러져 온다) + 직접 조절 막대 ── */}
      <div className="space-y-2">
        <FeeZoneBar
          legalMaxWon={legalMaxWon}
          floorWon={floorWon}
          recEffective={recEffective}
          // ▼는 옵션까지 더한 합계 자리 (아래 막대의 연한 파랑 끝과 같은 곳, 구간 문구 판정과 같은 금액)
          valueWon={quote.totalWon}
          animateIn
          smooth={false}
        />
        <input
          type="range"
          min={0}
          max={legalMaxWon}
          step={10000} // 1만 원 단위
          value={customCommissionWon}
          // 하한 아래는 하한으로 막고, 상한은 만 원 단위가 아니라서 마지막 한 칸은 상한으로 스냅
          onChange={(e) => {
            dismissCoach();
            const v = Number(e.target.value);
            onCommissionChange(legalMaxWon - v < 10000 ? legalMaxWon : Math.max(floorWon, v));
          }}
          aria-label={customizer.proposedFeeLabel.replace('{tradeType}', tradeType)}
          aria-valuetext={formatWon(customCommissionWon)}
          style={{
            background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${progressPercent}%, color-mix(in srgb, var(--brand-primary) 35%, transparent) ${progressPercent}%, color-mix(in srgb, var(--brand-primary) 35%, transparent) ${totalPercent}%, var(--border-default) ${totalPercent}%, var(--border-default) 100%)`,
          }}
          className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-brand"
        />

        {showCoach && (
          <div data-testid="fee-coach" className="relative rounded-xl bg-brand text-white px-3 py-3 text-[12px] font-bold flex items-center justify-between gap-2">
            <span className="absolute -top-1 left-1/2 w-2.5 h-2.5 bg-brand rotate-45 -translate-x-1/2" aria-hidden />
            <span className="break-keep">{copy.coach}</span>
            <button type="button" onClick={dismissCoach} className="min-h-9 px-2 text-white/90 font-extrabold flex-shrink-0">
              {copy.coachOk}
            </button>
          </div>
        )}

        {/* 하한·상한·옵션 상한 안내: 상자 대신 색 점 + 한 줄 (2026-10-27 대표님: 점 표시로 깔끔하게). 조건·문구는 예전 그대로 */}
        {isNearFloor && !isAtFloor && (
          <NoteLine tone="muted" testId="slider-floor-label">
            {customizer.sliderFloorLabel.replace('{amount}', formatWon(floorWon))}
          </NoteLine>
        )}
        {isAtFloor && <NoteLine tone="caution" testId="fee-floor-warning">{customizer.minFloorWarning}</NoteLine>}
        {isAtCeiling && (
          <NoteLine tone="caution" testId="fee-ceiling-warning">
            {customizer.maxCeilingWarning.replace('{rate}', quote.legal.ratePercentLabel)}
          </NoteLine>
        )}
        {quote.isCapped && totalBonusWon > 0 && (
          <NoteLine tone="risk" testId="bonus-cap-notice">
            {(appliedBonusWon > 0 ? customizer.bonusCapSliderNotice : customizer.bonusCapSliderNoticeNone)
              .replace('{max}', formatWon(legalMaxWon))
              .replace('{applied}', formatWon(appliedBonusWon))}
          </NoteLine>
        )}

        {/* ── 미세 조절 + 추천으로 되돌리기 ── */}
        {customCommissionWon !== aiRecommendedWon && (
          <div className="flex justify-end px-1">
            <button
              type="button"
              data-testid="reset-to-recommended"
              onClick={() => onCommissionChange(aiRecommendedWon)}
              className="min-h-9 flex items-center gap-2 px-3 py-1 rounded-full bg-brand-light text-brand-hover border border-brand-line text-[13px] font-bold active:scale-95 transition-all"
            >
              <span>{customizer.aiResetButtonLabel}</span>
              <span className="tabular-nums">({formatWon(aiRecommendedWon)})</span>
            </button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {([
            [-100000, customizer.stepperLabels.minus10, 'text-text-secondary'],
            [-10000, customizer.stepperLabels.minus1, 'text-text-secondary'],
            [10000, customizer.stepperLabels.plus1, 'text-brand'],
            [100000, customizer.stepperLabels.plus10, 'text-brand'],
          ] as const).map(([delta, label, color]) => (
            <button
              key={delta}
              type="button"
              onClick={() => handleStepChange(delta)}
              className={`min-h-11 rounded-xl bg-surface-subtle hover:bg-surface-card border border-border-default text-[13px] font-extrabold ${color} active:scale-95 transition-all`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 부가세: 회색 알약, 누르면 사무소 유형별 금액 ── */}
      <div>
        <button
          type="button"
          data-testid="vat-toggle"
          aria-expanded={isVatOpen}
          onClick={() => setIsVatOpen((v) => !v)}
          className="min-h-11 flex items-center"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-subtle border border-border-default text-[12px] font-bold text-text-secondary">
            {copy.vatPill}
            <span className="w-3.5 h-3.5 rounded-full border border-text-tertiary text-[12px] leading-none flex items-center justify-center text-text-tertiary" aria-hidden>
              i
            </span>
          </span>
        </button>
        {isVatOpen && (
          <div className="mt-1 p-3 rounded-xl bg-surface-card border border-border-default text-[12px] text-text-secondary tabular-nums space-y-1">
            {([
              [customizer.vatGeneralLabel, vat.generalWon],
              [customizer.vatSimplifiedLabel, vat.simplifiedWon],
            ] as const).map(([label, won]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="whitespace-nowrap">{label}</span>
                <span className="whitespace-nowrap font-bold text-text-primary">+{formatWon(won)}</span>
              </div>
            ))}
            <p className="text-[12px] text-text-tertiary pt-1">{copy.vatNote}</p>
          </div>
        )}
      </div>

      <FeeBonusOptions
        bonusOptions={bonusOptions}
        totalBonusWon={totalBonusWon}
        onToggleBonus={fee.onToggleBonus}
        onUpdateBonusAmount={fee.onUpdateBonusAmount}
        onUpdateBonusConditionText={fee.onUpdateBonusConditionText}
      />

      {/* 하단 네비게이션 */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={goPrev}
          className="h-13 px-4 rounded-xl bg-surface-subtle text-text-secondary font-bold text-[15px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{SITE_CONTENT.matchingModal.prevButton}</span>
        </button>
        <button
          type="button"
          data-testid="modal-step-fee-next"
          onClick={goNext}
          className="flex-1 h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all bg-brand hover:bg-brand-hover text-white shadow-brand-glow cursor-pointer"
        >
          <span>{copy.nextStepButton}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
