'use client';

/** 완료: 영수증(법정 상한 − 할인 + 옵션 = 내가 제안한 복비) + 진행 순서 + 취소 안내 (2026-10-27 대표님 시안) */
import { CheckCircle2 } from 'lucide-react';
import { formatWon, formatPriceTenThousand } from '@/lib/utils';
import { feeReceipt } from '@/lib/requests/feeReceipt';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MatchingForm } from './useMatchingForm';

function ReceiptRow({ label, value, tone = 'text-text-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1 text-[13px]">
      <span className="font-medium text-text-secondary">{label}</span>
      <span className={`font-bold tabular-nums whitespace-nowrap ${tone}`}>{value}</span>
    </div>
  );
}

export default function StepComplete({ form }: { form: MatchingForm }) {
  const { onClose, apartment, router, currentTradeType, currentPyeong, typeSuffix, askingPriceTenThousand, quote, legalCommission, requestNo } = form;
  const step6 = SITE_CONTENT.matchingModal.step6;
  const r = feeReceipt(quote);

  return (
    <div className="space-y-5 py-1" data-testid="modal-step-6">
      <div className="text-center space-y-2">
        <div className="w-13 h-13 rounded-full bg-status-good-light text-[var(--status-good-strong)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight">{step6.title}</h3>
        <p className="text-[15px] font-medium text-text-secondary">{step6.subTitle}</p>
        {requestNo && (
          <p data-testid="receipt-number" className="text-[12px] font-medium text-text-tertiary tabular-nums">
            {step6.receipt.number.replace('{no}', requestNo)}
          </p>
        )}
      </div>

      <div data-testid="matching-receipt-card" className="px-4 py-4 rounded-2xl border border-border-default bg-surface-card">
        <div className="text-[15px] font-bold text-text-primary break-keep mb-2">
          {apartment.apt_name} {currentPyeong.name}{typeSuffix} · {currentTradeType}
        </div>
        <ReceiptRow
          label={step6.receipt.askingPrice.replace('{tradeType}', currentTradeType)}
          value={formatPriceTenThousand(askingPriceTenThousand)}
        />
        <ReceiptRow
          label={step6.receipt.legalMax.replace('{rate}', legalCommission.ratePercentLabel)}
          value={formatWon(r.legalMaxWon)}
        />
        <ReceiptRow
          label={step6.receipt.discount.replace('{pct}', String(r.discountPct))}
          value={`− ${formatWon(r.discountWon)}`}
          tone="text-status-good"
        />
        <ReceiptRow
          label={step6.receipt.bonus}
          value={r.bonusWon > 0 ? `+ ${formatWon(r.bonusWon)}` : step6.receipt.bonusNone}
          tone={r.bonusWon > 0 ? 'text-text-primary' : 'text-text-tertiary'}
        />
        <div className="my-2 border-t border-dashed border-border-default" aria-hidden />
        <div className="flex justify-between items-baseline gap-3">
          <span className="text-[15px] font-bold text-text-primary">{step6.receipt.total}</span>
          <span data-testid="receipt-total" className="text-[20px] font-extrabold text-brand tabular-nums whitespace-nowrap">
            {formatWon(r.totalWon)}
          </span>
        </div>
        <p className="text-right text-[12px] font-medium text-text-tertiary mt-1">{step6.receipt.vat}</p>
      </div>

      <div data-testid="matching-next-steps">
        <p className="text-[13px] font-bold text-text-secondary mb-3">{step6.timelineTitle}</p>
        <ol className="space-y-3">
          {step6.timelineSteps.map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-light text-brand-hover text-[12px] font-extrabold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-[15px] font-medium text-text-primary break-keep">{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] font-medium text-text-tertiary break-keep" data-testid="complete-cancel-note">
          {step6.cancelNote}
        </p>
      </div>

      {/* 하단 액션 버튼 2종 */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          data-testid="modal-complete-home"
          onClick={() => router.push('/')}
          className="flex-1 h-12 rounded-xl bg-surface-subtle text-text-secondary font-bold text-[15px] hover:bg-surface-subtle active:scale-95 transition-all cursor-pointer"
        >
          {step6.homeButtonText}
        </button>
        <button
          type="button"
          data-testid="modal-complete-my-requests"
          onClick={() => {
            onClose({ completed: true });
            router.push('/my-requests');
          }}
          className="flex-1 h-12 rounded-xl bg-brand text-white font-extrabold text-[15px] hover:bg-brand-hover shadow-md shadow-brand-glow active:scale-95 transition-all cursor-pointer"
        >
          {step6.myRequestsButtonText}
        </button>
      </div>
    </div>
  );
}
