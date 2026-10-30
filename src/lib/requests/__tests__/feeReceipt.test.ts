import { describe, it, expect } from 'vitest';
import { computeCommissionQuote } from '@/lib/commission';
import { feeReceipt } from '../feeReceipt';

describe('feeReceipt: 완료 영수증 줄', () => {
  it('법정 상한 − 할인 + 옵션 = 내가 제안한 복비 (여러 조합)', () => {
    for (const basisPriceWon of [300_000_000, 1_395_000_000, 2_000_000_000])
      for (const tradeType of ['매매', '전세'] as const)
        for (const ratio of [0.2, 0.5, 0.73, 1])
          for (const bonusWon of [0, 200_000, 50_000_000]) {
            const q = computeCommissionQuote({ basisPriceWon, tradeType, proposedWon: 0, bonusWon });
            const q2 = computeCommissionQuote({ basisPriceWon, tradeType, proposedWon: q.legal.maxWon * ratio, bonusWon });
            const r = feeReceipt(q2);
            expect(r.legalMaxWon - r.discountWon + r.bonusWon).toBe(r.totalWon);
            expect(r.totalWon).toBe(q2.totalWon);
            expect(r.totalWon).toBeLessThanOrEqual(r.legalMaxWon);
            expect(r.bonusWon).toBeGreaterThanOrEqual(0);
          }
  });

  it('13억 9,500만 매매, 612만 제안이면 할인 225만 · 27%', () => {
    const q = computeCommissionQuote({ basisPriceWon: 1_395_000_000, tradeType: '매매', proposedWon: 6_120_000 });
    const r = feeReceipt(q);
    expect(r.discountWon).toBe(q.legal.maxWon - 6_120_000);
    expect(r.discountPct).toBe(Math.round(((q.legal.maxWon - 6_120_000) / q.legal.maxWon) * 100));
    expect(r.bonusWon).toBe(0);
  });

  it('보너스가 상한에 잘리면 잘린 만큼만 옵션 줄에', () => {
    const q = computeCommissionQuote({ basisPriceWon: 1_000_000_000, tradeType: '매매', proposedWon: 4_000_000, bonusWon: 9_000_000 });
    const r = feeReceipt(q);
    expect(r.totalWon).toBe(r.legalMaxWon);
    expect(r.bonusWon).toBe(r.legalMaxWon - 4_000_000);
  });
});
