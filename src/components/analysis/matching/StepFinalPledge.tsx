'use client';

/** 5단계: 중개사에게 보이는 미리보기·법적 서약·요청 보내기 */
import { ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { formatWon, formatPriceTenThousand } from '@/lib/utils';
import { leasedSaleSummary } from '@/lib/market/leasedSale';
import { mortgageSummary } from '@/lib/market/mortgage';
import { SITE_CONTENT } from '@/config/siteContent';
import FeeRuleExamples from '@/components/common/FeeRuleExamples';
import type { MatchingForm } from './useMatchingForm';
import { FieldError, MissingCount, errorRing, useMissingGuard } from './missingGuard';

export default function StepFinalPledge({ form }: { form: MatchingForm }) {
  const { apartment, floorLabel, currentTradeType, currentPyeong, typeSuffix, askingPriceTenThousand, isLeasedSale, leasedSaleInput, leasedBuyerCash, mortgageInput, submit, selectedOptionsSummary, isOwnerChecked, setIsOwnerChecked, isLegalPledgeChecked, setIsLegalPledgeChecked, maskedDong, maskedHo, maskedPhoneDeep, finalCommissionWon, savedWon, goPrev, handleFinalSubmit, missing5 } = form;
  const guard = useMissingGuard(missing5);
  const miss = SITE_CONTENT.matchingModal.missing;

  return (
    <div className="space-y-4" data-testid="modal-step-5">
      <div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">
          {SITE_CONTENT.matchingModal.step5.title}
        </h3>
      </div>

      {/* ★ 토스 라이트 톤 일원화: 중개사 스마트폰 미리보기 카드 */}
      <div
        data-testid="broker-blind-preview-card"
        className="p-4 rounded-2xl bg-surface-subtle border border-border-default space-y-3 shadow-xs"
      >

        <div className="p-3 rounded-xl bg-surface-card border border-border-light space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[12px] text-text-secondary font-medium">
              {SITE_CONTENT.matchingModal.step5.previewAptLabel}
            </span>
            <span className="text-[13px] font-extrabold text-text-primary">
              {apartment.apt_name} {currentPyeong.name}{typeSuffix} · {currentTradeType}
            </span>
          </div>
          {/* 블라인드 안내는 가려진 값 바로 아래에만 */}
          <div className="flex justify-between items-start gap-2">
            <span className="text-[12px] text-text-secondary font-medium flex-shrink-0">
              {SITE_CONTENT.matchingModal.step5.previewDongHoLabel}
            </span>
            <div className="text-right">
              <div className="text-[13px] font-bold text-brand">
                {maskedDong} {maskedHo} · {floorLabel}
              </div>
              <div className="text-[12px] font-bold text-text-tertiary">
                {SITE_CONTENT.matchingModal.step5.previewUnlockTag}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-[12px] text-text-secondary font-medium flex-shrink-0">
              {SITE_CONTENT.matchingModal.step5.previewPhoneLabel}
            </span>
            <div className="text-right">
              <div className="text-[13px] text-text-secondary font-bold tabular-nums">{maskedPhoneDeep}</div>
              <div className="text-[12px] font-bold text-text-tertiary">
                {SITE_CONTENT.matchingModal.step5.previewUnlockTag}
              </div>
            </div>
          </div>
          {isLeasedSale && (
            <div data-testid="preview-leased-sale" className="flex justify-between items-start gap-2">
              <span className="text-[12px] text-text-secondary font-medium flex-shrink-0">
                {SITE_CONTENT.matchingModal.step5.previewLeaseLabel}
              </span>
              <div className="text-right min-w-0">
                <span className="inline-block text-[12px] font-extrabold text-brand-hover bg-brand-light px-2 py-1 rounded mb-1">
                  {SITE_CONTENT.matchingModal.step5.leasedSaleBadge}
                </span>
                <div className="text-[12px] font-bold text-text-primary break-keep">{leasedSaleSummary(leasedSaleInput)}</div>
                {leasedBuyerCash !== null && (
                  <div className="text-[12px] font-extrabold text-brand tabular-nums">
                    {SITE_CONTENT.matchingModal.step5.previewBuyerCashLabel} {formatPriceTenThousand(leasedBuyerCash)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div data-testid="preview-mortgage" className="flex justify-between items-baseline gap-2">
            <span className="text-[12px] text-text-secondary font-medium flex-shrink-0">
              {SITE_CONTENT.matchingModal.step5.previewMortgageLabel}
            </span>
            <span className="text-[12px] font-bold text-text-primary text-right break-keep">
              {mortgageSummary(mortgageInput, currentTradeType)}
            </span>
          </div>
          <div className="pt-2 border-t border-border-light space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[12px] text-text-secondary">
                {SITE_CONTENT.matchingModal.step5.previewAskingPriceLabel}:{' '}
                <strong className="text-text-primary font-extrabold">
                  {formatPriceTenThousand(askingPriceTenThousand)}
                </strong>
              </span>
              <span className="text-[13px] font-extrabold text-brand">
                {SITE_CONTENT.matchingModal.step5.previewProposedFeeLabel}: {formatWon(finalCommissionWon)}
              </span>
            </div>

            {/* 법정 상한보다 낮은 비율·금액 (문구는 step5.previewDiscountTag, 색은 status-good 토큰 — 2단계 배지와 같음) */}
            {savedWon > 0 && (
              <div className="flex justify-end">
                <span className="text-[12px] font-bold text-[var(--status-good-strong)] bg-status-good-light px-2 py-1 rounded-md">
                  {SITE_CONTENT.matchingModal.step5.previewDiscountTag
                    .replace('{percent}', String(Math.round((savedWon / (finalCommissionWon + savedWon)) * 100)))
                    .replace('{saved}', formatWon(savedWon))}
                </span>
              </div>
            )}

            {/* 선택된 옵션/특이사항 요약 */}
            {selectedOptionsSummary && (
              <div className="pt-2 border-t border-border-light flex justify-between items-baseline text-[12px]">
                <span className="text-text-secondary font-medium">
                  {SITE_CONTENT.matchingModal.step5.previewOptionsLabel}
                </span>
                <span className="font-bold text-text-primary text-right max-w-[220px] truncate">
                  {selectedOptionsSummary}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-brand-light border border-brand-line flex items-start gap-2" /* 협의 복비 보장 — 파트너 중개사 서약과 같은 약속 + 거래금액이 바뀔 때 규칙·예시 표 */>
        <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0 mt-1" aria-hidden />
        <div className="space-y-1">
          <div className="text-[13px] font-extrabold text-text-primary">{SITE_CONTENT.matchingModal.step5.feeGuaranteeTitle}</div>
          <p className="text-[12px] text-text-secondary leading-snug break-keep">{SITE_CONTENT.matchingModal.step5.feeGuaranteeDesc}</p>
          <p className="text-[12px] text-text-secondary leading-snug break-keep pt-2 mt-2 border-t border-brand-light">
            {SITE_CONTENT.matchingModal.step5.feeGuaranteeSupport}
          </p><FeeRuleExamples agreed={{ tradeType: currentTradeType, askingPriceManwon: askingPriceTenThousand, commissionWon: finalCommissionWon }} />
        </div>
      </div>

      {/* 2중 법적 필수 서약 */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          data-testid="chk-sole-owner"
          data-field="OWNER_PLEDGE"
          onClick={() => setIsOwnerChecked((prev) => !prev)}
          className={`w-full p-3 rounded-xl border-2 flex items-start gap-3 text-left transition-all cursor-pointer ${errorRing(guard.shown('OWNER_PLEDGE'))} ${
            isOwnerChecked
              ? 'border-brand bg-brand-subtle shadow-xs'
              : 'border-border-default bg-surface-subtle hover:border-brand-line-strong'
          }`}
        >
          <div
            className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isOwnerChecked
                ? 'bg-brand border-brand text-white shadow-2xs'
                : 'border-border-default bg-surface-card'
            }`}
          >
            {isOwnerChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="text-[12px] font-bold text-text-primary leading-snug">
            {SITE_CONTENT.matchingModal.step5.soleOwnerCardTitle}
          </span>
        </button>
        <FieldError show={guard.shown('OWNER_PLEDGE')} text={miss.OWNER_PLEDGE} />

        <button
          type="button"
          data-testid="chk-legal-pledge"
          data-field="LEGAL_PLEDGE"
          onClick={() => setIsLegalPledgeChecked((prev) => !prev)}
          className={`w-full p-3 rounded-xl border-2 flex items-start gap-3 text-left transition-all cursor-pointer ${errorRing(guard.shown('LEGAL_PLEDGE'))} ${
            isLegalPledgeChecked
              ? 'border-brand bg-brand-subtle shadow-xs'
              : 'border-border-default bg-surface-subtle hover:border-brand-line-strong'
          }`}
        >
          <div
            className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              isLegalPledgeChecked
                ? 'bg-brand border-brand text-white shadow-2xs'
                : 'border-border-default bg-surface-card'
            }`}
          >
            {isLegalPledgeChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="text-[12px] font-bold text-text-primary leading-snug">
            {SITE_CONTENT.matchingModal.step5.legalPledgeCardTitle}
          </span>
        </button>
        <FieldError show={guard.shown('LEGAL_PLEDGE')} text={miss.LEGAL_PLEDGE} />
      </div>
      <MissingCount guard={guard} />

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={goPrev}
          className="h-13 px-4 rounded-xl bg-surface-subtle text-text-secondary font-bold text-[15px] hover:bg-surface-subtle flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{SITE_CONTENT.matchingModal.prevButton}</span>
        </button>
        <button
          type="button"
          data-testid="modal-step5-submit"
          disabled={submit === 'SENDING'}
          onClick={() => guard.attempt(() => void handleFinalSubmit())}
          className="flex-1 h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md transition-all bg-brand hover:bg-brand-hover text-white active:scale-98 shadow-brand-glow cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <span>{SITE_CONTENT.matchingModal.step5.submitButtonText}</span>
          <Check className="w-4 h-4" />
        </button>
      </div>
      {submit === 'FAILED' && <p role="alert" className="text-[13px] font-bold text-[var(--status-risk-strong)] text-pretty">{SITE_CONTENT.matchingModal.step5.submitError}</p>}
    </div>
  );
}
