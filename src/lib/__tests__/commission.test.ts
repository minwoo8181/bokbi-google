import { describe, it, expect } from 'vitest';
import { calculateLegalCommission, calculateRecommendedCommission } from '../commission';

describe('Legal Brokerage Commission Engine (공인중개사법 시행규칙 [별표 1])', () => {
  describe('매매 (Sale)', () => {
    it('under 50M won: 0.6% with 250,000 won limit', () => {
      const res = calculateLegalCommission(40000000, '매매');
      expect(res.ratePercent).toBe(0.6);
      expect(res.maxWon).toBe(240000);
      expect(res.limitWon).toBe(250000);
    });

    it('50M to 200M won: 0.5% with 800,000 won limit', () => {
      const res = calculateLegalCommission(180000000, '매매');
      expect(res.ratePercent).toBe(0.5);
      // 1.8억 * 0.005 = 90만 -> capped at 80만
      expect(res.maxWon).toBe(800000);
      expect(res.limitWon).toBe(800000);
    });

    it('200M to 900M won (Dasan average 8.5억): 0.4% with NO limit', () => {
      const res = calculateLegalCommission(850000000, '매매');
      expect(res.ratePercent).toBe(0.4);
      expect(res.ratePercentLabel).toBe('0.4%');
      // 8.5억 * 0.004 = 3,400,000원
      expect(res.maxWon).toBe(3400000);
      expect(res.limitWon).toBeNull();
    });

    it('900M to 1.2B won (Dasan Xi 9.9억): 0.5% with NO limit', () => {
      const res = calculateLegalCommission(990000000, '매매');
      expect(res.ratePercent).toBe(0.5);
      expect(res.ratePercentLabel).toBe('0.5%');
      // 9.9억 * 0.005 = 4,950,000원
      expect(res.maxWon).toBe(4950000);
    });

    it('1.2B to 1.5B won: 0.6%', () => {
      const res = calculateLegalCommission(1300000000, '매매');
      expect(res.ratePercent).toBe(0.6);
      expect(res.maxWon).toBe(7800000);
    });

    it('1.5B won and above: 0.7%', () => {
      const res = calculateLegalCommission(1600000000, '매매');
      expect(res.ratePercent).toBe(0.7);
      expect(res.maxWon).toBe(11200000);
    });
  });

  describe('임대차/전세 (Lease)', () => {
    it('100M to 600M won (Dasan Jeonse 4.5억): 0.3% with NO limit', () => {
      const res = calculateLegalCommission(450000000, '전세');
      expect(res.ratePercent).toBe(0.3);
      expect(res.ratePercentLabel).toBe('0.3%');
      // 4.5억 * 0.003 = 1,350,000원
      expect(res.maxWon).toBe(1350000);
      expect(res.limitWon).toBeNull();
    });

    it('600M to 1.2B won (Dasan Xi Jeonse 6.5억): 0.4% with NO limit', () => {
      const res = calculateLegalCommission(650000000, '전세');
      expect(res.ratePercent).toBe(0.4);
      expect(res.ratePercentLabel).toBe('0.4%');
      // 6.5억 * 0.004 = 2,600,000원
      expect(res.maxWon).toBe(2600000);
    });
  });

  describe('AI 추천 복비', () => {
    it('produces reasonable win-win discount below legal max', () => {
      const dealPrice = 850000000; // 8.5억
      const legal = calculateLegalCommission(dealPrice, '매매');
      const recommended = calculateRecommendedCommission(dealPrice, '매매');
      expect(recommended).toBeLessThan(legal.maxWon);
      expect(recommended).toBe(2550000); // 340만 * 0.75 = 255만
    });
  });
});
