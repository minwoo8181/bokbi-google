/**
 * 복비 시장 분석 엔진 v4 — 면적대별 매물 소화 속도로 추천 할인율(20~50%)을 정한다.
 *
 * 설계 근거: 2026-10-24 대표님 grill 세션 합의 (v3 "기준 40% + 건당 보수 + 희소도" 대체)
 *  - 할인을 움직이는 데이터는 수요·공급 하나: 최근 6개월 중개 실거래 ÷ 현재 매물을 다산동 중앙 단지와 비교한 비율.
 *    v3의 건당 보수 항(비싼 집일수록 할인↑)은 외부 근거가 없고 화면에 설명할 수 없어 폐지했다
 *    (균형 시장 최고가 단지가 보수 크기만으로 50%에 닿았다).
 *  - 비율 0.5배 이하 20% · 1배 30% · 2배 이상 50%, 사이는 log2로 연속. 20% 미만은 할인 효과가 없고 50% 초과는 중개사가 맡기 어렵다.
 *  - 같은 단지라도 면적대(소형·중형·대형)마다 소화 속도가 크게 달라 면적대로 계산하고, 표본이 적으면 단지 값 쪽으로 당긴다.
 *    평형 하나하나로는 나누지 않는다: 네이버는 같은 84㎡를 타입별로 쪼개 매물을 세지만 실거래는 타입 구분이 없다.
 *  - 20/30/50%·기준점 0.5/2배·노랑 폭 10%p는 파일럿 매칭률(할인 구간별 중개사 요청률)로 보정할 값이다.
 *  - 같은 입력이면 항상 같은 출력 (LLM은 숫자를 만들지 않는다).
 */
import { calculateLegalCommission } from '@/lib/commission';

export type TradeTuple = [date: string, exclusiveM2: number, priceManwon: number, floor: number | null, isBrokered: 0 | 1];

export interface PyeongListing {
  /** 네이버 타입명 (33A·33B 등) */
  typeName?: string;
  supplyM2: number;
  exclusiveM2: number;
  supplyPyeong: number;
  sale: number;
  jeonse: number;
}

export interface ComplexMarket {
  name: string;
  households: number | null;
  buildYear: number | null;
  lots: string[];
  id: number;
  listings: { sale: number; jeonse: number; minAskManwon: number | null };
  pyeongs: PyeongListing[];
  trades: TradeTuple[];
  /** 전세 실거래 [계약일, 전용면적, 보증금(만원), 층, 신규계약=1] */
  rents?: TradeTuple[];
}

/** 분석 대상 시장 — 매매는 중개거래, 전세는 신규 계약만 매물 소화로 본다 */
export type MarketKind = 'sale' | 'jeonse';

const series = (c: ComplexMarket, kind: MarketKind) =>
  kind === 'sale'
    ? { trades: c.trades, listings: c.listings.sale, pyeongListings: (p: PyeongListing) => p.sale }
    : { trades: c.rents ?? [], listings: c.listings.jeonse, pyeongListings: (p: PyeongListing) => p.jeonse };

export interface MarketDataset {
  meta: { observedAt: string; counts: Record<string, number>; sources: Record<string, string> };
  region: Record<string, unknown>;
  complexes: ComplexMarket[];
}

/**
 * 추천 기준 버전: 의뢰마다 같이 저장된다(lib/requests/recommendationSnapshot). ENGINE_PARAMS를 바꾸면 이 버전을 올리고
 * __tests__/policyVersion.test.ts의 값도 같이 고친다 (안 고치면 테스트가 실패)
 */
export const RECOMMENDATION_POLICY_VERSION = 'v1-2026-10-29';

export const ENGINE_PARAMS = {
  /**
   * 시장 위치(희소도) 집계 창 (일). 2026-10-22 90일 → 6개월: 연속 두 창 순위 상관 0.18 → 0.45,
   * 단지당 중개거래 중위 8건 → 22건 (대표님 지적: 표본이 너무 작다)
   */
  windowDays: 182,
  /** 실거래 신고 기한 — 최근 30일은 신고가 덜 들어와 창에서 뺀다 */
  reportLagDays: 30,
  /** 표본이 적은 단지를 다산동 평균 쪽으로 당기는 가상 거래 수 */
  pseudoSales: 3,
  /** 추천 범위 끝: 이보다 적으면 집주인이 따로 협의할 때와 차이가 없다 (대표님 2026-10-24) */
  minRecDiscount: 0.2,
  /** 다산동 중앙 단지(비율 1배)와 데이터 부족 단지의 추천 */
  midRecDiscount: 0.3,
  /** 추천 범위 끝 = 중개사 부담선 (대표님 확정 2026-10-22): 이보다 크면 중개사가 맡기 어렵다 */
  maxRecDiscount: 0.5,
  /** 이 비율 이하(매물이 거래의 2배 이상 쌓임)면 20% */
  slowAnchor: 0.5,
  /** 이 비율 이상이면 50% */
  fastAnchor: 2,
  /** 면적대 흡수율을 단지 흡수율 쪽으로 당기는 가상 거래 수 (거래가 적은 면적대가 튀지 않게) */
  bandShrinkK: 6,
  /** 집주인이 제안할 수 있는 최대 할인 = 법정 상한의 30%까지 (COMMISSION_FLOOR_RATIO와 짝) */
  maxProposalDiscount: 0.7,
  /** 건당 보수·단지 기준가 집계 기간 (개월) — 중개사 화면(Phase 5)의 다산동 1건 기준 보수용 */
  priceWindowMonths: 6,
  minMomentumSample: 3,
  /** 시장 위치 문구 경계 (다산동 중앙 단지 대비 비율). 할인 계산에는 쓰지 않는다 */
  fastRatio: 1.25,
  slowRatio: 0.75,
  /** 추천값에서 이만큼 더 깎으면 매칭이 어려운 구간 (파일럿 매칭률로 조정) */
  cautionSpan: 0.1,
  /** 이 할인 이하(법정 상한의 80% 이상)는 많은 중개사가 요청할 수 있는 구간 */
  wideZoneMaxDiscount: 0.2,
  /** 추천 구간 폭 (±) */
  bandHalfWidth: 0.025,
} as const;

export type MarketGrade = 'FAST' | 'BALANCED' | 'SLOW' | 'UNKNOWN';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
/** 슬라이더 구간: 법정 상한 80~100%(많은 요청) / 추천까지 / 추천 +10%p까지 / 그 이상 */
export type FeeZone = 'WIDE' | 'RECOMMENDED' | 'CAUTION' | 'RISK';

/** 면적대: 소형 60㎡ 이하 · 중형 60~86㎡ · 대형 86㎡ 초과 (전용면적) */
export type AreaBand = 'SMALL' | 'MEDIUM' | 'LARGE';
export const AREA_BANDS: Record<AreaBand, { min: number; max: number }> = {
  SMALL: { min: 0, max: 60.5 },
  MEDIUM: { min: 60.5, max: 86 },
  LARGE: { min: 86, max: 1000 },
};
export const areaBandOf = (exclusiveM2: number): AreaBand => (exclusiveM2 < 60.5 ? 'SMALL' : exclusiveM2 < 86 ? 'MEDIUM' : 'LARGE');
/** inScope는 양 끝을 포함하므로 위쪽 경계를 살짝 안으로 */
const bandRange = (b: AreaBand) => ({ min: AREA_BANDS[b].min, max: AREA_BANDS[b].max - 1e-9 });

export interface Scope {
  /** 매매(기본) 또는 전세 */
  kind?: MarketKind;
  /** 전용면적 범위. 없으면 단지 전체 */
  exclusiveM2?: { min: number; max: number };
}

export interface ComplexMetrics {
  name: string;
  windowStart: string;
  windowEnd: string;
  /** 창 안의 중개거래 건수 */
  brokeredSales: number;
  /** 최근 12개월 전체 거래 건수 (직거래 포함) */
  sales12m: number;
  saleListings: number;
  /** 재고 개월수 (매물 ÷ 월 중개거래). 계산 불가면 null */
  monthsOfInventory: number | null;
  /** 월 흡수율 (수축 보정 후) */
  absorption: number | null;
  /** 3개월 내 성사 확률 */
  sellProb3m: number | null;
  /** 최근 6개월 vs 직전 6개월 ㎡당 중위가 변화율 */
  momentum: number | null;
}

const DAY = 864e5;
const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const fromDay = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const inScope = (m2: number, scope?: Scope) =>
  !scope?.exclusiveM2 || (m2 >= scope.exclusiveM2.min && m2 <= scope.exclusiveM2.max);

/** 기본 지표 (수축 보정 전 원값 + 창 정보) */
export function rawMetrics(c: ComplexMarket, observedAt: string, scope?: Scope) {
  const end = toDay(observedAt) - ENGINE_PARAMS.reportLagDays;
  const start = end - ENGINE_PARAMS.windowDays;
  const s = series(c, scope?.kind ?? 'sale');
  const trades = s.trades.filter((t) => inScope(t[1], scope));
  const inWin = (t: TradeTuple, s: number, e: number) => {
    const d = toDay(t[0]);
    return d > s && d <= e;
  };
  const brokeredSales = trades.filter((t) => t[4] === 1 && inWin(t, start, end)).length;
  const sales12m = trades.filter((t) => inWin(t, end - 365, end)).length;
  const saleListings = scope?.exclusiveM2
    ? c.pyeongs.filter((p) => inScope(p.exclusiveM2, scope)).reduce((sum, p) => sum + s.pyeongListings(p), 0)
    : s.listings;

  const perM2 = (s: number, e: number) => trades.filter((t) => inWin(t, s, e) && t[1] > 0).map((t) => t[2] / t[1]);
  const recent = perM2(end - 182, end);
  const prior = perM2(end - 365, end - 182);
  const n = ENGINE_PARAMS.minMomentumSample;
  const mRecent = recent.length >= n ? median(recent) : null;
  const mPrior = prior.length >= n ? median(prior) : null;
  const momentum = mRecent !== null && mPrior !== null && mPrior > 0 ? mRecent / mPrior - 1 : null;

  return { start, end, brokeredSales, sales12m, saleListings, momentum };
}

/** 다산동 사전분포: 전체 월 흡수율 (중개거래 ÷ 매물 개월) */
export function dongPriorAbsorption(ds: MarketDataset, kind: MarketKind = 'sale'): number {
  let sales = 0;
  let listingMonths = 0;
  for (const c of ds.complexes) {
    const r = rawMetrics(c, ds.meta.observedAt, { kind });
    if (r.saleListings > 0) {
      sales += r.brokeredSales;
      listingMonths += r.saleListings * (ENGINE_PARAMS.windowDays / 30);
    }
  }
  return listingMonths > 0 ? sales / listingMonths : 0.05;
}

/**
 * toward: 수축 대상. 기본은 다산동 사전분포(가상 거래 pseudoSales건). 면적대는 단지 흡수율로 일어난
 * 가상 거래 bandShrinkK건을 더한다 — (거래 + K) ÷ (매물 × 개월 + K ÷ 단지 흡수율). 매물·거래가 모두 0이면 단지 값 그대로.
 */
export function computeMetrics(
  c: ComplexMarket,
  observedAt: string,
  prior: number,
  scope?: Scope,
  toward?: { absorption: number; pseudoSales: number },
): ComplexMetrics {
  const r = rawMetrics(c, observedAt, scope);
  const months = ENGINE_PARAMS.windowDays / 30;
  const target = toward?.absorption ?? prior;
  const k = toward ? toward.pseudoSales : ENGINE_PARAMS.pseudoSales;
  let absorption: number | null = null;
  if (scope?.kind === 'jeonse') {
    // 전세는 매물보다 신규 계약이 많아 확률이 1에 붙는다 → 상한 없는 월 소화 배수로 비교
    absorption = r.brokeredSales > 0 || r.saleListings > 0 || toward ? (r.brokeredSales + k) / (r.saleListings * months + k / target) : null;
  } else if (r.saleListings > 0 || toward) {
    absorption = Math.min(1, (r.brokeredSales + k) / (r.saleListings * months + k / target));
  } else if (r.brokeredSales > 0) {
    absorption = 1; // 매물이 하나도 없는데 거래가 있다 = 나오자마자 팔린다
  }
  return {
    name: c.name,
    windowStart: fromDay(r.start),
    windowEnd: fromDay(r.end),
    brokeredSales: r.brokeredSales,
    sales12m: r.sales12m,
    saleListings: r.saleListings,
    monthsOfInventory: r.brokeredSales > 0 ? r.saleListings / (r.brokeredSales / months) : null,
    absorption,
    sellProb3m: absorption === null ? null : 1 - Math.pow(1 - Math.min(1, absorption), 3),
    momentum: r.momentum,
  };
}

export interface Recommendation {
  grade: MarketGrade;
  confidence: Confidence;
  /** 데이터 부족으로 다산동 중앙 단지와 같은 30%를 줬는지 */
  isGeneric: boolean;
  /** 추천 할인율 (법정 상한 대비, 0~1) */
  discount: number;
  band: { min: number; max: number };
  /** 추천 범위 끝(20% 또는 50%)에 닿았는지 */
  atLimit: 'MIN' | 'MAX' | null;
  /** 30%를 준 이유 (데이터 부족만). 화면에서 사실 그대로 밝힌다 */
  defaultReason: 'NO_DATA' | null;
  /** 다산동 중앙 단지 대비 매물 소화 속도 (월 거래 ÷ 매물). 1보다 크면 매물이 빨리 소화된다 */
  speedRatio: number | null;
  /** 계산한 면적대. 없으면 단지 전체 */
  areaBand: AreaBand | null;
  /** 판정에 쓴 지표 (면적대를 주면 면적대, 아니면 단지 전체) */
  metrics: ComplexMetrics;
  /** 단지 전체 지표 (데이터 부족 판정·수축 기준) */
  complexMetrics: ComplexMetrics;
}

export interface EngineContext {
  kind: MarketKind;
  observedAt: string;
  prior: number;
  /** 다산동 중앙 단지의 월 흡수율 (시장 위치 비율의 기준) */
  a0: number;
  /** 다산동 최근 6개월 거래 1건당 법정 상한 보수 중위값 (원). 중개사 화면(Phase 5) 전용, 할인 계산에는 쓰지 않는다 */
  refFeeWon: number;
  /** refFeeWon 계산에 쓴 거래 건수 */
  refDeals: number;
}

const tradeType = (kind: MarketKind) => (kind === 'sale' ? '매매' : '전세') as '매매' | '전세';
const recentTrades = (c: ComplexMarket, kind: MarketKind, observedAt: string, months: number) => {
  const end = toDay(observedAt);
  return series(c, kind).trades.filter((t) => t[4] === 1 && end - toDay(t[0]) <= months * 30.4);
};

/** 데이터셋 전체에서 기준값(사전분포, 중앙 흡수율, 1건당 기준 보수)을 만든다 */
export function buildContext(ds: MarketDataset, kind: MarketKind = 'sale'): EngineContext {
  const prior = dongPriorAbsorption(ds, kind);
  const all = ds.complexes.map((c) => computeMetrics(c, ds.meta.observedAt, prior, { kind }));
  const a0 = median(all.filter((m) => m.brokeredSales > 0 && m.absorption !== null).map((m) => m.absorption as number)) ?? prior;
  const fees = ds.complexes.flatMap((c) =>
    recentTrades(c, kind, ds.meta.observedAt, ENGINE_PARAMS.priceWindowMonths).map((t) => calculateLegalCommission(t[2] * 10000, tradeType(kind)).maxWon),
  );
  return { kind, observedAt: ds.meta.observedAt, prior, a0, refFeeWon: median(fees) ?? 0, refDeals: fees.length };
}

/**
 * 할인 곡선: 비율 0.5배 이하 20% · 1배 30% · 2배 이상 50%. 사이는 log2로 연속
 * (2배가 될 때마다 같은 폭 — 1.2배 35%, 1.4배 40%, 1.7배 45%)
 */
export function discountFromRatio(ratio: number): number {
  const P = ENGINE_PARAMS;
  const l = Math.log2(ratio);
  return l >= 0
    ? P.midRecDiscount + (P.maxRecDiscount - P.midRecDiscount) * Math.min(1, l / Math.log2(P.fastAnchor))
    : P.midRecDiscount - (P.midRecDiscount - P.minRecDiscount) * Math.min(1, l / Math.log2(P.slowAnchor));
}

/**
 * 추천 할인. areaBand를 주면 그 면적대의 매물·거래로 판단하고(단지 값 쪽으로 수축), 없으면 단지 전체.
 * 층·가격은 쓰지 않는다 — 같은 단지·면적대면 평형·층이 달라도 할인율이 같고 금액(법정 상한)만 다르다.
 */
export function recommend(c: ComplexMarket, ctx: EngineContext, areaBand?: AreaBand): Recommendation {
  const P = ENGINE_PARAMS;
  const complexMetrics = computeMetrics(c, ctx.observedAt, ctx.prior, { kind: ctx.kind });
  const metrics =
    areaBand && complexMetrics.absorption !== null
      ? computeMetrics(c, ctx.observedAt, ctx.prior, { kind: ctx.kind, exclusiveM2: bandRange(areaBand) }, { absorption: complexMetrics.absorption, pseudoSales: P.bandShrinkK })
      : complexMetrics;
  const band = (d: number) => ({
    min: clamp(d - P.bandHalfWidth, P.minRecDiscount, P.maxRecDiscount),
    max: clamp(d + P.bandHalfWidth, P.minRecDiscount, P.maxRecDiscount),
  });

  // 데이터 부족: 단지 최근 12개월 거래가 3건 미만이면 거짓 판정 대신 다산동 중앙 단지와 같은 30%
  if (complexMetrics.absorption === null || complexMetrics.sales12m < 3 || metrics.absorption === null) {
    const d = P.midRecDiscount;
    return {
      grade: 'UNKNOWN',
      confidence: 'LOW',
      isGeneric: true,
      discount: d,
      band: band(d),
      atLimit: null,
      defaultReason: 'NO_DATA',
      speedRatio: null,
      areaBand: areaBand ?? null,
      metrics,
      complexMetrics,
    };
  }

  const speedRatio = metrics.absorption / ctx.a0;
  const discount = discountFromRatio(speedRatio);
  const eps = 1e-9;
  const grade: MarketGrade = speedRatio >= P.fastRatio ? 'FAST' : speedRatio <= P.slowRatio ? 'SLOW' : 'BALANCED';
  const deals = metrics.brokeredSales;
  return {
    grade,
    confidence: deals >= 12 ? 'HIGH' : deals >= 6 ? 'MEDIUM' : 'LOW',
    isGeneric: false,
    discount,
    band: band(discount),
    atLimit: discount <= P.minRecDiscount + eps ? 'MIN' : discount >= P.maxRecDiscount - eps ? 'MAX' : null,
    defaultReason: null,
    speedRatio,
    areaBand: areaBand ?? null,
    metrics,
    complexMetrics,
  };
}

/** 면적대별 다산동 시장 위치 비율 목록 (순위 표기용). 매물이나 거래가 있는 면적대만 */
export function bandRatios(ds: MarketDataset, ctx: EngineContext): Record<AreaBand, number[]> {
  const out: Record<AreaBand, number[]> = { SMALL: [], MEDIUM: [], LARGE: [] };
  for (const c of ds.complexes) {
    for (const b of Object.keys(AREA_BANDS) as AreaBand[]) {
      const r = recommend(c, ctx, b);
      if (r.speedRatio !== null && (r.metrics.saleListings > 0 || r.metrics.brokeredSales > 0)) out[b].push(r.speedRatio);
    }
  }
  return out;
}

/** 같은 면적대 안 순위 (1위 = 매물이 가장 빨리 소화) */
export const rankAmong = (ratio: number, ratios: number[]) => ({ position: 1 + ratios.filter((x) => x > ratio + 1e-12).length, total: ratios.length });

/**
 * 슬라이더 4색 구간 (대표님 확정 2026-10-24, 추천값 기준으로 움직인다):
 * 할인 0~20%(법정 상한의 80~100%) WIDE · 20%~추천 RECOMMENDED · 추천~+10%p CAUTION · 그 이상(제안 하한 70%까지) RISK.
 * 추천이 20%면 RECOMMENDED 구간이 없다 (매물이 넘치는 단지는 추천과 주의 사이에 여유가 없다).
 */
export function feeZone(discount: number, recDiscount: number): FeeZone {
  const P = ENGINE_PARAMS;
  const eps = 1e-9;
  if (discount <= P.wideZoneMaxDiscount + eps) return 'WIDE';
  if (discount <= recDiscount + eps) return 'RECOMMENDED';
  if (discount <= recDiscount + P.cautionSpan + eps) return 'CAUTION';
  return 'RISK';
}
