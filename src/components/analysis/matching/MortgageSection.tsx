'use client';

/** 2단계 근저당(융자): 여부 필수, 있으면 처리 계획 필수·채권최고액 선택 */
import { formatPriceTenThousand } from '@/lib/utils';
import { mortgagePlanLabel, type MortgagePlan, type MortgageStatus } from '@/lib/market/mortgage';
import type { MatchingForm } from './useMatchingForm';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '../segmentStyles';
import { FieldError, errorRing, type MissingGuard } from './missingGuard';

export default function MortgageSection({ form, guard }: { form: MatchingForm; guard: MissingGuard }) {
  const { currentTradeType, mortgageCopy, mortgageStatus, setMortgageStatus, mortgageAmountInput, setMortgageAmountInput, mortgagePlan, setMortgagePlan, mortgageInput } = form;

  return (
    <div className="space-y-2" data-testid="mortgage-section" data-field="MORTGAGE_STATUS">
      <label className="text-[12px] font-bold text-text-secondary block">{mortgageCopy.label} *</label>
      <div className={`${SEGMENT_TRACK} grid-cols-2 ${errorRing(guard.shown('MORTGAGE_STATUS'))}`}>
        {([
          { id: 'NONE', label: mortgageCopy.none },
          { id: 'EXISTS', label: mortgageCopy.exists },
        ] as { id: MortgageStatus; label: string }[]).map((m) => (
          <button
            key={m.id}
            type="button"
            data-testid={`btn-mortgage-${m.id}`}
            aria-pressed={mortgageStatus === m.id}
            onClick={() => setMortgageStatus(m.id)}
            className={`${SEGMENT_ITEM} ${segmentItemState(mortgageStatus === m.id)} text-[13px] font-bold cursor-pointer`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <FieldError show={guard.shown('MORTGAGE_STATUS')} text={mortgageCopy.errors.STATUS} />
      {mortgageStatus === 'EXISTS' && (
        <div className="p-4 rounded-2xl bg-surface-subtle border border-brand-line space-y-3 animate-slide-up">
          <div>
            <label className="text-[12px] font-bold text-text-secondary block mb-1">{mortgageCopy.amountLabel}</label>
            <div className="h-11 rounded-xl bg-surface-card border border-border-default px-3 flex items-center focus-within:border-brand">
              <input
                type="number"
                inputMode="numeric"
                data-testid="input-mortgage-amount"
                value={mortgageAmountInput}
                onChange={(e) => setMortgageAmountInput(e.target.value)}
                placeholder={mortgageCopy.amountPlaceholder}
                className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none"
              />
              <span className="text-[12px] font-bold text-text-tertiary ml-1 whitespace-nowrap">{mortgageCopy.unit}</span>
            </div>
            {mortgageInput.maxClaimManwon > 0 && (
              <p className="text-[12px] font-bold text-brand mt-1 px-1">= {formatPriceTenThousand(mortgageInput.maxClaimManwon)}</p>
            )}
          </div>
          <div data-field="MORTGAGE_PLAN">
            <label className="text-[12px] font-bold text-text-secondary block mb-1">{mortgageCopy.planLabel} *</label>
            <div className={`${SEGMENT_TRACK} grid-cols-2 ${errorRing(guard.shown('MORTGAGE_PLAN'))}`}>
              {(['REPAY_AT_CLOSING', 'KEEP'] as MortgagePlan[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`btn-mortgage-plan-${p}`}
                  aria-pressed={mortgagePlan === p}
                  onClick={() => setMortgagePlan(p)}
                  className={`${SEGMENT_ITEM} ${segmentItemState(mortgagePlan === p)} px-2 text-[13px] font-bold cursor-pointer`}
                >
                  {mortgagePlanLabel(currentTradeType, p)}
                </button>
              ))}
            </div>
            {currentTradeType === '전세' && mortgagePlan === 'KEEP' && (
              <p className="text-[12px] font-medium text-text-tertiary mt-2 leading-snug break-keep">{mortgageCopy.jeonseKeepHint}</p>
            )}
            <FieldError show={guard.shown('MORTGAGE_PLAN')} text={mortgageCopy.errors.PLAN} />
          </div>
        </div>
      )}
    </div>
  );
}
