'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import TradeTypeToggle from '@/components/analysis/TradeTypeToggle';
import FloorSelectorChips from '@/components/analysis/FloorSelectorChips';
import ActionSheet from '@/components/my-requests/ActionSheet';
import type { FloorCategory, PyeongDetailStat, TradeType } from '@/components/analysis/types';

const t = LAB_CONTENT.samjeom.analysis;
const short = (name: string) => name.replace(/\s*\(.*\)$/, '');

/** design-lab 레퍼런스 분석 공통 "내 집 조건" 시트: 거래 · 평형 · 층 (바꾸면 위 금액이 바로 바뀐다) */
export default function LabConditionSheet(p: {
  open: boolean;
  onClose: () => void;
  testId: string;
  pyeongList: PyeongDetailStat[];
  selectedPyeong: PyeongDetailStat;
  onSelectPyeong: (id: string) => void;
  tradeType: TradeType;
  onChangeTradeType: (t: TradeType) => void;
  floorCategory: FloorCategory;
  onSelectFloor: (c: FloorCategory) => void;
}) {
  return (
    <ActionSheet
      open={p.open}
      title={t.conditionTitle}
      cancelLabel={SITE_CONTENT.common.close}
      confirmLabel={t.conditionDone}
      onConfirm={p.onClose}
      onCancel={p.onClose}
      testId={p.testId}
    >
      <div className="space-y-5" data-testid="pyeong-floor-card">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-bold text-text-primary">{t.tradeLabel}</span>
          <TradeTypeToggle tradeType={p.tradeType} onChangeTradeType={p.onChangeTradeType} />
        </div>
        <div>
          <p className="text-[15px] font-bold text-text-primary">{t.pyeongLabel}</p>
          <div role="radiogroup" aria-label={t.pyeongLabel} className="mt-2 grid grid-cols-4 gap-2">
            {p.pyeongList.map((py) => {
              const on = py.id === p.selectedPyeong.id;
              return (
                <button
                  key={py.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => p.onSelectPyeong(py.id)}
                  className={`h-11 rounded-xl border text-[15px] ${
                    on ? 'bg-brand-light border-brand text-brand-hover font-bold' : 'bg-surface-card border-border-default text-text-secondary'
                  }`}
                >
                  {short(py.name)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[15px] font-bold text-text-primary">{t.floorLabel}</p>
          <div className="mt-2">
            <FloorSelectorChips floorCategory={p.floorCategory} pyeong={p.selectedPyeong} tradeType={p.tradeType} onSelectFloor={p.onSelectFloor} />
          </div>
        </div>
      </div>
    </ActionSheet>
  );
}
