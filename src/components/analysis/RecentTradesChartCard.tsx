'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { FloorCategory, FloorCalculationResult } from './types';

interface RecentTradesChartCardProps {
  calculation: FloorCalculationResult;
  floorCategory: FloorCategory;
}

export default function RecentTradesChartCard({
  calculation,
  floorCategory,
}: RecentTradesChartCardProps) {
  const {
    floorLabel,
    priceMinTenThousand,
    priceMaxTenThousand,
    adjustedAvgPriceTenThousand,
    priceAdjustmentWon,
    recommendRateText,
    recommendedCommissionWon,
    savedWon,
    legalCommissionWon,
  } = calculation;

  return (
    <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-tertiary">
            {floorLabel} 최근 실거래 시세
          </span>
          <span className="text-[12px] font-bold text-text-secondary bg-surface-subtle px-2 py-1 rounded">
            국토부 최근 6개월
          </span>
        </div>

        {/* 거대한 볼드 브랜드 금액 */}
        <div className="text-[26px] font-extrabold text-brand tracking-[-0.03em] tabular-nums mt-1 leading-tight">
          {formatPriceTenThousand(priceMinTenThousand)} ~ {formatPriceTenThousand(priceMaxTenThousand)}
        </div>
        <div className="text-[12px] font-medium text-text-tertiary mt-1">
          평균 실거래가: <strong className="text-text-primary font-bold">{formatPriceTenThousand(adjustedAvgPriceTenThousand)}</strong>
          {priceAdjustmentWon !== 0 && (
            <span className={priceAdjustmentWon > 0 ? 'text-brand ml-2' : 'text-[#E54646] ml-2'}>
              ({priceAdjustmentWon > 0 ? `+${Math.abs(priceAdjustmentWon / 10000)}억 로얄층 반영` : `-${Math.abs(priceAdjustmentWon / 10000)}억 저층 반영`})
            </span>
          )}
        </div>
      </div>

      {/* 헤이딜러 스타일 산점도 & 추세선 시각화 차트 */}
      <div className="pt-2 border-t border-border-light">
        <div className="flex items-center justify-between text-[12px] text-text-tertiary mb-2 font-medium">
          <span>최근 실거래 추이 및 내 집 위치</span>
          <span className="text-brand font-bold">● 내 아파트 선택층</span>
        </div>

        <div className="h-32 bg-surface-subtle rounded-xl border border-border-default p-3 flex flex-col justify-between relative overflow-hidden">
          {/* 차트 가이드 라인 */}
          <div className="border-b border-dashed border-border-default w-full" />
          <div className="border-b border-dashed border-border-default w-full" />
          <div className="border-b border-dashed border-border-default w-full" />

          {/* 추세선 (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path
              d="M 5,65 Q 35,50 65,45 T 95,30"
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* 실거래 점들 (회색) */}
            <circle cx="20" cy="58" r="3" fill="#C9CDD2" />
            <circle cx="35" cy="52" r="3" fill="#C9CDD2" />
            <circle cx="50" cy="48" r="3" fill="#C9CDD2" />
            <circle cx="80" cy="35" r="3" fill="#C9CDD2" />

            {/* 현재 선택된 층수 강조 핀 (브랜드 컬러 점) */}
            <circle
              cx={floorCategory === 'low' ? '25' : floorCategory === 'mid' ? '60' : '88'}
              cy={floorCategory === 'low' ? '62' : floorCategory === 'mid' ? '46' : '30'}
              r="5"
              fill="var(--brand-primary)"
            />
          </svg>

          <div className="flex justify-between text-[12px] text-text-tertiary font-semibold pt-1 z-10">
            <span>5개월 전</span>
            <span>3개월 전</span>
            <span>최근 실거래</span>
          </div>
        </div>
      </div>

      {/* AI 추천 적정 복비 카드 */}
      <div className="p-4 rounded-xl bg-brand-light border border-brand-line space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-brand flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI 추천 적정 복비
          </span>
          <span className="text-[12px] font-bold text-brand bg-surface-card px-2 py-1 rounded-full shadow-2xs">
            {recommendRateText} 기준
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-[26px] font-extrabold text-text-primary tracking-tight tabular-nums">
            {formatWon(recommendedCommissionWon)}
          </span>
          <span className="text-[13px] font-extrabold text-brand">
            약 {formatWon(savedWon)} 절약!
          </span>
        </div>

        <div className="flex items-center justify-between text-[12px] text-text-secondary font-medium pt-1 border-t border-brand-light">
          <span>법정 최고액 (0.50%): {formatWon(legalCommissionWon)}</span>
          <span className="font-bold text-brand">다산동 중개사 수락률 85% 이상</span>
        </div>
      </div>
    </section>
  );
}
