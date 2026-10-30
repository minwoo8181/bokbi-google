import { describe, expect, it } from 'vitest';
import { BRACKET_STARTS_WON, calculateLegalCommission } from '@/lib/commission';
import { discountPct, nearestBracketShift, personalFeeScenarios } from '../dealFee';

const 매매 = (askingPriceManwon: number, commissionWon: number) => ({ tradeType: '매매' as const, askingPriceManwon, commissionWon });
const 전세 = (askingPriceManwon: number, commissionWon: number) => ({ tradeType: '전세' as const, askingPriceManwon, commissionWon });

describe('BRACKET_STARTS_WON = calculateLegalCommission의 요율 경계', () => {
  for (const tradeType of ['매매', '전세'] as const) {
    it(`${tradeType}: 1천만~30억을 1백만 원씩 훑어 요율이 바뀌는 곳이 목록과 같다`, () => {
      const changes: number[] = [];
      let prev = calculateLegalCommission(10_000_000, tradeType).ratePercentLabel;
      for (let won = 11_000_000; won <= 3_000_000_000; won += 1_000_000) {
        const rate = calculateLegalCommission(won, tradeType).ratePercentLabel;
        if (rate !== prev) changes.push(won);
        prev = rate;
      }
      expect(changes).toEqual(BRACKET_STARTS_WON[tradeType]);
    });
  }
});

describe('discountPct (법정 상한 대비 할인율)', () => {
  it('힐스테이트다산 12억 4,000만 · 533만 → 28%', () => {
    expect(discountPct(매매(124_000, 5_330_000))).toBe(28);
  });
  it('9억 9,000만 · 297만(상한의 60%) → 40%', () => {
    expect(discountPct(매매(99_000, 2_970_000))).toBe(40);
  });
  it('상한을 넘는 금액은 0%, 희망가 0은 null', () => {
    expect(discountPct(매매(99_000, 9_000_000))).toBe(0);
    expect(discountPct(매매(0, 1_000_000))).toBeNull();
  });
});

describe('nearestBracketShift (희망가 ±15% 안의 요율 경계)', () => {
  it('12억 4,000만: 12억 아래로 팔리면 0.6% → 0.5%', () => {
    expect(nearestBracketShift(매매(124_000, 5_330_000))).toEqual({ boundaryManwon: 120_000, direction: 'DOWN', fromRate: '0.6%', toRate: '0.5%' });
  });
  it('11억 5,000만: 12억 이상에 팔리면 0.5% → 0.6%', () => {
    expect(nearestBracketShift(매매(115_000, 4_000_000))).toEqual({ boundaryManwon: 120_000, direction: 'UP', fromRate: '0.5%', toRate: '0.6%' });
  });
  it('희망가가 경계와 같으면(12억) 그 아래로 팔릴 때를 안내', () => {
    expect(nearestBracketShift(매매(120_000, 5_000_000))?.direction).toBe('DOWN');
  });
  it('경계에서 15% 넘게 떨어지면 안내 없음 (전세 4억 5,000만)', () => {
    expect(nearestBracketShift(전세(45_000, 1_080_000))).toBeNull();
  });
  it('15% 경계값 (전세 6억): 7억 500만(14.9%)은 안내, 7억 600만(15.01%)은 없음', () => {
    expect(nearestBracketShift(전세(70_500, 2_000_000))).toEqual({ boundaryManwon: 60_000, direction: 'DOWN', fromRate: '0.4%', toRate: '0.3%' });
    expect(nearestBracketShift(전세(70_600, 2_000_000))).toBeNull();
  });
  it('두 경계가 모두 범위 안이면 더 가까운 쪽 (매매 10억 6,000만 → 12억)', () => {
    expect(nearestBracketShift(매매(106_000, 3_000_000))?.boundaryManwon).toBe(120_000);
  });
});

describe('personalFeeScenarios (내 요청으로 계산한 줄)', () => {
  it('12억 4,000만 · 533만: 12억 5,000만 / 희망가 / 12억 / 11억 5,000만(요율 바뀜)', () => {
    const { rows, shift } = personalFeeScenarios(매매(124_000, 5_330_000));
    expect(shift?.boundaryManwon).toBe(120_000);
    expect(rows.map((r) => [r.priceManwon, r.feeWon, r.isAsking, r.rateChanged])).toEqual([
      [125_000, 5_372_000, false, false],
      [124_000, 5_330_000, true, false],
      [120_000, 5_158_000, false, false],
      [115_000, 4_119_000, false, true],
    ]);
    // 화면 "상한 n원에서 같은 할인율로" — 공식 요율표 손계산: 12억 이상 0.6%, 9억~12억 0.5%
    // 12억 5,000만 750만 · 12억 4,000만 744만 · 12억 720만 · 11억 5,000만 575만
    expect(rows.map((r) => r.legalMaxWon)).toEqual([7_500_000, 7_440_000, 7_200_000, 5_750_000]);
    // 복비 = 합의 533만 × (그 금액 상한 ÷ 희망가 상한 744만), 천 원 미만 버림
    for (const r of rows) expect(r.feeWon).toBe(Math.floor((5_330_000 * r.legalMaxWon) / 7_440_000 / 1000) * 1000);
  });

  it('9억 9,000만 · 297만: 9억 아래 줄(8억 5,000만, 0.4%)이 붙는다', () => {
    const { rows } = personalFeeScenarios(매매(99_000, 2_970_000));
    expect(rows.map((r) => r.priceManwon)).toEqual([100_000, 99_000, 95_000, 85_000]);
    expect(rows.at(-1)).toMatchObject({ feeWon: 2_040_000, rateLabel: '0.4%', rateChanged: true });
  });

  it('위쪽 경계(11억 5,000만 → 12억)는 이미 있는 줄에 요율 바뀜 표시만', () => {
    const { rows } = personalFeeScenarios(매매(115_000, 4_000_000));
    expect(rows.map((r) => r.priceManwon)).toEqual([120_000, 115_000, 110_000]);
    expect(rows[0].rateChanged).toBe(true);
  });

  it('경계가 멀면 3줄 (전세 4억 5,000만, 1,000만 단위 아래는 5억 미만에서 1,000만 간격)', () => {
    expect(personalFeeScenarios(전세(45_000, 1_080_000)).rows.map((r) => r.priceManwon)).toEqual([46_000, 45_000, 44_000]);
  });

  it('희망가가 간격의 배수가 아니어도 위아래는 깔끔한 금액', () => {
    expect(personalFeeScenarios(매매(87_300, 2_000_000)).rows.map((r) => r.priceManwon)).toEqual([90_000, 87_300, 85_000]);
  });

  it('희망가 줄은 합의 금액 그대로, 희망가 0이면 빈 표', () => {
    const a = 매매(99_000, 2_970_000);
    expect(personalFeeScenarios(a).rows.find((r) => r.isAsking)?.feeWon).toBe(2_970_000);
    expect(personalFeeScenarios(매매(0, 0))).toEqual({ rows: [], shift: null });
  });
});
