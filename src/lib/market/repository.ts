// 서버 컴포넌트에서만 import 한다 (데이터셋 390KB가 브라우저 번들에 들어가지 않도록)
import dataset from '@/data/market/dasan-market.json';
import unitsDataset from '@/data/market/dasan-units.json';
import complexInfoDataset from '@/data/market/dasan-complex-info.json';
import {
  areaBandOf,
  bandRatios,
  buildContext,
  median,
  rankAmong,
  recommend,
  type AreaBand,
  type ComplexMarket,
  type EngineContext,
  type MarketDataset,
  type MarketKind,
  type TradeTuple,
} from '@/lib/analysis/marketEngine';
import type { ApartmentStat } from '@/types';
import { MATCH_CASE_EXAMPLES } from '@/data/market/matchCaseExamples';
import { calculateLegalCommission, computeCommissionQuote } from '@/lib/commission';
import type {
  ContractRecord,
  FloorCategory,
  MatchCaseFeed,
  PriceBasis,
  PyeongDetailStat,
  PyeongMarketSide,
  PyeongType,
  RecommendationView,
  ReferencePrice,
  ComplexUnits,
  TradeSeriesPoint,
  UnitDong,
} from '@/components/analysis/types';
import { floorBandOf } from '@/lib/market/floorBand';
import askingDataset from '@/data/market/dasan-asking.json';
import { ASKING_TABS, askingLatest, askingMonthly, parseFloorRaw, type AskingRow } from '@/lib/market/askingPrice';
import { buildDebateContext, buildDebateTopics, type DebateContext, type GeneratedDebate } from '@/lib/market/debateTopics';

/**
 * 다산동 시장 데이터 저장소 (서버 전용).
 * 지금은 빌드된 JSON을 읽고, 배포 단계에서 이 파일 내부만 Supabase 조회로 바꾼다 — 화면 코드는 그대로.
 */
const ds = dataset as unknown as MarketDataset;
const ctx: Record<MarketKind, EngineContext> = { sale: buildContext(ds, 'sale'), jeonse: buildContext(ds, 'jeonse') };
/** 면적대별 다산동 순위 기준 (첫 요청 때 한 번 계산) */
const ratiosCache: Partial<Record<MarketKind, Record<AreaBand, number[]>>> = {};
const ratiosOf = (kind: MarketKind) => (ratiosCache[kind] ??= bandRatios(ds, ctx[kind]));

const DAY = 864e5;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const OBS = day(ds.meta.observedAt);
const PYEONG_TOLERANCE_M2 = 1.5;
const SQM_PER_PYEONG = 3.3058;

/** 지금 나온 매물 호가 (scripts/build-asking-prices.mjs, 매주 쌓임). 단지 id → 매매 매물 */
const askingDs = askingDataset as unknown as { dates: string[]; complexes: Record<string, [number, number, number, string][]> };
const askingRowsCache = new Map<number, AskingRow[]>();
const askingRowsOf = (id: number): AskingRow[] => {
  let rows = askingRowsCache.get(id);
  if (!rows) {
    rows = (askingDs.complexes[String(id)] ?? []).map(([di, m2, price, raw]) => ({ date: askingDs.dates[di], exclusiveM2: m2, priceManwon: price, ...parseFloorRaw(raw) }));
    askingRowsCache.set(id, rows);
  }
  return rows;
};

const seriesOf = (c: ComplexMarket, kind: MarketKind): TradeTuple[] => (kind === 'sale' ? c.trades : c.rents ?? []);
const within = (t: TradeTuple, months: number) => OBS - day(t[0]) <= months * 30.4;
const perM2 = (ts: TradeTuple[]) => ts.filter((t) => t[1] > 0).map((t) => t[2] / t[1]);
const FLOORS: FloorCategory[] = ['low', 'mid', 'high'];
const shortDate = (iso: string) => `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;

/** 다산동 전체 ㎡당 중위가 (최근 12개월) — 단지 데이터가 전혀 없을 때만 쓰는 최후 기준 */
const dongPerM2: Record<MarketKind, number | null> = {
  sale: median(perM2(ds.complexes.flatMap((c) => c.trades.filter((t) => within(t, 12))))),
  jeonse: median(perM2(ds.complexes.flatMap((c) => (c.rents ?? []).filter((t) => within(t, 12))))),
};

function priceFor(c: ComplexMarket, kind: MarketKind, group: TradeTuple[], exclusiveM2: number) {
  const r6 = group.filter((t) => within(t, 6)).map((t) => t[2]);
  if (r6.length >= 3) return { price: median(r6), basis: 'PYEONG_6M' as PriceBasis, n: r6.length };
  const r12 = group.filter((t) => within(t, 12)).map((t) => t[2]);
  if (r12.length >= 1) return { price: median(r12), basis: 'PYEONG_12M' as PriceBasis, n: r12.length };
  const cm2 = median(perM2(seriesOf(c, kind).filter((t) => within(t, 12))));
  if (cm2 !== null) return { price: Math.round(cm2 * exclusiveM2), basis: 'COMPLEX_M2' as PriceBasis, n: 0 };
  const dm2 = dongPerM2[kind];
  if (dm2 !== null) return { price: Math.round(dm2 * exclusiveM2), basis: 'DONG_M2' as PriceBasis, n: 0 };
  return { price: null, basis: 'NONE' as PriceBasis, n: 0 };
}

function toView(c: ComplexMarket, kind: MarketKind, exclusiveM2: number): RecommendationView {
  // 할인은 이 평형이 속한 면적대의 매물 소화 속도로만 정한다 (층·가격은 금액에만 쓴다)
  const band = areaBandOf(exclusiveM2);
  const r = recommend(c, ctx[kind], band);
  return {
    grade: r.grade,
    confidence: r.confidence,
    isGeneric: r.isGeneric,
    discount: r.discount,
    band: r.band,
    atLimit: r.atLimit,
    defaultReason: r.defaultReason,
    areaBand: band,
    speedRatio: r.speedRatio,
    // 면적대에 매물·거래가 하나도 없으면 단지 값을 그대로 쓴 것이라 면적대 순위를 매기지 않는다
    rank: r.speedRatio === null || (r.metrics.saleListings === 0 && r.metrics.brokeredSales === 0) ? null : rankAmong(r.speedRatio, ratiosOf(kind)[band]),
    complexSales12m: r.complexMetrics.sales12m,
    listings: r.metrics.saleListings,
    recentDeals: r.metrics.brokeredSales,
    monthsOfInventory: r.metrics.monthsOfInventory,
    momentum: r.metrics.momentum,
    windowStart: r.metrics.windowStart,
    windowEnd: r.metrics.windowEnd,
  };
}

function marketSide(c: ComplexMarket, kind: MarketKind, exclusiveM2: number): PyeongMarketSide {
  // 매매 가격 통계는 중개거래만 (직거래는 가족 간 거래 등 시세와 동떨어진 값이 많다)
  const all = seriesOf(c, kind).filter((t) => Math.abs(t[1] - exclusiveM2) <= PYEONG_TOLERANCE_M2);
  const group = kind === 'sale' ? all.filter((t) => t[4] === 1) : all;
  const { price, basis, n } = priceFor(c, kind, group, exclusiveM2);
  const last12 = group.filter((t) => within(t, 12));
  // 기준 실거래: 매매는 중개거래, 전세는 신규 계약(갱신은 상한 5% 제한이라 시세가 아니다). 최근순
  const pool12 = all.filter((t) => within(t, 12)).sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  const fresh = pool12.filter((t) => t[4] === 1);
  // 전세 신규 계약이 하나도 없으면 갱신 계약이라도 쓴다 (매매 직거래는 쓰지 않는다)
  const refTrades = fresh.length > 0 || kind === 'sale' ? fresh : pool12;
  const reference = (cat: FloorCategory): ReferencePrice | null => {
    const band = refTrades.filter((t) => t[3] !== null && floorBandOf(t[3]) === cat);
    const inBand = band[0];
    const pick = inBand ?? refTrades[0];
    if (pick) {
      const recent3 = band.slice(0, 3).map((t) => t[2]);
      const bandRecent = recent3.length >= 2 ? { count: recent3.length, minManwon: Math.min(...recent3), maxManwon: Math.max(...recent3) } : null;
      return { priceManwon: pick[2], source: inBand ? 'FLOOR' : 'OTHER_FLOOR', date: shortDate(pick[0]), floor: pick[3], bandRecent, bandCount: band.length, recommendation: toView(c, kind, exclusiveM2) };
    }
    // 이 평형 12개월 거래가 없으면 ㎡당 환산 (날짜·층 없음)
    if (price === null || (basis !== 'COMPLEX_M2' && basis !== 'DONG_M2')) return null;
    return { priceManwon: price, source: basis, date: null, floor: null, bandRecent: null, bandCount: 0, recommendation: toView(c, kind, exclusiveM2) };
  };
  const latest = refTrades[0];
  const series = monthlySeries(group);
  const contracts = recentContracts(group, 10);
  // 층 탭: 같은 규칙을 그 층 구간 거래에만 (층이 비어 있는 거래는 빠진다)
  const byFloor = Object.fromEntries(
    FLOORS.map((f) => {
      const inBand = group.filter((t) => t[3] !== null && floorBandOf(t[3]) === f);
      return [f, { series: monthlySeries(inBand), contracts: recentContracts(inBand, 3) }];
    }),
  ) as PyeongMarketSide['byFloor'];
  const prices12 = last12.map((t) => t[2]);
  // 호가: 매매만, 같은 평형(전용 ±1.5㎡) 매물
  const askRows = kind === 'sale' ? askingRowsOf(c.id).filter((r) => Math.abs(r.exclusiveM2 - exclusiveM2) <= PYEONG_TOLERANCE_M2) : [];
  const asking =
    askRows.length > 0
      ? {
          latest: Object.fromEntries(ASKING_TABS.map((t) => [t, askingLatest(askRows, t)])) as NonNullable<PyeongMarketSide['asking']>['latest'],
          monthly: Object.fromEntries(ASKING_TABS.map((t) => [t, askingMonthly(askRows, t)])) as NonNullable<PyeongMarketSide['asking']>['monthly'],
        }
      : null;
  return {
    medianPrice: price,
    basis,
    sampleSize: n,
    min: prices12.length ? Math.min(...prices12) : null,
    max: prices12.length ? Math.max(...prices12) : null,
    reference: Object.fromEntries(FLOORS.map((f) => [f, reference(f)])) as Record<FloorCategory, ReferencePrice | null>,
    latestFloor: latest && latest[3] !== null ? floorBandOf(latest[3]) : null,
    series,
    contracts,
    byFloor,
    asking,
  };
}

/** 그래프: 달마다 그달 마지막 실거래 1건 (중간값은 실제 거래가가 아니라 쓰지 않는다, 대표님 결정 2026-10-27). 최근 24개월 */
function monthlySeries(trades: TradeTuple[]): TradeSeriesPoint[] {
  const months = new Map<string, TradeTuple[]>();
  for (const t of trades.filter((t) => within(t, 24))) {
    const ym = t[0].slice(0, 7);
    months.set(ym, [...(months.get(ym) ?? []), t]);
  }
  return [...months.keys()].sort().map((ym) => {
    const ts = months.get(ym) as TradeTuple[];
    // 같은 날 거래가 여럿이면 앞의 것 (계약 목록 정렬과 같은 결과)
    const last = ts.reduce((a, b) => (b[0] > a[0] ? b : a));
    return { ym, last: { priceManwon: last[2], date: shortDate(last[0]), floor: last[3] }, count: ts.length };
  });
}

/** 계약 목록: 최근순 n건 */
function recentContracts(trades: TradeTuple[], n: number): ContractRecord[] {
  return [...trades]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .slice(0, n)
    .map((t) => ({ date: shortDate(t[0]), type: `${Math.round(t[1])}㎡`, exclusiveArea: t[1], priceTenThousand: t[2], floor: t[3] ?? 0 }));
}

/** 네이버 평형(공급 타입)을 전용면적 기준으로 묶어 화면용 평형 목록을 만든다 */
export function buildPyeongStats(c: ComplexMarket): PyeongDetailStat[] {
  const groups = new Map<number, typeof c.pyeongs>();
  for (const p of c.pyeongs) {
    const key = Math.round(p.exclusiveM2);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const out: PyeongDetailStat[] = [];
  for (const [key, ps] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const exclusive = Math.round((ps.reduce((s, p) => s + p.exclusiveM2, 0) / ps.length) * 100) / 100;
    const supply = Math.max(...ps.map((p) => p.supplyM2));
    const sale = marketSide(c, 'sale', exclusive);
    const jeonse = marketSide(c, 'jeonse', exclusive);
    // 가격을 어떤 기준으로도 만들 수 없으면 제외. 거래가 없어도 ㎡당 환산이 가능하면 "판정 데이터 부족"으로 보여준다
    if (sale.basis === 'NONE') continue;
    const pyeong = Math.round(supply / SQM_PER_PYEONG);
    const types = pyeongTypesOf(ps);
    out.push({
      id: String(key),
      name: `${pyeong}평 (전용 ${key}㎡)`,
      supplyArea: Math.round(supply * 100) / 100,
      exclusiveArea: exclusive,
      households: 0,
      recentTradeAvgPrice: sale.medianPrice ?? 0,
      recentJeonseAvgPrice: jeonse.medianPrice ?? 0,
      tradePriceMin: sale.min ?? sale.medianPrice ?? 0,
      tradePriceMax: sale.max ?? sale.medianPrice ?? 0,
      jeonsePriceMin: jeonse.min ?? jeonse.medianPrice ?? 0,
      jeonsePriceMax: jeonse.max ?? jeonse.medianPrice ?? 0,
      contracts: sale.contracts,
      market: { sale, jeonse },
      ...(types.length >= 2 ? { types } : {}),
    });
  }
  return out;
}

/** 평형 묶음 안의 네이버 타입 목록. 같은 이름(면적만 조금 다른 중복 등록)은 하나로 합치고 이름순 정렬 */
export function pyeongTypesOf(ps: ComplexMarket['pyeongs']): PyeongType[] {
  const byName = new Map<string, PyeongType>();
  for (const p of ps) {
    const name = (p.typeName ?? '').trim();
    if (!name || byName.has(name)) continue;
    byName.set(name, { name, supplyArea: p.supplyM2, exclusiveArea: p.exclusiveM2 });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
}

function supplyRangeLabel(c: ComplexMarket): string {
  const pys = c.pyeongs.map((p) => Math.round(p.supplyM2 / SQM_PER_PYEONG));
  if (pys.length === 0) return '평형 정보 없음';
  const lo = Math.min(...pys), hi = Math.max(...pys);
  return lo === hi ? `${lo}평` : `${lo}~${hi}평`;
}

export function toApartmentStat(c: ComplexMarket): ApartmentStat {
  const recent = c.trades.filter((t) => within(t, 6)).map((t) => t[2]);
  const recentJ = (c.rents ?? []).filter((t) => within(t, 6)).map((t) => t[2]);
  const sale = recommend(c, ctx.sale);
  return {
    id: c.id,
    apt_name: c.name,
    dong_name: '다산동',
    lat: 0,
    lng: 0,
    pyeong_type: supplyRangeLabel(c),
    total_households: c.households ?? 0,
    built_year: c.buildYear ?? undefined,
    recent_avg_price: median(recent) ?? 0,
    recent_jeonse_avg_price: median(recentJ) ?? 0,
    recent_trade_count: sale.metrics.brokeredSales,
    current_sale_listings: c.listings.sale,
    current_jeonse_listings: c.listings.jeonse,
    min_asking_price: c.listings.minAskManwon ?? 0,
    min_jeonse_asking_price: 0,
    total_saved_commission: 0,
    total_matched_count: 0,
    updated_at: ds.meta.observedAt,
  };
}

export function listComplexes(): ApartmentStat[] {
  return ds.complexes.map(toApartmentStat).sort((a, b) => b.total_households - a.total_households);
}

export function getComplexById(id: number): ComplexMarket | undefined {
  return ds.complexes.find((c) => c.id === id);
}

/**
 * 매칭 사례 피드. 실제 매칭 기록이 생기면 이 함수 내부만 Supabase `match_cases` 조회로 바꾸고 source를 'LIVE'로 내린다.
 * 예시는 법정 요율 단일 엔진으로 금액을 계산해 화면 숫자와 요율이 어긋나지 않게 한다.
 */
export function getMatchCaseFeed(): MatchCaseFeed {
  return {
    source: 'EXAMPLE',
    items: MATCH_CASE_EXAMPLES.map((e) => {
      const basisPriceWon = e.dealPriceManwon * 10000;
      // 사례 표시 할인율이 적어 둔 값을 넘지 않도록 합의 보수는 만 원 단위 올림 (상한은 견적 엔진이 막는다)
      const cap = calculateLegalCommission(basisPriceWon, e.tradeType).maxWon;
      const q = computeCommissionQuote({
        basisPriceWon,
        tradeType: e.tradeType,
        proposedWon: Math.ceil((cap * (1 - e.discount)) / 10000) * 10000,
      });
      return {
        id: e.id,
        complexName: e.complexName,
        pyeongLabel: e.pyeongLabel,
        tradeType: e.tradeType,
        dealPriceManwon: e.dealPriceManwon,
        legalCapWon: q.legal.maxWon,
        agreedFeeWon: q.totalWon,
        savedWon: q.savedWon,
        discount: q.discount,
        matchedAt: null,
      };
    }),
  };
}

export interface AnalysisBundle {
  apartment: ApartmentStat;
  pyeongList: PyeongDetailStat[];
  observedAt: string;
  region: { name: string; saleSupplyDemand: number | null; ym: string | null };
  matchCases: MatchCaseFeed;
  /** 분석 데이터 규모 (추천 근거 카드 부제): 단지 수 · 국토부 실거래 건수 · 현재 매매/전세 매물 수 */
  datasetStats: { complexes: number; trades: number; saleListings: number; jeonseListings: number };
  /** 다산동 최근 6개월 거래 1건당 법정 상한 보수 중위값 (중개사가 받는 금액 카드의 비교 기준) */
  brokerRef: Record<MarketKind, { feeWon: number; deals: number }>;
  /** 이 단지의 건축물대장 동·호 목록 (단지 것만 내려 클라이언트로 전체 파일이 가지 않게) */
  units: ComplexUnits | null;
  /** 단지별 주민 투표 주제 (실데이터로 생성, 계기 없는 틀은 빠짐) */
  debates: GeneratedDebate[];
  /** 학군·주차 (네이버 단지 정보, 없으면 null) */
  complexInfo: ComplexInfo | null;
}

export interface ComplexInfo {
  elementarySchool: string | null;
  elementarySchoolWalkMin: number | null;
  parkingTotal: number | null;
  parkingPerHousehold: number | null;
}
const infoData = complexInfoDataset as unknown as { complexes: Record<string, ComplexInfo> };

/** 투표 비교 기준 (대장 배틀 순위·면적대 전세 중위, 첫 요청 때 한 번 계산) */
let debateCtxCache: DebateContext | null = null;

const unitsData = unitsDataset as unknown as { meta: { fetchedAt: string } | null; complexes: Record<string, UnitDong[]> };

/** 단지의 동·호 목록. 수집되지 않은 단지는 null (모달은 자유 입력으로 대체) */
export function getComplexUnits(id: number): ComplexUnits | null {
  const dongs = unitsData.complexes[String(id)];
  return dongs && unitsData.meta ? { fetchedAt: unitsData.meta.fetchedAt, dongs } : null;
}

export function getAnalysisBundle(id: number): AnalysisBundle | null {
  const c = getComplexById(id);
  if (!c) return null;
  const sdi = ds.region.saleSupplyDemand as { value: number; yearMonth: string } | null;
  return {
    apartment: toApartmentStat(c),
    pyeongList: buildPyeongStats(c),
    observedAt: ds.meta.observedAt,
    region: { name: String(ds.region.name ?? ''), saleSupplyDemand: sdi?.value ?? null, ym: sdi?.yearMonth ?? null },
    matchCases: getMatchCaseFeed(),
    datasetStats: {
      complexes: ds.complexes.length,
      trades: ds.meta.counts.validTrades,
      saleListings: ds.meta.counts.saleListings,
      jeonseListings: ds.meta.counts.jeonseListings,
    },
    brokerRef: {
      sale: { feeWon: ctx.sale.refFeeWon, deals: ctx.sale.refDeals },
      jeonse: { feeWon: ctx.jeonse.refFeeWon, deals: ctx.jeonse.refDeals },
    },
    units: getComplexUnits(id),
    complexInfo: infoData.complexes[String(id)] ?? null,
    debates: buildDebateTopics(c, (debateCtxCache ??= buildDebateContext(ds.complexes, ds.meta.observedAt)), ds.meta.observedAt),
  };
}

/** 검색용 경량 목록 (클라이언트로 내려보낼 최소 필드) */
export function getSearchIndex() {
  return listComplexes().map((a) => ({
    id: a.id,
    apt_name: a.apt_name,
    pyeong_type: a.pyeong_type,
    total_households: a.total_households,
    built_year: a.built_year,
    recent_avg_price: a.recent_avg_price,
    aliases: [] as string[],
  }));
}
