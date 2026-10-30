import { describe, expect, it } from 'vitest';
import dataset from '@/data/market/dasan-market.json';
import {
  ENGINE_PARAMS,
  areaBandOf,
  bandRatios,
  buildContext,
  discountFromRatio,
  feeZone,
  rankAmong,
  recommend,
  type ComplexMarket,
  type MarketDataset,
  type TradeTuple,
} from '../marketEngine';
import { COMMISSION_FLOOR_RATIO, calculateLegalCommission, computeCommissionQuote } from '@/lib/commission';

const ds = dataset as unknown as MarketDataset;
const ctx = buildContext(ds);
const byName = (n: string) => ds.complexes.find((c) => c.name === n) as ComplexMarket;

/** 관측일 기준 창 안에 거래 n건을 고르게 넣은 가상 단지 (거래가 priceManwon) */
function synthetic(listings: number, sales: number, priceManwon = 100000): ComplexMarket {
  const trades: TradeTuple[] = [];
  for (let i = 0; i < sales; i++) {
    const d = new Date(Date.parse(`${ds.meta.observedAt}T00:00:00Z`) - (ENGINE_PARAMS.reportLagDays + 1 + (i % 85)) * 864e5);
    trades.push([d.toISOString().slice(0, 10), 84.9, priceManwon, 10, 1]);
  }
  return { id: 0, name: 'T', households: 1000, buildYear: 2018, lots: [], listings: { sale: listings, jeonse: 0, minAskManwon: null }, pyeongs: [], trades };
}

/** 면적대별 매물·거래를 넣은 가상 단지 */
function withBands(spec: { m2: number; listings: number; sales: number }[]): ComplexMarket {
  const base = synthetic(0, 0);
  for (const s of spec) {
    base.pyeongs.push({ supplyM2: s.m2 * 1.3, exclusiveM2: s.m2, supplyPyeong: Math.round((s.m2 * 1.3) / 3.3058), sale: s.listings, jeonse: 0 });
    base.listings.sale += s.listings;
    for (const t of synthetic(0, s.sales).trades) base.trades.push([t[0], s.m2, t[2], t[3], t[4]]);
  }
  return base;
}

describe('데이터셋 무결성', () => {
  // 매물 수는 2026-10-24 네이버 CSV(동일매물 묶기) 스냅샷. 새 CSV를 넣으면 이 숫자를 갱신한다
  it('58개 단지 · 유효 거래 5,509건 · 매물 1,762/128건', () => {
    expect(ds.complexes).toHaveLength(58);
    expect(ds.meta.counts.validTrades).toBe(5509);
    expect(ds.meta.counts.saleListings).toBe(1762);
    expect(ds.meta.counts.jeonseListings).toBe(128);
  });
});

describe('할인 곡선 (v4: 0.5배 20% · 1배 30% · 2배 50%)', () => {
  it('기준점과 사이값', () => {
    expect(discountFromRatio(1)).toBeCloseTo(0.3);
    expect(discountFromRatio(2)).toBeCloseTo(0.5);
    expect(discountFromRatio(0.5)).toBeCloseTo(0.2);
    expect(discountFromRatio(Math.SQRT2)).toBeCloseTo(0.4); // 1.4배 → 40%
    expect(discountFromRatio(5)).toBe(ENGINE_PARAMS.maxRecDiscount);
    expect(discountFromRatio(0.1)).toBe(ENGINE_PARAMS.minRecDiscount);
  });

  it('비율이 커질수록 할인이 커진다 (단조성)', () => {
    let prev = -Infinity;
    for (const x of [0.3, 0.5, 0.7, 1, 1.3, 1.7, 2, 3]) {
      const d = discountFromRatio(x);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });
});

describe('추천 할인율 (v4 매물 소화 속도)', () => {
  it('모든 단지·면적대가 20~50% 안에 있다', () => {
    for (const c of ds.complexes) {
      for (const b of [undefined, 'SMALL', 'MEDIUM', 'LARGE'] as const) {
        const r = recommend(c, ctx, b);
        expect(r.discount).toBeGreaterThanOrEqual(ENGINE_PARAMS.minRecDiscount);
        expect(r.discount).toBeLessThanOrEqual(ENGINE_PARAMS.maxRecDiscount);
      }
    }
  });

  it('매물이 귀할수록(매물 대비 거래가 많을수록) 할인이 커진다 — 단조성', () => {
    let prev = -Infinity;
    for (const sales of [3, 6, 12, 24, 48]) {
      const d = recommend(synthetic(40, sales), ctx).discount;
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
  });

  it('집값은 할인에 영향을 주지 않는다 (v3 건당 보수 항 폐지 회귀)', () => {
    const ds5 = recommend(synthetic(40, 12, 50000), ctx).discount;
    const ds13 = recommend(synthetic(40, 12, 130000), ctx).discount;
    expect(ds13).toBe(ds5);
  });

  it('균형 시장 최고가 단지가 50%에 닿지 않는다 (2026-10-24 지적 사례)', () => {
    const ivy = byName('다산자이아이비플레이스(주거복합)');
    expect(recommend(ivy, ctx).discount).toBeCloseTo(0.3, 1);
    // 41평이 속한 대형: 매물 61 / 거래 36 → 평균의 0.8배 → 27%
    const large = recommend(ivy, ctx, 'LARGE');
    expect(large.speedRatio).toBeCloseTo(0.8, 1);
    expect(Math.round(large.discount * 100)).toBe(27);
  });

  it('같은 입력이면 같은 결과 (결정론)', () => {
    const c = byName('힐스테이트다산');
    expect(recommend(c, ctx, 'MEDIUM')).toEqual(recommend(c, ctx, 'MEDIUM'));
  });

  it('데이터 부족이면 거짓 판정 대신 다산동 평균 단지와 같은 30% (NO_DATA)', () => {
    const r = recommend(synthetic(10, 0), ctx);
    expect(r.grade).toBe('UNKNOWN');
    expect(r.isGeneric).toBe(true);
    expect(r.discount).toBe(ENGINE_PARAMS.midRecDiscount);
    expect(r.defaultReason).toBe('NO_DATA');
    expect(r.atLimit).toBeNull();
  });

  it('범위 끝에 닿으면 atLimit으로 알린다', () => {
    expect(recommend(synthetic(0, 9), ctx).atLimit).toBe('MAX');
    expect(recommend(synthetic(200, 3), ctx).atLimit).toBe('MIN');
    expect(recommend(synthetic(40, 30), ctx).atLimit).toBeNull(); // 월 5건 ÷ 매물 40 ≈ 다산동 평균
  });

  it('거래 1건짜리 단지는 다산동 평균 쪽으로 수축된다 (과도한 할인 방지)', () => {
    const tiny = recommend(synthetic(1, 1), ctx);
    expect(tiny.discount).toBeLessThan(ENGINE_PARAMS.maxRecDiscount);
  });

  it('판정이 한쪽으로 몰리지 않는다 (분포 검증)', () => {
    const grades = ds.complexes.map((c) => recommend(c, ctx).grade);
    const count = (g: string) => grades.filter((x) => x === g).length;
    for (const g of ['FAST', 'BALANCED', 'SLOW']) expect(count(g)).toBeGreaterThan(0);
    expect(Math.max(count('FAST'), count('BALANCED'), count('SLOW'))).toBeLessThan(ds.complexes.length * 0.7);
  });
});

describe('면적대 (소형 ≤60㎡ · 중형 60~86㎡ · 대형 >86㎡)', () => {
  it('경계', () => {
    expect(areaBandOf(59.99)).toBe('SMALL');
    expect(areaBandOf(74.9)).toBe('MEDIUM');
    expect(areaBandOf(84.99)).toBe('MEDIUM');
    expect(areaBandOf(99.9)).toBe('LARGE');
  });

  it('면적대 매물·거래를 합산하고, 거래가 없는 면적대는 단지 값 쪽으로 당긴다', () => {
    // 중형: 매물 10 / 거래 30 (빠름), 대형: 매물 30 / 거래 0
    const c = withBands([{ m2: 84.9, listings: 10, sales: 30 }, { m2: 120, listings: 30, sales: 0 }]);
    const medium = recommend(c, ctx, 'MEDIUM');
    const large = recommend(c, ctx, 'LARGE');
    const whole = recommend(c, ctx);
    expect(medium.metrics.saleListings).toBe(10);
    expect(medium.metrics.brokeredSales).toBe(30);
    expect(medium.discount).toBeGreaterThan(whole.discount);
    expect(large.discount).toBeLessThan(whole.discount);
    // 거래 0건이어도 가상 거래 K건 때문에 0배로 떨어지지 않는다
    expect(large.speedRatio).toBeGreaterThan(0.1);
  });

  it('면적대에 매물·거래가 모두 없으면 단지 값 그대로', () => {
    const c = withBands([{ m2: 84.9, listings: 20, sales: 15 }]);
    expect(recommend(c, ctx, 'SMALL').speedRatio).toBeCloseTo(recommend(c, ctx).speedRatio as number);
  });

  it('순위는 같은 면적대 안에서 1위 = 가장 빨리 소화', () => {
    const ratios = bandRatios(ds, ctx);
    expect(ratios.MEDIUM.length).toBeGreaterThan(ratios.SMALL.length);
    const top = Math.max(...ratios.MEDIUM);
    expect(rankAmong(top, ratios.MEDIUM)).toEqual({ position: 1, total: ratios.MEDIUM.length });
  });
});

describe('슬라이더 4색 구간 (추천값 기준으로 움직인다)', () => {
  it('0~20% WIDE · 20%~추천 RECOMMENDED · 추천~+10%p CAUTION · 그 이상 RISK', () => {
    expect(feeZone(0.2, 0.36)).toBe('WIDE');
    expect(feeZone(0.3, 0.36)).toBe('RECOMMENDED');
    expect(feeZone(0.36, 0.36)).toBe('RECOMMENDED');
    expect(feeZone(0.4, 0.36)).toBe('CAUTION');
    expect(feeZone(0.46, 0.36)).toBe('CAUTION');
    expect(feeZone(0.47, 0.36)).toBe('RISK');
  });

  it('추천이 20%면 초록(RECOMMENDED) 구간이 없다', () => {
    expect(feeZone(0.2, 0.2)).toBe('WIDE');
    expect(feeZone(0.21, 0.2)).toBe('CAUTION');
    expect(feeZone(0.31, 0.2)).toBe('RISK');
  });
});

describe('복비 견적 (법정 상한·하한)', () => {
  it('법정 구간 경계: 2억·9억·12억·15억 / 전세 5천·1억·6억', () => {
    expect(calculateLegalCommission(199_999_999, '매매').ratePercent).toBe(0.5);
    expect(calculateLegalCommission(200_000_000, '매매').ratePercent).toBe(0.4);
    expect(calculateLegalCommission(900_000_000, '매매').ratePercent).toBe(0.5);
    expect(calculateLegalCommission(1_200_000_000, '매매').ratePercent).toBe(0.6);
    expect(calculateLegalCommission(1_500_000_000, '매매').ratePercent).toBe(0.7);
    expect(calculateLegalCommission(50_000_000, '전세').ratePercent).toBe(0.4);
    expect(calculateLegalCommission(100_000_000, '전세').ratePercent).toBe(0.3);
    expect(calculateLegalCommission(600_000_000, '전세').ratePercent).toBe(0.4);
  });

  it('보너스를 더해도 합계는 법정 상한을 넘지 않는다 (제33조)', () => {
    const q = computeCommissionQuote({ basisPriceWon: 1_140_700_000, tradeType: '매매', proposedWon: 5_700_000, bonusWon: 500_000 });
    expect(q.totalWon).toBe(q.legal.maxWon);
    expect(q.isCapped).toBe(true);
    expect(q.savedWon).toBe(0);
  });

  it('제안 복비는 법정 상한의 30% 아래로 내려가지 않는다', () => {
    const q = computeCommissionQuote({ basisPriceWon: 1_000_000_000, tradeType: '매매', proposedWon: 1_000_000 });
    expect(q.proposedWon).toBe(1_500_000);
    expect(q.isRaisedToFloor).toBe(true);
    expect(q.discount).toBeCloseTo(0.7);
  });

  it('제안 가능한 최대 할인(70%)은 제안 하한(상한의 30%)과 맞물린다', () => {
    expect(1 - ENGINE_PARAMS.maxProposalDiscount).toBeCloseTo(COMMISSION_FLOOR_RATIO);
  });
});
