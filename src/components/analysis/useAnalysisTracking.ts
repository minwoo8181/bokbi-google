'use client';

import { useEffect, useRef } from 'react';
import { discountPctOf } from '@/lib/analytics/derive';
import { track } from '@/lib/analytics/store';
import type { TradeType } from './types';

/** 복비 조절을 멈춘 뒤 이만큼 지나면 한 번 기록 (끌 때마다 남기지 않게) */
const FEE_SETTLE_MS = 1500;

/**
 * 분석 화면 행동 기록 (A7): 단지·평형·거래 유형 조합마다 analysis_view 한 번(홈 "복비 계산 n회"),
 * 추천과 다른 복비로 바꾸면 멈춘 뒤 fee_adjust 한 번 (추천·선택 할인율, 법정 상한 대비 %)
 */
export function useAnalysisTracking(input: { complexId: string; pyeongId: string; tradeType: TradeType; recommendedWon: number; chosenWon: number; legalMaxWon: number }) {
  const { complexId, pyeongId, tradeType, recommendedWon, chosenWon, legalMaxWon } = input;
  const viewed = useRef(new Set<string>());
  useEffect(() => {
    const key = `${complexId}|${pyeongId}|${tradeType}`;
    if (viewed.current.has(key)) return;
    viewed.current.add(key);
    track('analysis_view', { complexId, pyeong: pyeongId, tradeType: tradeType === '전세' ? 'JEONSE' : 'SALE' });
  }, [complexId, pyeongId, tradeType]);

  useEffect(() => {
    if (chosenWon === recommendedWon) return;
    const recommendedPct = discountPctOf(recommendedWon, legalMaxWon);
    const chosenPct = discountPctOf(chosenWon, legalMaxWon);
    if (recommendedPct === null || chosenPct === null) return;
    const timer = setTimeout(() => track('fee_adjust', { recommendedPct, chosenPct }), FEE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [chosenWon, recommendedWon, legalMaxWon]);
}
