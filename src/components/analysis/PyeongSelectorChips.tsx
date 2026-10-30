'use client';

import React from 'react';
import { PyeongDetailStat } from './types';
import { SITE_CONTENT } from '@/config/siteContent';
import { FLOOR_CARD, floorCardState } from './segmentStyles';

interface PyeongSelectorChipsProps {
  pyeongList: PyeongDetailStat[];
  selectedPyeongId: string;
  onSelectPyeong: (id: string) => void;
  /** 제목 줄 오른쪽 (매매/전세 작은 탭) */
  headerRight?: React.ReactNode;
}

/**
 * "평형·층 고르기" 카드의 윗부분: 제목 + 매매/전세 + 평형 칸 (대표님 2026-10-29 캔버스 1번 "테두리 카드").
 * 칸마다 얇은 테두리, 고른 칸만 파란 테두리 + 연파랑 (층 칸과 같은 모양 FLOOR_CARD)
 */
export default function PyeongSelectorChips({
  pyeongList,
  selectedPyeongId,
  onSelectPyeong,
  headerRight,
}: PyeongSelectorChipsProps) {
  const { pyeongSelector } = SITE_CONTENT.analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold text-text-primary">{pyeongSelector.title}</h2>
        {headerRight}
      </div>

      <div className={`grid gap-2 ${
        pyeongList.length === 1 ? 'grid-cols-1' :
        pyeongList.length === 2 ? 'grid-cols-2' :
        pyeongList.length === 3 ? 'grid-cols-3' : 'grid-cols-4'
      }`}>
        {pyeongList.map((p) => {
          const isSelected = selectedPyeongId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPyeong(p.id)}
              aria-pressed={isSelected}
              // 가격은 층 칸에서만 보여준다 (평형마다 같은 값이 나와 버그로 오해, 대표님 승인 2026-10-24)
              className={`${FLOOR_CARD} min-h-14 ${floorCardState(isSelected)}`}
            >
              <span className="block text-[15px] font-bold">{p.name.split(' ')[0]}</span>
              <span className={`block text-[12px] ${isSelected ? 'font-bold' : 'font-medium text-text-tertiary'}`}>
                {Math.round(p.exclusiveArea)}㎡
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
