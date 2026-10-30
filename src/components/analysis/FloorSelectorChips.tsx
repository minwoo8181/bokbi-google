'use client';

import React from 'react';
import { FloorCategory, PyeongDetailStat, TradeType } from './types';
import { SITE_CONTENT } from '@/config/siteContent';
import { referenceOf } from '@/lib/market/floorBand';
import { formatPriceTenThousand } from '@/lib/utils';
import { FLOOR_CARD, floorCardState } from './segmentStyles';

interface FloorSelectorChipsProps {
  floorCategory: FloorCategory;
  pyeong: PyeongDetailStat;
  tradeType: TradeType;
  onSelectFloor: (category: FloorCategory) => void;
}

const FLOORS: FloorCategory[] = ['low', 'mid', 'high'];

/**
 * "평형·층 고르기" 카드의 아랫부분 (대표님 2026-10-29 캔버스 1번 "테두리 카드"):
 * 층 칸 세 개에는 층·가격만, 거래 수와 가장 최근 거래는 아래 한 줄로 (칸 안 "n건"은 뺌)
 */
export default function FloorSelectorChips({
  floorCategory,
  pyeong,
  tradeType,
  onSelectFloor,
}: FloorSelectorChipsProps) {
  const { floorSelector } = SITE_CONTENT.analysis;
  const selected = referenceOf(pyeong, tradeType, floorCategory);
  const band = floorSelector.bands[floorCategory];

  // 아래 한 줄: 고른 구간 거래 수 + 가장 최근 거래 (㎡당 환산이면 날짜·층이 없어 거래 수만)
  const parts: string[] = [];
  if (selected && selected.bandCount > 0) {
    parts.push(floorSelector.bandCountLine.replace('{band}', band.label).replace('{count}', String(selected.bandCount)));
  }
  if (selected && selected.date && selected.floor !== null) {
    parts.push(
      (selected.source === 'FLOOR' ? floorSelector.bandLine : floorSelector.bandLineOther)
        .replace('{date}', selected.date)
        .replace('{floor}', String(selected.floor))
        .replace('{price}', formatPriceTenThousand(selected.priceManwon)),
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {FLOORS.map((id) => {
          const isSelected = floorCategory === id;
          const b = floorSelector.bands[id];
          const ref = referenceOf(pyeong, tradeType, id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectFloor(id)}
              aria-pressed={isSelected}
              data-testid={`floor-chip-${id}`}
              className={`${FLOOR_CARD} min-h-16 ${floorCardState(isSelected)}`}
            >
              {/* 좁은 폭에선 "고층 / 15층 이상"처럼 이름과 범위 사이에서만 줄이 넘어간다 */}
              <span className={`block text-[12px] break-keep ${isSelected ? 'font-bold' : 'font-medium text-text-tertiary'}`}>
                {b.label} <span className="whitespace-nowrap">{b.range}</span>
              </span>
              {/* 칸이 좁아 "원"은 뺀다 (단위는 아래 복비 카드·고정 바에). 구간 거래가 0건이면 다른 층 가격을 칸에 쓰지 않는다 */}
              <span className="block text-[12px] min-[375px]:text-[13px] font-bold tabular-nums tracking-tight whitespace-nowrap">
                {ref && ref.bandCount > 0 ? formatPriceTenThousand(ref.priceManwon).replace(/\s*원$/, '') : floorSelector.chipNoTrade}
              </span>
            </button>
          );
        })}
      </div>

      {parts.length > 0 && (
        <p data-testid="floor-band-line" className="text-[12px] font-medium text-text-tertiary leading-normal tabular-nums break-keep text-pretty">
          {/* 줄은 항목 사이(" · ")에서만 넘어간다 */}
          {parts.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && ' · '}
              <span className="whitespace-nowrap">{p}</span>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
