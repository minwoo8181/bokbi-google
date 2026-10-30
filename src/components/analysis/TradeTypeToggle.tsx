'use client';

import React from 'react';
import { TradeType } from './types';
import { SITE_CONTENT } from '@/config/siteContent';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from './segmentStyles';

interface TradeTypeToggleProps {
  tradeType: TradeType;
  onChangeTradeType: (type: TradeType) => void;
}

/**
 * 매매/전세 작은 세그먼트 — "평형대 선택" 줄 오른쪽 (맨 위 줄이기 2026-10-27 대표님 승인).
 * 모양은 평형대·층수 구간과 같은 공통 세그먼트(segmentStyles.ts) (대표님: 디자인 통일).
 * 누르는 칸 높이는 44px 유지
 */
export default function TradeTypeToggle({
  tradeType,
  onChangeTradeType,
}: TradeTypeToggleProps) {
  const { tradeType: ttContent } = SITE_CONTENT.analysis;
  const options: { id: TradeType; label: string }[] = [
    { id: '매매', label: ttContent.sale },
    { id: '전세', label: ttContent.jeonse },
  ];

  return (
    <div
      role="group"
      aria-label={`${ttContent.sale}/${ttContent.jeonse}`}
      className={`${SEGMENT_TRACK} grid-cols-2`}
    >
      {options.map((o) => {
        const isSelected = tradeType === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChangeTradeType(o.id)}
            className={`${SEGMENT_ITEM} ${segmentItemState(isSelected)} px-4 text-[13px] font-extrabold`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
