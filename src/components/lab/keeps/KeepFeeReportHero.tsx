import React from 'react';
import { ReceiptText } from 'lucide-react';
import { LAB_CONTENT } from '@/config/labContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import type { ReferencePrice, TradeType } from '@/components/analysis/types';
import ReportRow from './ReportRow';

const t = LAB_CONTENT.keeps.feeReport;

/**
 * 🔖 킵 K1 (2026-10-30, 출처 삼쩜삼 리포트): 분석 머리 띠 + 근거 목록.
 * 연파랑 띠 위 맥락 한 줄 → "적정 복비는 / {금액}이에요" 두 줄(금액만 파랑) → 기준 실거래 한 줄 → 아이콘,
 * 아래 흰 목록(최근 실거래 · 법정 상한 · 추천 할인 · 적정 복비). top = 띠 맨 위 줄(뒤로·공유 등)
 */
export default function KeepFeeReportHero({
  top,
  contextLine,
  totalWon,
  legalMaxWon,
  reference: ref,
  discountPct,
  tradeType,
}: {
  top?: React.ReactNode;
  /** 띠 맨 위 맥락 줄. 글자면 회색 한 줄, 요소면 그대로 (예: 조건 칩) */
  contextLine: React.ReactNode;
  totalWon: number;
  legalMaxWon: number;
  reference: ReferencePrice | null;
  discountPct: number | null;
  tradeType: TradeType;
}) {
  const when = ref?.date
    ? t.when.replace('{date}', ref.date).replace('{floor}', ref.floor ? t.floorSuffix.replace('{n}', String(ref.floor)) : '')
    : '';
  return (
    <>
      <section className="bg-brand-light px-5 pb-8" data-keep="K1">
        {top}
        {typeof contextLine === 'string' ? (
          <p className="mt-2 text-[15px] font-medium text-text-secondary">{contextLine}</p>
        ) : (
          <div className="mt-2">{contextLine}</div>
        )}
        <h1 className="mt-2 text-[26px] font-bold text-text-primary leading-[1.35]">
          {t.heroLead}
          <br />
          <span className="text-brand tabular-nums">{formatWon(totalWon)}</span>
          {t.heroTail}
        </h1>
        {ref && (
          <p className="mt-3 text-[13px] text-text-tertiary">
            {t.heroBasis.replace('{deal}', formatPriceTenThousand(ref.priceManwon)).replace('{when}', when)}
          </p>
        )}
        <div className="mt-6 flex justify-end" aria-hidden>
          <span className="w-16 h-16 rounded-full bg-surface-card flex items-center justify-center">
            <ReceiptText className="w-8 h-8 text-brand" />
          </span>
        </div>
      </section>
      <ul className="bg-surface-card px-5 py-2 divide-y divide-border-light">
        {ref && <ReportRow label={t.rows.deal} sub={ref.date ?? undefined} value={formatPriceTenThousand(ref.priceManwon)} />}
        <ReportRow label={t.rows.legal} sub={t.rows.legalSub.replace('{tradeType}', tradeType)} value={formatWon(legalMaxWon)} />
        {discountPct !== null && <ReportRow label={t.rows.discount} sub={t.rows.discountSub} value={`${discountPct}%`} />}
        <ReportRow label={t.rows.fee} value={formatWon(totalWon)} strong />
      </ul>
    </>
  );
}
