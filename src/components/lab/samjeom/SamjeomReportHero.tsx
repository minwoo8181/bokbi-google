'use client';

import React from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import KeepFeeReportHero from '@/components/lab/keeps/KeepFeeReportHero';
import type { FloorCategory, PyeongDetailStat, RecommendationView, ReferencePrice, TradeType } from '@/components/analysis/types';

const t = LAB_CONTENT.samjeom.analysis;
const short = (name: string) => name.replace(/\s*\(.*\)$/, '');

/** 삼쩜삼 분석 맨 위: 킵 K1 머리 띠 + 뒤로·공유 + 조건 칩(누르면 내 집 조건 시트). 삼쩜삼 · 삼쩜삼 심화 공용 */
export default function SamjeomReportHero(p: {
  aptName: string;
  selectedPyeong: PyeongDetailStat;
  floorCategory: FloorCategory;
  tradeType: TradeType;
  reference: ReferencePrice | null;
  recommendation: RecommendationView | null;
  totalCommissionWon: number;
  legalMaxWon: number;
  onBack: () => void;
  onShare: () => void;
  onOpenCondition: () => void;
}) {
  const r = p.recommendation;
  const band = SITE_CONTENT.analysis.floorSelector.bands[p.floorCategory].label;
  const chips = [
    { key: 'pyeong', value: short(p.selectedPyeong.name) },
    { key: 'floor', value: band },
    { key: 'trade', value: p.tradeType },
  ];
  return (
    <KeepFeeReportHero
      top={
        <div className="h-14 -mx-2 flex items-center justify-between">
          <button type="button" onClick={p.onBack} aria-label="뒤로가기" className="w-11 h-11 flex items-center justify-center text-text-primary">
            <ArrowLeft className="w-6 h-6" />
          </button>
          {/* 보이는 알약은 32px, 누르는 영역은 44px */}
          <button type="button" onClick={p.onShare} className="h-11 px-2 flex items-center">
            <span className="h-8 px-3 rounded-lg border border-border-default bg-surface-card text-[12px] font-medium text-text-secondary flex items-center">
              {t.share}
            </span>
          </button>
        </div>
      }
      contextLine={
        <>
          <p className="text-[15px] font-medium text-text-secondary truncate">{p.aptName.replace(/\s*\([^)]*\)$/, '')}</p>
          {/* 조건 칩: 금액이 어떤 집 기준인지 바로 위에서 보이고 바로 바꾼다 */}
          <div className="mt-2 flex flex-wrap gap-2" data-testid="samjeom-condition-chips">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={p.onOpenCondition}
                aria-label={t.conditionOpen.replace('{value}', c.value)}
                className="h-11 pl-4 pr-3 rounded-full bg-surface-card border border-border-default text-[13px] font-bold text-text-primary inline-flex items-center gap-1"
              >
                {c.value}
                <ChevronDown className="w-4 h-4 text-text-tertiary" aria-hidden />
              </button>
            ))}
          </div>
        </>
      }
      totalWon={p.totalCommissionWon}
      legalMaxWon={p.legalMaxWon}
      reference={p.reference}
      discountPct={r ? Math.round(r.discount * 100) : null}
      tradeType={p.tradeType}
    />
  );
}
