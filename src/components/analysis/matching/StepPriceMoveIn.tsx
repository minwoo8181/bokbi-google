'use client';

/** 2단계: 희망 금액·점유 상태·근저당·입주일 (점유·근저당 칸은 각 Section) */
import { ArrowRight, ArrowLeft, Calendar } from 'lucide-react';
import { formatWon, formatPriceTenThousand } from '@/lib/utils';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatMoveInDateWithDay } from '@/lib/requests/moveIn';
import OccupancySection from './OccupancySection';
import MortgageSection from './MortgageSection';
import type { MatchingForm } from './useMatchingForm';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '../segmentStyles';
import { FieldError, MissingCount, errorRing, useMissingGuard } from './missingGuard';

export default function StepPriceMoveIn({ form }: { form: MatchingForm }) {
  const { currentTradeType, askingPriceTenThousand, setAskingPriceTenThousand, moveInType, setMoveInType, moveInDate, setMoveInDate, isDirectEditingPrice, setIsDirectEditingPrice, tempAskingPriceInput, setTempAskingPriceInput, isLeasedSale, resumeShort, priceVsTrade, missing2, legalCommission, legalMaxWon, savedWon, goNext, goPrev } = form;
  const guard = useMissingGuard(missing2);

  return (
    <div className="space-y-4" data-testid="modal-step-2">
      <div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">
          {SITE_CONTENT.matchingModal.step2.title}
        </h3>
        <p className="text-[13px] font-medium text-text-tertiary mt-1">
          {SITE_CONTENT.matchingModal.step2.subTitle}
        </p>
      </div>

      {/* 1) 희망 금액 입력 & 스텝퍼 (불필요한 괄호 삭제 완료) */}
      <div className="space-y-2">
        <label className="text-[12px] font-bold text-text-secondary block">
          {SITE_CONTENT.matchingModal.step2.askingPriceLabel.replace('{tradeType}', currentTradeType)}
        </label>
        <div className="p-4 rounded-2xl bg-surface-subtle border border-border-default space-y-3">
          {isDirectEditingPrice ? (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="h-11 flex-1 rounded-xl bg-surface-card border border-brand px-3 flex items-center justify-between">
                  <input
                    type="number"
                    data-testid="input-direct-asking-price"
                    value={tempAskingPriceInput}
                    onChange={(e) => setTempAskingPriceInput(e.target.value)}
                    placeholder={SITE_CONTENT.matchingModal.step2.directEditPlaceholder}
                    className="w-full bg-transparent font-extrabold text-[17px] text-text-primary focus:outline-none"
                    autoFocus
                  />
                  <span className="text-[12px] font-bold text-text-tertiary ml-1 whitespace-nowrap">
                    {SITE_CONTENT.matchingModal.step2.directEditUnit}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="btn-confirm-direct-price"
                  onClick={() => {
                    const num = parseInt(tempAskingPriceInput, 10);
                    if (!isNaN(num) && num > 0) {
                      setAskingPriceTenThousand(num);
                    }
                    setIsDirectEditingPrice(false);
                  }}
                  className="h-11 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-[12px] font-extrabold active:scale-95 transition-all cursor-pointer"
                >
                  {SITE_CONTENT.matchingModal.step2.directEditConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDirectEditingPrice(false)}
                  className="h-11 px-3 rounded-xl bg-surface-card border border-border-default text-text-secondary text-[12px] font-bold active:scale-95 transition-all cursor-pointer"
                >
                  {SITE_CONTENT.matchingModal.step2.directEditCancel}
                </button>
              </div>
              {parseInt(tempAskingPriceInput, 10) > 0 && (
                <p className="text-[12px] font-extrabold text-brand px-1">
                  = {formatPriceTenThousand(parseInt(tempAskingPriceInput, 10))}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[20px] font-extrabold text-brand tabular-nums tracking-tight">
                {formatPriceTenThousand(askingPriceTenThousand)}
              </span>
              <button
                type="button"
                data-testid="btn-toggle-direct-price"
                onClick={() => {
                  setTempAskingPriceInput(String(askingPriceTenThousand));
                  setIsDirectEditingPrice(true);
                }}
                className="text-[12px] font-bold text-brand-hover bg-brand-light hover:bg-brand-light px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                ✎ {SITE_CONTENT.matchingModal.step2.directEditButton}
              </button>
            </div>
          )}

          {/* 희망가 ↔ 최근 실거래: 사실만 한 줄 */}
          {priceVsTrade && (
            <p className="text-[13px] font-medium text-text-secondary break-keep" data-testid="price-vs-trade">
              {priceVsTrade}
            </p>
          )}

          {/* 4단 퀵 스텝퍼 */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setAskingPriceTenThousand((p) => Math.max(1000, p - 5000))}
              className="py-2 bg-surface-card rounded-lg border border-border-default text-[12px] font-bold text-text-secondary hover:border-brand-line-strong active:scale-95 transition-all cursor-pointer"
            >
              {SITE_CONTENT.matchingModal.step2.stepperMinus5000}
            </button>
            <button
              type="button"
              onClick={() => setAskingPriceTenThousand((p) => Math.max(1000, p - 1000))}
              className="py-2 bg-surface-card rounded-lg border border-border-default text-[12px] font-bold text-text-secondary hover:border-brand-line-strong active:scale-95 transition-all cursor-pointer"
            >
              {SITE_CONTENT.matchingModal.step2.stepperMinus1000}
            </button>
            <button
              type="button"
              onClick={() => setAskingPriceTenThousand((p) => p + 1000)}
              className="py-2 bg-surface-card rounded-lg border border-border-default text-[12px] font-bold text-text-secondary hover:border-brand-line-strong active:scale-95 transition-all cursor-pointer"
            >
              {SITE_CONTENT.matchingModal.step2.stepperPlus1000}
            </button>
            <button
              type="button"
              onClick={() => setAskingPriceTenThousand((p) => p + 5000)}
              className="py-2 bg-surface-card rounded-lg border border-border-default text-[12px] font-bold text-text-secondary hover:border-brand-line-strong active:scale-95 transition-all cursor-pointer"
            >
              {SITE_CONTENT.matchingModal.step2.stepperPlus5000}
            </button>
          </div>
        </div>

        {/* ★ 실시간 절약액 공식 연동 배지 */}
        {/* 점 하나 + 두 줄 (2026-10-27: 이모지·emerald 직접 지정 → 점·status-good 토큰). 금액 계산은 그대로 */}
        <div
          data-testid="realtime-savings-badge"
          className="px-3 py-3 rounded-xl bg-status-good-light animate-fade-in"
        >
          <p className="flex items-center gap-2 text-[13px] font-extrabold text-status-good break-keep">
            <span className="w-1.5 h-1.5 rounded-full bg-status-good flex-shrink-0" aria-hidden />
            {savedWon > 0
              ? SITE_CONTENT.matchingModal.step2.savingsBadgeText.replace('{amount}', formatWon(savedWon))
              : SITE_CONTENT.matchingModal.step2.savingsBadgeZero}
          </p>
          <p className="mt-1 pl-4 text-[12px] font-medium text-status-good break-keep">
            {SITE_CONTENT.matchingModal.step2.savingsBadgeSub
              .replace('{tradeType}', currentTradeType)
              .replace('{max}', formatWon(legalMaxWon))
              .replace('{rate}', legalCommission.ratePercentLabel)}
          </p>
        </div>
      </div>

      <OccupancySection form={form} guard={guard} />

      <MortgageSection form={form} guard={guard} />

      {/* 3) 입주일 선택 (요일 표시 완비) */}
      <div className="space-y-2">
        <label className="text-[12px] font-bold text-text-secondary block">
          {SITE_CONTENT.matchingModal.step2.moveInDateLabel}
        </label>
        <div className={`${SEGMENT_TRACK} grid-cols-3`}>
          {[
            { id: 'IMMEDIATE', label: SITE_CONTENT.matchingModal.step2.moveInImmediate },
            { id: 'NEGOTIABLE', label: SITE_CONTENT.matchingModal.step2.moveInNegotiable },
            { id: 'DATE', label: SITE_CONTENT.matchingModal.step2.moveInSpecificDate },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              // 세입자 낀 매매는 임대 만료 전 즉시 입주 불가
              disabled={isLeasedSale && item.id === 'IMMEDIATE'}
              aria-pressed={moveInType === item.id}
              onClick={() => setMoveInType(item.id as any)}
              className={`${SEGMENT_ITEM} text-[13px] font-bold ${
                isLeasedSale && item.id === 'IMMEDIATE'
                  ? 'border-transparent text-text-disabled cursor-not-allowed'
                  : `${segmentItemState(moveInType === item.id)} cursor-pointer`
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {moveInType === 'DATE' && (
          <div className="pt-1 space-y-2 animate-fade-in" data-field="MOVE_IN_DATE">
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className={`w-full h-12 px-4 rounded-xl bg-surface-subtle border border-border-default font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand cursor-pointer ${errorRing(guard.shown('MOVE_IN_DATE'))}`}
            />
            {moveInDate ? (
              <div className="px-3 py-2 rounded-xl bg-brand-subtle border border-brand-line flex items-center justify-between text-[12px]">
                <span className="font-bold text-text-secondary">지정 입주일:</span>
                <span className="font-extrabold text-brand flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatMoveInDateWithDay(moveInDate)}
                </span>
              </div>
            ) : guard.shown('MOVE_IN_DATE') ? (
              <FieldError show text={SITE_CONTENT.matchingModal.missing.MOVE_IN_DATE} />
            ) : (
              <p className="text-[12px] text-amber-600 font-medium px-1">
                * 입주 희망 날짜를 달력에서 선택해 주세요.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
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
          data-testid="modal-step2-next"
          onClick={() => guard.attempt(goNext)}
          className="flex-1 h-13 rounded-xl font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all bg-brand hover:bg-brand-hover text-white shadow-brand-glow cursor-pointer"
        >
          <span>{resumeShort ? SITE_CONTENT.matchingModal.resumeNextButton : SITE_CONTENT.matchingModal.step2.nextStepButton}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
