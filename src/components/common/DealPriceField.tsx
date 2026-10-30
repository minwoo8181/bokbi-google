'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { checkDealPrice, feeForPrice, type AgreedFee } from '@/lib/deal/dealFee';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.dealPrice;

interface DealPriceFieldProps {
  agreed: AgreedFee;
  /** 만 원 (빈칸이면 null) */
  value: number | null;
  onChange: (priceManwon: number | null) => void;
}

/**
 * 실제 거래금액 입력 + 다시 계산한 복비 미리보기 (중개사 가계약·계약 알림, 집주인 직접 알림에서 같이 씀).
 * 복비 = 실제 거래금액의 법정 상한 × 합의 비율 (lib/deal/dealFee.ts)
 */
export default function DealPriceField({ agreed, value, onChange }: DealPriceFieldProps) {
  const reject = checkDealPrice(value, agreed.askingPriceManwon);
  const fee = value !== null && !reject ? feeForPrice(agreed, value) : null;
  return (
    <div className="mt-4" data-testid="deal-price">
      <label className="block text-[13px] font-bold text-text-secondary" htmlFor="deal-price-input">
        {t.label}
      </label>
      <div className="mt-2 flex items-center gap-2 h-13 px-4 rounded-xl bg-surface-subtle focus-within:ring-2 focus-within:ring-brand">
        <input
          id="deal-price-input"
          inputMode="numeric"
          value={value === null ? '' : value.toLocaleString('ko-KR')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
            onChange(digits ? Number(digits) : null);
          }}
          className="min-w-0 flex-1 bg-transparent text-[17px] font-bold text-text-primary tabular-nums outline-none"
        />
        <span className="shrink-0 text-[15px] font-bold text-text-tertiary">{t.unit}</span>
      </div>
      <p className="mt-1 text-[12px] font-medium text-text-tertiary">
        {value !== null && !reject ? formatPriceTenThousand(value) : fill(t.asking, { price: formatPriceTenThousand(agreed.askingPriceManwon) })}
      </p>
      {reject && value !== null ? (
        <p className="mt-1 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert">
          {t.errors[reject]}
        </p>
      ) : fee ? (
        <p className="mt-2 p-3 rounded-xl bg-brand-light text-[13px] font-bold text-brand-hover break-keep tabular-nums" data-testid="deal-price-preview">
          {fee.unchanged
            ? fill(t.same, { fee: formatWon(fee.feeWon) })
            : fill(t.preview, { max: formatWon(fee.legalMaxWon), rate: fee.rateLabel, pct: fee.ratioPct, fee: formatWon(fee.feeWon) })}
        </p>
      ) : null}
    </div>
  );
}
