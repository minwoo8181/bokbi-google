import type { TradeType } from '@/components/analysis/types';

/**
 * 매칭 사례 예시 — 실제 매칭 기록이 생기기 전까지만 쓴다 (docs/PREDEPLOY_CHECKLIST.md §1-1).
 * 거래가: 국토부 실거래 84㎡ 중개거래 중위가 (2026-04~10). 할인율: 30~45%.
 */
export const MATCH_CASE_EXAMPLES: { id: string; complexName: string; pyeongLabel: string; tradeType: TradeType; dealPriceManwon: number; discount: number }[] = [
  { id: 'ex1', complexName: '힐스테이트다산', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 104700, discount: 0.4 },
  { id: 'ex2', complexName: '다산자이아이비플레이스', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 121000, discount: 0.45 },
  { id: 'ex3', complexName: '다산한강반도유보라', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 92000, discount: 0.35 },
  { id: 'ex4', complexName: '다산e편한세상자이', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 103500, discount: 0.42 },
  { id: 'ex5', complexName: '다산롯데캐슬', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 101000, discount: 0.3 },
  { id: 'ex6', complexName: '다산자이폴라리스', pyeongLabel: '34평', tradeType: '매매', dealPriceManwon: 101000, discount: 0.38 },
];
