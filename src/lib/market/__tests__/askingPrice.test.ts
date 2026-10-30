import { describe, expect, it } from 'vitest';
import { askingLatest, askingMonthly, labelFloorRange, listingBand, parseFloorRaw, type AskingRow } from '../askingPrice';

describe('parseFloorRaw', () => {
  it('숫자 층', () => expect(parseFloorRaw('13/25')).toEqual({ floorNum: 13, floorLabel: null, floorTotal: 25 }));
  it('저·중·고 표기', () => expect(parseFloorRaw('고/40')).toEqual({ floorNum: null, floorLabel: '고', floorTotal: 40 }));
  it('읽을 수 없는 표기는 null', () => expect(parseFloorRaw('B1/20')).toEqual({ floorNum: null, floorLabel: null, floorTotal: 20 }));
  it('빈 값', () => expect(parseFloorRaw('')).toEqual({ floorNum: null, floorLabel: null, floorTotal: null }));
});

describe('labelFloorRange (넉넉하게 절반 기준)', () => {
  it('40층: 저 1~20 · 중 11~30 · 고 21~40', () => {
    expect(labelFloorRange('저', 40)).toEqual([1, 20]);
    expect(labelFloorRange('중', 40)).toEqual([11, 30]);
    expect(labelFloorRange('고', 40)).toEqual([21, 40]);
  });
  it('홀수 층수 25층: 고 13~25', () => expect(labelFloorRange('고', 25)).toEqual([13, 25]));
});

describe('listingBand: 확실할 때만 층 구간에', () => {
  const row = (floorNum: number | null, floorLabel: '저' | '중' | '고' | null, floorTotal: number | null) => ({ floorNum, floorLabel, floorTotal });
  it.each([
    [3, 'low'],
    [4, 'mid'],
    [14, 'mid'],
    [15, 'high'],
  ] as const)('숫자 %i층 → %s (실거래와 같은 경계)', (n, band) => expect(listingBand(row(n, null, 25))).toBe(band));
  it('고/40: 21~40층이라 모두 고층', () => expect(listingBand(row(null, '고', 40))).toBe('high'));
  it('고/28: 15~28층이라 고층 (경계 바로 위)', () => expect(listingBand(row(null, '고', 28))).toBe('high'));
  it('고/27: 14~27층이라 중층과 걸쳐 판정 안 함', () => expect(listingBand(row(null, '고', 27))).toBeNull());
  it('저/40: 1~20층이라 판정 안 함', () => expect(listingBand(row(null, '저', 40))).toBeNull());
  it('저/6: 1~3층이라 저층', () => expect(listingBand(row(null, '저', 6))).toBe('low'));
  it('저/7: 1~4층이라 판정 안 함', () => expect(listingBand(row(null, '저', 7))).toBeNull());
  it('중/18: 5~14층이라 중층', () => expect(listingBand(row(null, '중', 18))).toBe('mid'));
  it('중/19: 5~15층이라 판정 안 함', () => expect(listingBand(row(null, '중', 19))).toBeNull());
  it('중/12: 4~9층이라 중층', () => expect(listingBand(row(null, '중', 12))).toBe('mid'));
  it('중/11: 3~9층이라 판정 안 함', () => expect(listingBand(row(null, '중', 11))).toBeNull());
  it('층수를 모르면 판정 안 함', () => expect(listingBand(row(null, '고', null))).toBeNull());
  it('아무 정보도 없으면 판정 안 함', () => expect(listingBand(row(null, null, null))).toBeNull());
});

const r = (date: string, priceManwon: number, floorNum: number | null, floorLabel: '저' | '중' | '고' | null = null, floorTotal = 40): AskingRow => ({
  date,
  exclusiveM2: 105,
  priceManwon,
  floorNum,
  floorLabel,
  floorTotal,
});

describe('askingLatest', () => {
  const rows = [r('2026-10-20', 99_000, 18), r('2026-10-27', 145_000, 18), r('2026-10-27', 170_000, 30), r('2026-10-27', 150_000, null, '고'), r('2026-10-27', 143_000, null, '저'), r('2026-10-27', 147_000, 6)];
  it('전체 = 가장 최근 수집일 매물 전부 (지난 주 매물은 빠짐)', () =>
    expect(askingLatest(rows, 'ALL')).toEqual({ minManwon: 143_000, maxManwon: 170_000, count: 5, observedAt: '2026-10-27' }));
  it('고층 = 숫자 고층 + 고/40', () => expect(askingLatest(rows, 'high')).toEqual({ minManwon: 145_000, maxManwon: 170_000, count: 3, observedAt: '2026-10-27' }));
  it('중층 = 숫자 6층만 (저/40은 판정 안 함)', () => expect(askingLatest(rows, 'mid')).toEqual({ minManwon: 147_000, maxManwon: 147_000, count: 1, observedAt: '2026-10-27' }));
  it('저층 매물이 없으면 null', () => expect(askingLatest(rows, 'low')).toBeNull());
  it('매물이 하나도 없으면 null', () => expect(askingLatest([], 'ALL')).toBeNull());
});

describe('askingMonthly', () => {
  it('달마다 그달 수집한 모든 매물의 최저~최고, 오래된 달부터', () => {
    const rows = [r('2026-11-03', 140_000, 20), r('2026-10-27', 150_000, 20), r('2026-10-20', 160_000, 20), r('2026-11-10', 155_000, 20)];
    expect(askingMonthly(rows, 'ALL')).toEqual([
      { ym: '2026-10', minManwon: 150_000, maxManwon: 160_000 },
      { ym: '2026-11', minManwon: 140_000, maxManwon: 155_000 },
    ]);
  });
  it('층 탭은 그 구간 매물만', () => expect(askingMonthly([r('2026-10-27', 150_000, 2), r('2026-10-27', 160_000, 20)], 'low')).toEqual([{ ym: '2026-10', minManwon: 150_000, maxManwon: 150_000 }]));
  it('없으면 빈 목록', () => expect(askingMonthly([], 'high')).toEqual([]));
});
