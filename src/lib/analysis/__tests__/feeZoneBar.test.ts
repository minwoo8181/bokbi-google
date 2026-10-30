import { describe, expect, it } from 'vitest';
import { barPercent, feeZoneBarLayout } from '../feeZoneBar';
import { feeZone } from '../marketEngine';

describe('복비 구간 막대', () => {
  it('금액 → % (0~100으로 자르고, 상한 0이면 0)', () => {
    expect(barPercent(1_940_000, 3_000_000)).toBeCloseTo(64.67, 1);
    expect(barPercent(-1, 3_000_000)).toBe(0);
    expect(barPercent(4_000_000, 3_000_000)).toBe(100);
    expect(barPercent(100, 0)).toBe(0);
  });

  it('추천 35%: 빗금 30% → 빨강 30~55 → 노랑 55~65 → 초록 65~80 → 파랑 80~100', () => {
    const { floorPct, segments } = feeZoneBarLayout(3_000_000, 900_000, 0.35);
    expect(floorPct).toBe(30);
    expect(segments.map((s) => [s.zone, Math.round(s.from), Math.round(s.to)])).toEqual([
      ['RISK', 30, 55],
      ['CAUTION', 55, 65],
      ['RECOMMENDED', 65, 80],
      ['WIDE', 80, 100],
    ]);
  });

  it('추천 20%면 초록 구간이 없다 (파랑 다음 바로 노랑)', () => {
    const zones = feeZoneBarLayout(3_000_000, 900_000, 0.2).segments.map((s) => s.zone);
    expect(zones).toEqual(['RISK', 'CAUTION', 'WIDE']);
  });

  it('막대 색과 안내 문구(feeZone)가 같은 경계를 쓴다', () => {
    const max = 3_000_000;
    const rec = 0.35;
    const { segments } = feeZoneBarLayout(max, 900_000, rec);
    for (const s of segments) {
      const mid = (s.from + s.to) / 2;
      expect(feeZone(1 - mid / 100, rec), `${s.zone} ${mid}%`).toBe(s.zone);
    }
  });
});
