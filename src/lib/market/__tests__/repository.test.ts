import { describe, expect, it } from 'vitest';
import { getAnalysisBundle, getSearchIndex } from '../repository';
import { ENGINE_PARAMS } from '@/lib/analysis/marketEngine';

describe('실데이터 단지 마스터', () => {
  const index = getSearchIndex();

  it('검색 목록은 실제 58개 단지, ID 중복 없음', () => {
    expect(index).toHaveLength(58);
    expect(new Set(index.map((c) => c.id)).size).toBe(58);
  });

  it('모든 단지의 분석 화면 데이터가 만들어진다 (평형 1개 이상, 숫자에 NaN 없음)', () => {
    for (const { id } of index) {
      const b = getAnalysisBundle(id);
      expect(b, `id ${id}`).not.toBeNull();
      expect(b!.pyeongList.length, b!.apartment.apt_name).toBeGreaterThan(0);
      for (const p of b!.pyeongList) {
        // 매매는 모든 층 구간에 기준 실거래가 있어야 한다 (평형 목록은 매매 가격이 있는 평형만)
        for (const f of ['low', 'mid', 'high'] as const) expect(p.market!.sale.reference[f], `${b!.apartment.apt_name} ${p.name} ${f}`).not.toBeNull();
        for (const side of [p.market!.sale, p.market!.jeonse]) {
          const refs = Object.values(side.reference).filter((x) => x !== null);
          for (const ref of refs) {
            const r = ref.recommendation;
            expect(Number.isFinite(r.discount)).toBe(true);
            expect(r.discount).toBeGreaterThanOrEqual(ENGINE_PARAMS.minRecDiscount);
            expect(r.discount).toBeLessThanOrEqual(ENGINE_PARAMS.maxRecDiscount);
            expect(ref.priceManwon).toBeGreaterThan(0);
            if (r.rank) expect(r.rank.position).toBeLessThanOrEqual(r.rank.total);
          }
          // 할인율은 층과 무관 (층은 금액에만 쓴다)
          expect(new Set(refs.map((ref) => ref.recommendation.discount)).size).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('기준 실거래는 선택 층 구간의 가장 최근 중개거래 (힐스테이트다산 27평)', () => {
    const b = getAnalysisBundle(8)!;
    const sale = b.pyeongList.find((p) => p.id === '67')!.market!.sale;
    // 2026-10-18 데이터: 가장 최근 거래 26.10.10 3층 10억 2,500만 → 첫 화면은 저층
    expect(sale.latestFloor).toBe('low');
    expect(sale.reference.low).toMatchObject({ priceManwon: 102500, floor: 3, date: '26.10.10', source: 'FLOOR' });
    expect(sale.reference.mid).toMatchObject({ priceManwon: 104900, floor: 5, date: '26.10.02', source: 'FLOOR' });
    // 중층 최근 3건: 26.10.02 5층 10억 4,900 · 09.12 9층 9억 8,000 · 09.09 6층 10억 3,000
    expect(sale.reference.mid?.bandRecent).toEqual({ count: 3, minManwon: 98000, maxManwon: 104900 });
    // 층 구간 12개월 실거래 수 (층 세그먼트 아래 "중층 12개월 19건")
    expect([sale.reference.low?.bandCount, sale.reference.mid?.bandCount, sale.reference.high?.bandCount]).toEqual([3, 19, 9]);
  });

  it('구간 실거래 수: 최근 3건 범위보다 작지 않고, 다른 층 값을 쓰면 0', () => {
    for (const id of [8, 16]) {
      for (const p of getAnalysisBundle(id)!.pyeongList) {
        for (const side of [p.market!.sale, p.market!.jeonse]) {
          for (const ref of Object.values(side.reference)) {
            if (!ref) continue;
            expect(Number.isInteger(ref.bandCount)).toBe(true);
            if (ref.source !== 'FLOOR') expect(ref.bandCount).toBe(0);
            else expect(ref.bandCount).toBeGreaterThanOrEqual(ref.bandRecent?.count ?? 1);
          }
        }
      }
    }
  });

  it('그래프 월별 점은 그달 마지막 실거래 1건 (중간값 아님, 대표님 결정 2026-10-27)', () => {
    for (const id of [8, 16]) {
      for (const p of getAnalysisBundle(id)!.pyeongList) {
        for (const side of [p.market!.sale, p.market!.jeonse]) {
          if (side.series.length === 0) continue;
          for (const m of side.series) {
            // 'YY.MM.DD'의 연·월이 그 점의 달과 같고, 건수는 1건 이상
            expect(m.last.date.slice(0, 5)).toBe(`${m.ym.slice(2, 4)}.${m.ym.slice(5, 7)}`);
            expect(m.count).toBeGreaterThan(0);
          }
          // 마지막 점 = 계약 목록 맨 위(가장 최근 거래)와 같은 거래
          const end = side.series[side.series.length - 1].last;
          const top = side.contracts[0];
          expect({ date: end.date, price: end.priceManwon, floor: end.floor ?? 0 }, `${id} ${p.name}`).toEqual({ date: top.date, price: top.priceTenThousand, floor: top.floor });
        }
      }
    }
  });

  it('층 탭 그래프·계약: 그 층 구간 거래만, 계약은 최근 3건, 전 층 그래프와 건수가 맞다 (2026-10-27)', () => {
    const band = (f: number) => (f <= 3 ? 'low' : f <= 14 ? 'mid' : 'high');
    for (const id of [8, 16]) {
      for (const p of getAnalysisBundle(id)!.pyeongList) {
        for (const side of [p.market!.sale, p.market!.jeonse]) {
          let monthTotal = 0;
          for (const f of ['low', 'mid', 'high'] as const) {
            const b = side.byFloor[f];
            expect(b.contracts.length).toBeLessThanOrEqual(3);
            for (const c of b.contracts) expect(band(c.floor), `${id} ${p.name} ${f}`).toBe(f);
            for (const m of b.series) {
              if (m.last.floor !== null) expect(band(m.last.floor)).toBe(f);
              monthTotal += m.count;
            }
            // 계약 목록 맨 위 = 그래프 마지막 점 (같은 층 구간)
            if (b.series.length && b.contracts.length) {
              const end = b.series[b.series.length - 1].last;
              expect(end.date).toBe(b.contracts[0].date);
            }
          }
          // 층이 비어 있는 거래는 층 탭에 없을 수 있어 전 층 합계 이하
          expect(monthTotal).toBeLessThanOrEqual(side.series.reduce((s, m) => s + m.count, 0));
        }
      }
    }
  });

  it('호가 (2026-10-27): 매매만, 전체 ≥ 저·중·고 합, 최저 ≤ 최고, 띠 달은 최근 수집 달을 포함', () => {
    let pyeongsWithAsking = 0;
    for (const { id } of getSearchIndex()) {
      for (const p of getAnalysisBundle(id)!.pyeongList) {
        expect(p.market!.jeonse.asking).toBeNull();
        const a = p.market!.sale.asking;
        if (!a) continue;
        pyeongsWithAsking++;
        const all = a.latest.ALL!;
        const bands = (['low', 'mid', 'high'] as const).reduce((s, f) => s + (a.latest[f]?.count ?? 0), 0);
        expect(all.count, `${id} ${p.name}`).toBeGreaterThanOrEqual(bands);
        for (const t of ['ALL', 'low', 'mid', 'high'] as const) {
          const r = a.latest[t];
          if (r) expect(r.minManwon).toBeLessThanOrEqual(r.maxManwon);
          for (const m of a.monthly[t]) expect(m.minManwon).toBeLessThanOrEqual(m.maxManwon);
        }
        expect(a.monthly.ALL.at(-1)!.ym).toBe(all.observedAt.slice(0, 7));
      }
    }
    expect(pyeongsWithAsking).toBeGreaterThan(50);
  });

  it('같은 단지라도 면적대마다 할인이 다르다 (다산자이아이비플레이스 중형 vs 대형)', () => {
    const b = getAnalysisBundle(16)!;
    const rec = (prefix: string) => b.pyeongList.find((p) => p.name.startsWith(prefix))!.market!.sale.reference.mid!.recommendation;
    const large = rec('41평');
    expect(large.areaBand).toBe('LARGE');
    // 2026-10-24 데이터: 대형 매물 61 / 6개월 거래 36 → 평균의 0.8배 → 27%. 중형은 매물 10 / 거래 19 → 48%
    expect(Math.round(large.discount * 100)).toBe(27);
    const medium = b.pyeongList.map((p) => p.market!.sale.reference.mid!.recommendation).find((r) => r.areaBand === 'MEDIUM')!;
    expect(medium.discount).toBeGreaterThan(large.discount);
  });

  it('매매 계약 목록은 중개거래만, 최근순', () => {
    const b = getAnalysisBundle(index[0].id)!;
    const dates = b.pyeongList[0].market!.sale.contracts.map((c) => c.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe('평형 안 구조 타입 (네이버 33A·33B 등)', () => {
  const ivy = getSearchIndex().find((c) => c.apt_name.includes('아이비플레이스'))!;
  const list = getAnalysisBundle(ivy.id)!.pyeongList;

  it('다산자이아이비플레이스 34평(전용 85㎡)은 33A·33B·33C, 39평은 39A·39B 타입을 가진다', () => {
    expect(list.find((p) => p.id === '85')!.types!.map((t) => t.name)).toEqual(['33A', '33B', '33C']);
    expect(list.find((p) => p.id === '100')!.types!.map((t) => t.name)).toEqual(['39A', '39B']);
  });

  it('타입이 하나뿐인 평형은 types를 비워 둔다 (선택 칩을 띄우지 않음)', () => {
    expect(list.find((p) => p.id === '111')!.types).toBeUndefined();
  });

  it('이름이 같은 중복 등록은 하나로 합친다', () => {
    for (const { id } of getSearchIndex()) {
      for (const p of getAnalysisBundle(id)!.pyeongList) {
        const names = (p.types ?? []).map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
        if (p.types) expect(p.types.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
