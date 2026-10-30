import { describe, expect, it } from 'vitest';
import market from '@/data/market/dasan-market.json';
import { complexParcelQuery } from '../complexLocation';

describe('단지 지번 → 지오코딩 질의', () => {
  it('첫 번째 올바른 지번으로 다산동 지번 주소', () => {
    expect(complexParcelQuery(['6234'])).toEqual({ type: 'PARCEL', address: '경기도 남양주시 다산동 6234' });
    expect(complexParcelQuery(['', '6092-1'])).toEqual({ type: 'PARCEL', address: '경기도 남양주시 다산동 6092-1' });
  });

  it('지번이 없거나 이상하면 null (거리 칩 없음)', () => {
    expect(complexParcelQuery(undefined)).toBeNull();
    expect(complexParcelQuery([])).toBeNull();
    expect(complexParcelQuery(['산12'])).toBeNull();
  });

  it('실제 데이터: 단지 대부분은 지번이 있다 (없는 단지는 칩 없이)', () => {
    const all = market.complexes as unknown as { id: number; lots?: string[] }[];
    const ok = all.filter((c) => complexParcelQuery(c.lots)).length;
    expect(ok / all.length).toBeGreaterThan(0.9);
    // 예시 의뢰 단지(id 16)는 지번이 있어 거리 칩이 나온다
    expect(complexParcelQuery(all.find((c) => String(c.id) === '16')?.lots)).not.toBeNull();
  });
});
