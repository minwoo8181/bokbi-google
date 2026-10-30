'use client';

import React from 'react';
import type { ComplexInfo } from '@/lib/market/repository';
import type { ApartmentStat } from '@/types';
import type { ThemePreset } from '@/theme/themeConfig';
import type { FloorCategory, PyeongDetailStat, RecommendationView, ReferencePrice, TradeType } from '@/components/analysis/types';
import SamjeomAnalysisBody from './samjeom/SamjeomAnalysisBody';
import Samjeom2AnalysisBody from './samjeom2/Samjeom2AnalysisBody';
import HeydealerAnalysisBody from './heydealer/HeydealerAnalysisBody';

export interface LabAnalysisProps {
  apartment: ApartmentStat;
  complexInfo: ComplexInfo | null;
  pyeongList: PyeongDetailStat[];
  selectedPyeong: PyeongDetailStat;
  onSelectPyeong: (id: string) => void;
  tradeType: TradeType;
  onChangeTradeType: (t: TradeType) => void;
  floorCategory: FloorCategory;
  onSelectFloor: (c: FloorCategory) => void;
  reference: ReferencePrice | null;
  recommendation: RecommendationView | null;
  dealPriceWon: number;
  totalCommissionWon: number;
  legalMaxWon: number;
  onBack: () => void;
  onShare: () => void;
  onOpenModal: () => void;
  sections: { chart: React.ReactNode; reason: React.ReactNode; poll: React.ReactNode };
}

/** design-lab: 레퍼런스 테마별 분석 화면 고르기 (계산은 AnalysisClient, 여기는 어느 배치를 쓸지만) */
export default function LabAnalysisBody({ theme, ...p }: LabAnalysisProps & { theme: Exclude<ThemePreset, 'toss'> }) {
  if (theme === 'samjeom') return <SamjeomAnalysisBody {...p} />;
  if (theme === 'samjeom2') return <Samjeom2AnalysisBody {...p} />;
  return <HeydealerAnalysisBody {...p} />;
}
