import { describe, expect, it } from 'vitest';
import { distanceBand, haversineKm } from '../distance';

describe('직선거리 (하버사인)', () => {
  it('같은 점은 0, 위도 0.01도는 약 1.112km (지구 반지름 6,371km 손계산: 6371 × 0.01 × π/180)', () => {
    const p = { x: 127.16, y: 37.61 };
    expect(haversineKm(p, p)).toBe(0);
    expect(haversineKm(p, { x: 127.16, y: 37.62 })).toBeCloseTo(1.112, 3);
  });

  it('다산동 위도에서 경도 0.01도는 약 0.881km (1.112 × cos 37.61°)', () => {
    expect(haversineKm({ x: 127.16, y: 37.61 }, { x: 127.17, y: 37.61 })).toBeCloseTo(0.881, 3);
  });

  it('순서를 바꿔도 같다', () => {
    const a = { x: 127.1654, y: 37.6118 };
    const b = { x: 127.15, y: 37.62 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 12);
  });
});

describe('거리 구간 (경계는 "이하")', () => {
  it.each([
    [0, 'M500'],
    [0.5, 'M500'],
    [0.5001, 'KM1'],
    [1, 'KM1'],
    [1.0001, 'KM2'],
    [2, 'KM2'],
    [2.0001, 'FAR'],
    [7.3, 'FAR'],
  ])('%skm → %s', (km, band) => {
    expect(distanceBand(km)).toBe(band);
  });

  it('잘못된 값은 구간 없음 (칩을 그리지 않음)', () => {
    expect(distanceBand(Number.NaN)).toBeNull();
    expect(distanceBand(-1)).toBeNull();
    expect(distanceBand(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
