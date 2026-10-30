import { describe, expect, it } from 'vitest';
import { checkUnit, normalizeDong, normalizeHo } from '../units';
import { getComplexUnits } from '../repository';
import dataset from '@/data/market/dasan-market.json';
import type { ComplexUnits } from '@/components/analysis/types';

/** 동·호수 실존 확인 (A안, 2026-10-24). 건축물대장 전유부 실데이터로 검증한다 */
const ds = dataset as unknown as { complexes: { id: number; name: string; households: number | null }[] };
const idOf = (name: string) => ds.complexes.find((c) => c.name === name)!.id;
const purgio = getComplexUnits(idOf('다산푸르지오'))!;

describe('입력 정규화', () => {
  it('동·호 표기 차이를 흡수한다', () => {
    expect(normalizeDong(' 제6501동 ')).toBe('6501');
    expect(normalizeHo('1306호')).toBe('1306');
    expect(normalizeHo('0905')).toBe('905');
  });
});

describe('다산푸르지오 (실데이터)', () => {
  it('6501동 1306호는 있다 (표기가 달라도)', () => {
    expect(checkUnit(purgio, '6501', '1306').status).toBe('OK');
    expect(checkUnit(purgio, '6501동', '1306호').status).toBe('OK');
  });
  it('29층 건물의 30층 호수는 층수 초과', () => {
    expect(checkUnit(purgio, '6501', '3006').status).toBe('FLOOR_OVER');
  });
  it('22층 건물(6510동)의 23층 호수도 층수 초과', () => {
    expect(checkUnit(purgio, '6510', '2306').status).toBe('FLOOR_OVER');
  });
  it('층 안이지만 없는 호 / 없는 동 / 빈 입력', () => {
    expect(checkUnit(purgio, '6501', '1399').status).toBe('NO_HO');
    expect(checkUnit(purgio, '9999', '1306').status).toBe('NO_DONG');
    expect(checkUnit(purgio, '', '1306').status).toBe('EMPTY');
  });
  it('주택 호수 1,614 = 세대수 1,614 (부대시설·상가 제외)', () => {
    expect(purgio.dongs.reduce((s, d) => s + d.hos.length, 0)).toBe(1614);
    expect(purgio.dongs.every((d) => /^\d+동$/.test(d.name))).toBe(true);
  });
});

describe('데이터 커버리지', () => {
  it('데이터 없는 단지는 막지 않는다 (UNKNOWN)', () => {
    expect(checkUnit(null, '101', '101').status).toBe('UNKNOWN');
  });
  it('단지별 주택 호수와 세대수 일치율 (±2%)', () => {
    const rows = ds.complexes.map((c) => ({ c, u: getComplexUnits(c.id) }));
    const covered = rows.filter((r) => r.u);
    const ok = covered.filter(({ c, u }) => {
      const n = (u as ComplexUnits).dongs.reduce((s, d) => s + d.hos.length, 0);
      return Math.abs(n - (c.households ?? 0)) <= Math.max(2, (c.households ?? 0) * 0.02);
    });
    console.info(`[건축물대장] 수집 ${covered.length}/58, 세대수 일치 ${ok.length}/58`);
    // 2026-10-24 기준 58개 모두 수집, 53개 일치 (차이 5곳은 data/reports/reconciliation.md에 사유)
    expect(covered.length).toBe(58);
    expect(ok.length).toBeGreaterThanOrEqual(53);
  });
});
