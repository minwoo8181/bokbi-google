'use client';

import React from 'react';
import { HandCoins, Check } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatWon } from '@/lib/utils';
import type { TradeType } from './types';

interface BrokerPayoutCardProps {
  tradeType: TradeType;
  /** 중개사가 받는 금액 = 제안 복비 + 추가 보수 (법정 상한 하드캡 적용 후, 원) */
  payoutWon: number;
  /** 그중 집주인이 더한 추가 보수 (원) */
  bonusWon: number;
  /** 다산동 최근 6개월 거래 1건당 법정 상한 보수 중위값과 그 표본 수 */
  reference: { feeWon: number; deals: number };
}

/**
 * 시장 진단 카드 대체 (재설계안 6장 ①): 내 제안이 중개사에게 어떻게 보이는지 같은 숫자로 보여준다.
 * 비교 기준은 실제 받은 보수가 아니라 법정 상한이라는 점을 출처에 밝힌다.
 */
export default function BrokerPayoutCard({ tradeType, payoutWon, bonusWon, reference }: BrokerPayoutCardProps) {
  const content = SITE_CONTENT.analysis.brokerPayout;
  if (reference.feeWon <= 0) return null;

  const ratio = payoutWon / reference.feeWon;
  const barPct = Math.min(100, ratio * 100);

  return (
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-3">
      <div className="space-y-1">
        <h2 className="text-[15px] font-extrabold text-text-primary tracking-tight flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-brand" aria-hidden />
          {content.title}
        </h2>
        <p className="text-[12px] text-text-tertiary break-keep">{content.desc}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span className="text-[26px] font-extrabold text-brand tabular-nums tracking-tight">{formatWon(payoutWon)}</span>
          {bonusWon > 0 && (
            <span className="text-[12px] font-bold text-brand-hover bg-brand-light px-2 py-1 rounded-full">
              {content.bonusIncluded.replace('{amount}', formatWon(bonusWon))}
            </span>
          )}
        </div>
        {/* 기준선(100%) 대비 막대. 기준을 넘으면 꽉 찬다 */}
        <div className="h-2 rounded-full bg-border-default overflow-hidden" aria-hidden>
          <div className="h-full rounded-full bg-brand" style={{ width: `${barPct}%` }} />
        </div>
        <p className="text-[12px] text-text-secondary tabular-nums">
          {content.compareText.replace('{ref}', formatWon(reference.feeWon)).replace('{pct}', String(Math.round(ratio * 100)))}
        </p>
        {bonusWon === 0 && <p className="text-[12px] text-text-tertiary break-keep">{content.bonusHint}</p>}
      </div>

      <ul className="grid gap-2 pt-2 border-t border-border-light">
        {content.points.map((p) => (
          <li key={p} className="flex items-center gap-2 text-[12px] font-semibold text-text-primary">
            <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" aria-hidden />
            {p}
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-text-tertiary leading-snug break-keep">
        {content.basisNote.replace('{kind}', content.kindLabel[tradeType]).replace('{deals}', reference.deals.toLocaleString())}
      </p>
    </section>
  );
}
