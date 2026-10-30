import { describe, it, expect } from 'vitest';
import { comparePriceToTrade } from '../priceCompare';

describe('희망가 ↔ 최근 실거래', () => {
  it('높음·낮음·같음과 차이(만 원)', () => {
    expect(comparePriceToTrade(102_000, 99_000)).toEqual({ kind: 'HIGHER', diffManwon: 3_000 });
    expect(comparePriceToTrade(97_000, 99_000)).toEqual({ kind: 'LOWER', diffManwon: 2_000 });
    expect(comparePriceToTrade(99_000, 99_000)).toEqual({ kind: 'SAME', diffManwon: 0 });
  });
});
