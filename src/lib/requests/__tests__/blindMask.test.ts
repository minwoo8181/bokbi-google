import { describe, it, expect } from 'vitest';
import { MASK_VARIANTS, maskVariant } from '../blindMask';

describe('maskVariant (매칭 전 가려진 상호 길이)', () => {
  it('같은 요청은 언제 열어도 같은 길이', () => {
    expect(maskVariant('offer-abc')).toBe(maskVariant('offer-abc'));
  });

  it('결과는 항상 0 ~ MASK_VARIANTS-1', () => {
    for (let i = 0; i < 500; i++) {
      const v = maskVariant(`offer-${i}`);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(MASK_VARIANTS);
    }
  });

  it('3가지가 고르게 섞여 나온다 (요청 300개에서 각 20% 이상)', () => {
    const counts = Array<number>(MASK_VARIANTS).fill(0);
    for (let i = 0; i < 300; i++) counts[maskVariant(`offer-${i}`)]++;
    for (const c of counts) expect(c).toBeGreaterThan(60);
  });

  it('빈 id도 오류 없이 길이를 고른다', () => {
    expect(maskVariant('')).toBe(0);
  });
});
