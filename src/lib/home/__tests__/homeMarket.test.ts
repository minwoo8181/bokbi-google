import { describe, expect, it } from 'vitest';
import market from '@/data/market/dasan-market.json';
import { eokLabel, HOME_EXAMPLE_COMPLEXES, homeComplexExamples, homeMarketSummary, scenarioCutWon, shiftMonth, type TradeRow } from '../homeMarket';

describe('홈 엔진 카드 그래프', () => {
  it('달 이동은 해를 넘긴다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-10', -12)).toBe('2025-10');
  });

  it('기준일이 있는 달은 빼고 앞 12개월, 거래 없는 달도 0으로 칸이 있다', () => {
    const rows: TradeRow[] = [
      ['2026-10-03', 84, 80_000, 10, true], // 기준 달 → 뺌
      ['2026-09-30', 84, 80_000, 10, true],
      ['2025-10-01', 84, 80_000, 10, true],
      ['2025-09-30', 84, 80_000, 10, true], // 13개월 전 → 뺌
    ];
    const s = homeMarketSummary(rows, '2026-10-24');
    expect(s.months).toHaveLength(12);
    expect(s.months[0]).toEqual({ month: '2025-10', count: 1 });
    expect(s.months[11]).toEqual({ month: '2026-09', count: 1 });
    expect(s.months.slice(1, 11).every((m) => m.count === 0)).toBe(true);
  });

  it('법정 상한 평균은 중개 거래만 (직거래 제외), 8억 매매 = 320만 원', () => {
    const s = homeMarketSummary(
      [
        ['2026-05-01', 84, 80_000, 10, true],
        ['2026-05-02', 84, 200_000, 10, false],
      ],
      '2026-10-24',
    );
    expect(s.brokeredCount).toBe(1);
    expect(s.avgLegalCapWon).toBe(3_200_000);
  });

  it('합계·최고: 8억(320만) + 16억(0.7% = 1,120만)', () => {
    const s = homeMarketSummary(
      [
        ['2026-05-01', 84, 80_000, 10, true],
        ['2026-05-02', 114, 160_000, 10, true],
      ],
      '2026-10-24',
    );
    expect(s.capSumWon).toBe(14_400_000);
    expect(s.maxCapWon).toBe(11_200_000);
  });

  it('가정 한 줄: 평균 388만 원의 30% = 116만 원 (만 원 아래 버림)', () => {
    expect(scenarioCutWon(3_884_000)).toBe(1_160_000);
    expect(scenarioCutWon(3_884_000, 0.2)).toBe(770_000);
    expect(scenarioCutWon(0)).toBe(0);
  });

  it('억 표기는 버림, 1억 미만은 만 원', () => {
    expect(eokLabel(10_698_000_000)).toBe('106억 원');
    expect(eokLabel(99_999_999)).toBe('9,999만 원');
  });

  it('중개 거래가 없으면 평균 0', () => {
    expect(homeMarketSummary([], '2026-10-24').avgLegalCapWon).toBe(0);
  });

  it('단지 예시: 그 단지 거래만 같은 창으로, 없는 단지·중개 0건 단지는 뺀다', () => {
    const complexes = [
      { name: 'A', trades: [['2026-05-01', 84, 80_000, 10, true], ['2024-01-01', 84, 200_000, 10, true]] },
      { name: 'B', trades: [['2026-05-01', 84, 80_000, 10, false]] },
    ];
    const picks = [
      { name: 'A', label: '에이' },
      { name: 'B', label: '비' },
      { name: 'C', label: '씨' },
    ];
    expect(homeComplexExamples(complexes, '2026-10-24', picks)).toEqual([
      { label: '에이', brokeredCount: 1, avgLegalCapWon: 3_200_000, cutWon: 960_000 },
    ]);
  });

  it('실제 데이터: 예시 단지 3곳이 모두 있고, 첫 칩(아이비플레이스)이 다산동 평균보다 크다', () => {
    const ex = homeComplexExamples(market.complexes, market.meta.observedAt);
    expect(ex.map((e) => e.label)).toEqual(HOME_EXAMPLE_COMPLEXES.map((p) => p.label));
    const all = homeMarketSummary(market.complexes.flatMap((c) => c.trades as unknown as TradeRow[]), market.meta.observedAt);
    expect(ex[0].cutWon).toBeGreaterThan(scenarioCutWon(all.avgLegalCapWon));
    for (const e of ex) expect(e.brokeredCount).toBeGreaterThanOrEqual(10);
  });

  it('실제 데이터: 최근 1년 막대 합 > 중개 거래 수 > 0, 평균은 법정 상한 범위 안', () => {
    const trades = market.complexes.flatMap((c) => c.trades as unknown as TradeRow[]);
    const s = homeMarketSummary(trades, market.meta.observedAt);
    const total = s.months.reduce((a, m) => a + m.count, 0);
    expect(s.brokeredCount).toBeGreaterThan(0);
    expect(total).toBeGreaterThanOrEqual(s.brokeredCount);
    expect(s.avgLegalCapWon).toBeGreaterThan(1_000_000);
    expect(s.avgLegalCapWon).toBeLessThan(10_000_000);
    // 합계 ≈ 평균 × 건수, 최고 ≥ 평균
    expect(Math.abs(s.capSumWon - s.avgLegalCapWon * s.brokeredCount)).toBeLessThanOrEqual(s.brokeredCount);
    expect(s.maxCapWon).toBeGreaterThanOrEqual(s.avgLegalCapWon);
  });
});
