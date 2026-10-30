'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { agreedRatioPct, feeForPrice, personalFeeScenarios, type AgreedFee } from '@/lib/deal/dealFee';
import { calculateLegalCommission } from '@/lib/commission';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerDeal.receipt;

/**
 * 합의 확인서 (대표님 2026-10-27: 영수증 모양 + "거래금액이 바뀌면 같은 비율로 다시 계산" 크게).
 * 집주인·중개사 거래 페이지가 같이 쓴다. 금액은 모두 dealFee.ts 계산 (손으로 적지 않음).
 * 아래 한 줄: 확정된 실제 거래금액 → 확인 대기 중인 금액 → 둘 다 없으면 내 집 숫자 예시 한 줄
 */
export default function AgreementReceipt({ agreed, priceManwon, pendingPriceManwon }: { agreed: AgreedFee; priceManwon: number | null; pendingPriceManwon: number | null }) {
  const legal = calculateLegalCommission(agreed.askingPriceManwon * 10_000, agreed.tradeType);
  const pct = agreedRatioPct(agreed);
  let foot: { left: string; fee: number } | null = null;
  if (priceManwon !== null && priceManwon !== agreed.askingPriceManwon) {
    foot = { left: fill(t.actual, { price: formatPriceTenThousand(priceManwon) }), fee: feeForPrice(agreed, priceManwon).feeWon };
  } else if (pendingPriceManwon !== null && pendingPriceManwon !== agreed.askingPriceManwon) {
    foot = { left: fill(t.pending, { price: formatPriceTenThousand(pendingPriceManwon) }), fee: feeForPrice(agreed, pendingPriceManwon).feeWon };
  } else if (priceManwon === null) {
    const lower = personalFeeScenarios(agreed).rows.find((r) => r.priceManwon < agreed.askingPriceManwon);
    if (lower) foot = { left: fill(t.example, { price: formatPriceTenThousand(lower.priceManwon) }), fee: lower.feeWon };
  }
  const row = 'flex items-baseline justify-between gap-3 py-1 text-[15px] tabular-nums';
  return (
    <section className="p-5 rounded-2xl bg-surface-card" data-testid="deal-receipt">
      <dl>
        <div className={row}>
          <dt className="font-medium text-text-secondary">{t.asking}</dt>
          <dd className="font-bold text-text-primary">{formatPriceTenThousand(agreed.askingPriceManwon)}</dd>
        </div>
        <div className={row}>
          <dt className="font-medium text-text-secondary">{fill(t.legalMax, { rate: legal.ratePercentLabel })}</dt>
          <dd className="font-bold text-text-primary">{formatWon(legal.maxWon)}</dd>
        </div>
        {pct !== null && (
          <div className={row}>
            <dt className="font-medium text-text-secondary">{t.ratio}</dt>
            <dd className="font-bold text-text-primary">{fill(t.ratioValue, { pct })}</dd>
          </div>
        )}
        {/* 굵기는 두 가지만: 이름 보통(medium) · 값과 강조 줄 굵게(bold), 크기는 14px 하나 (대표님 2026-10-27) */}
        <div className={row}>
          <dt className="font-bold text-text-primary">{t.fee}</dt>
          <dd className="font-bold text-text-primary" data-testid="deal-receipt-fee">{formatWon(agreed.commissionWon)}</dd>
        </div>
      </dl>
      <div className="my-3 border-t-2 border-dashed border-border-default" aria-hidden />
      <p className="text-[15px] font-bold text-brand break-keep text-pretty">{t.rule}</p>
      {foot && (
        <p className="mt-2 flex items-baseline justify-between gap-3 text-[15px] tabular-nums" data-testid="deal-receipt-foot">
          <span className="min-w-0 font-medium text-text-secondary break-keep">{foot.left}</span>
          <span className="shrink-0 font-bold text-text-primary">{fill(t.feeArrow, { fee: formatWon(foot.fee) })}</span>
        </p>
      )}
    </section>
  );
}
