'use client';

import React from 'react';
import { Building2, Info } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { RecommendationView, TradeType } from './types';

interface MarketDiagnosticCardProps {
  tradeType: TradeType;
  recommendation: RecommendationView | null;
  observedAt: string;
  region: { name: string; saleSupplyDemand: number | null; ym: string | null };
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
const shortDate = (iso: string) => iso.slice(2).replace(/-/g, '.');

/** 분석 엔진 판정을 그대로 보여주는 시장 진단 카드 (근거 없는 숫자는 표시하지 않는다) */
export default function MarketDiagnosticCard({ tradeType, recommendation: r, observedAt, region }: MarketDiagnosticCardProps) {
  const content = SITE_CONTENT.analysis.marketDiagnostic;
  if (!r) return null;

  const metrics = [
    { label: content.metricListings, value: `${r.listings}건` },
    { label: content.metricDeals, value: `${r.recentDeals}건` },
    {
      label: content.metricInventory,
      value: r.monthsOfInventory === null ? '—' : `${r.monthsOfInventory.toFixed(1)}${content.inventoryUnit}`,
    },
  ];

  return (
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-text-primary tracking-tight flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand" />
          {content.title.replace('{tradeType}', tradeType)}
        </h2>
        <span className="text-[12px] font-bold text-brand-hover bg-brand-light px-3 py-1 rounded-full">
          {content.gradeLabels[r.grade]}
        </span>
      </div>

      <p className="text-[13px] text-text-secondary leading-relaxed break-keep">{content.gradeDesc[r.grade]}</p>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="p-3 rounded-xl bg-surface-subtle">
            <div className="text-[12px] font-semibold text-text-tertiary">{m.label}</div>
            <div className="text-[17px] font-extrabold text-text-primary mt-1 tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>

      {r.momentum !== null && (
        <div className="flex items-center justify-between text-[13px] border-t border-border-light pt-3">
          <span className="text-text-tertiary">{content.momentumLabel}</span>
          <span className="font-bold text-text-primary tabular-nums">{pct(r.momentum)}</span>
        </div>
      )}

      <div className="space-y-1 text-[12px] text-text-tertiary leading-relaxed break-keep">
        {tradeType === '전세' && <p>{content.jeonseNote}</p>}
        {region.saleSupplyDemand !== null && region.ym && (
          <p>
            {content.regionContext
              .replace('{region}', region.name.replace('>', ' '))
              .replace('{value}', region.saleSupplyDemand.toFixed(1))
              .replace('{ym}', `${region.ym.slice(0, 4)}.${region.ym.slice(4)}`)}
          </p>
        )}
        <p className="flex items-start gap-1">
          <Info className="w-3.5 h-3.5 mt-1 flex-shrink-0" aria-hidden />
          {content.basisNote
            .replace('{start}', shortDate(r.windowStart))
            .replace('{end}', shortDate(r.windowEnd))
            .replace('{observedAt}', shortDate(observedAt))}
        </p>
      </div>
    </section>
  );
}
