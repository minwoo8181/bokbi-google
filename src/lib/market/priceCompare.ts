/**
 * 희망가 ↔ 최근 실거래 비교 (매칭 모달 2단계, 대표님 승인 2026-10-25).
 * 판단하는 말 없이 사실만: 높아요 / 낮아요 / 같아요. 차이는 만 원 단위
 */
export type PriceVsTradeKind = 'HIGHER' | 'LOWER' | 'SAME';

export function comparePriceToTrade(askingManwon: number, tradeManwon: number): { kind: PriceVsTradeKind; diffManwon: number } {
  const diff = askingManwon - tradeManwon;
  if (diff === 0) return { kind: 'SAME', diffManwon: 0 };
  return { kind: diff > 0 ? 'HIGHER' : 'LOWER', diffManwon: Math.abs(diff) };
}
