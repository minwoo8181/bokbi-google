import { describe, expect, it } from 'vitest';
import { daysBetween, freshness, latestDate, STALE_DAYS, toDate, type DataFiles } from '../dataFreshness';
import { KEY_ENV, KEY_ORDER, keyStatus } from '../keys';

// 2026-10-26 12:00 KST
const now = new Date('2026-10-26T03:00:00Z');

/** 지금 저장소의 실제 파일 이름 */
const files: DataFiles = {
  observedAt: '2026-10-24',
  naver: ['naver_complexes_20261024.csv', 'naver_complexes_20261026.csv', 'naver_pyeongs_20261026.csv', 'naver_집계_검증리포트_20261024.md'],
  trades: ['molit-apt-rent-202411-202610.json', 'molit-apt-trades-202411-202610.json', '아파트(매매)_실거래가_20261018184408.csv'],
  index: ['rone-indices-202610.json'],
  units: ['building-units-20261024.json', 'complex-ids.json'],
};

describe('데이터 갱신 날짜', () => {
  it('파일 이름 날짜: 일 단위 그대로, 월 단위는 그 달 마지막 날, 없는 날짜는 null', () => {
    expect(toDate('20261024')).toBe('2026-10-24');
    expect(toDate('202610')).toBe('2026-10-31');
    expect(toDate('202602')).toBe('2026-02-28');
    expect(toDate('20261340')).toBeNull();
    expect(toDate('202613')).toBeNull();
    expect(latestDate(['naver_complexes_20261024.csv', 'naver_complexes_20261026.csv'], /^naver_complexes_(\d{8})\.csv$/)).toBe('2026-10-26');
    expect(latestDate([], /x/)).toBeNull();
  });

  it('지금 저장소: 매물 새 CSV(10-26)가 화면 기준일(10-24)보다 새로워 "반영 전", 7일 안이라 빨강 없음', () => {
    const rows = freshness(files, now);
    expect(rows).toEqual([
      { id: 'SCREEN', date: '2026-10-24', days: 2, stale: false },
      { id: 'LISTINGS', date: '2026-10-26', days: 0, stale: false, pending: true },
      { id: 'TRADES', date: '2026-10-31', days: 0, stale: false },
      { id: 'RONE', date: '2026-10-31', days: 0, stale: false },
      { id: 'UNITS', date: '2026-10-24', days: 2, stale: false },
    ]);
  });

  it('7일까지는 괜찮고 8일째부터 빨강, 파일이 없으면 빨강', () => {
    const later = (days: number) => new Date(Date.parse('2026-10-24T03:00:00Z') + days * 86_400_000);
    expect(freshness(files, later(STALE_DAYS)).find((r) => r.id === 'SCREEN')?.stale).toBe(false);
    expect(freshness(files, later(STALE_DAYS + 1)).find((r) => r.id === 'SCREEN')?.stale).toBe(true);
    expect(freshness({ observedAt: null, naver: [], trades: [], index: [], units: [] }, now).every((r) => r.stale && r.date === null)).toBe(true);
    expect(daysBetween('2026-10-30', '2026-10-26')).toBe(0);
  });
});

describe('키 설정 여부', () => {
  it('있음/없음만 (빈 값·공백은 없음)', () => {
    const env = { GEMINI_API_KEY: 'secret-value-123', V_WORLD_MAP_API_KEY: '   ', BUILDING_REGISTER_API_KEY: undefined };
    expect(keyStatus(env)).toEqual([
      { id: 'AI', set: true },
      { id: 'VWORLD', set: false },
      { id: 'BUILDING', set: false },
      { id: 'MOLIT', set: false },
      { id: 'SOLAPI', set: false },
      { id: 'PUSH', set: false },
    ]);
  });

  it('결과에 키 값이 절대 들어가지 않는다 (참·거짓 말고는 없음)', () => {
    const env = Object.fromEntries(KEY_ORDER.map((id) => [KEY_ENV[id], `VALUE-${id}-xyz`]));
    const out = keyStatus(env);
    const json = JSON.stringify(out);
    expect(json).not.toContain('VALUE-');
    for (const row of out) expect(Object.keys(row).sort()).toEqual(['id', 'set']);
  });
});
