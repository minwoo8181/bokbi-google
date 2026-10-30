import { SITE_CONTENT } from '@/config/siteContent';
import { areaBandOf, median, type AreaBand, type ComplexMarket, type TradeTuple } from '@/lib/analysis/marketEngine';
import { formatPriceTenThousand } from '@/lib/utils';
import { compactComplexName } from '@/data/complexShortNames';

/**
 * 단지별 주민 투표 주제 (대표님 승인 2026-10-24). 숫자는 모두 이 단지 실데이터에서 코드로 뽑는다 — 데이터에 없는 숫자 금지.
 * 계기가 없는 틀은 건너뛴다. Supabase 이후에는 같은 사실(facts)로 AI가 문장만 새로 쓰는 구조로 바꾼다.
 * compare: 투표 결과 대신 보여주는 실데이터 비교 막대 (B안). 실제 집계가 생기면 결과 막대가 따로 붙는다.
 */
export type DebateTemplateKey = 'RECORD' | 'LEADER' | 'SUPPLY' | 'JEONSE' | 'UPGRADE';

export interface DebateCompareSide {
  label: string;
  /** 막대 길이 비교용 원값 */
  value: number;
  /** 화면 표기 (예: "15억", "71건") */
  display: string;
}

export interface GeneratedDebate {
  id: string;
  key: DebateTemplateKey;
  badge: string;
  question: string;
  description: string;
  options: [{ id: string; label: string; votes: number }, { id: string; label: string; votes: number }];
  compare?: [DebateCompareSide, DebateCompareSide];
}

/**
 * 대장 단지 배틀 평형대 (대표님 2026-10-27): ㎡당 순위는 작은 집일수록 높게 나와 소형 단지가 1위가 됨 →
 * 공급 30평대 실거래 중간값끼리 비교, 30평대가 없는 단지는 20평대끼리. 질문에 평형대를 그대로 쓴다 ("다산 30평대 대장은?")
 */
export const LEADER_BANDS = [
  { label: '30평대', minPyeong: 30, maxPyeong: 40 },
  { label: '20평대', minPyeong: 20, maxPyeong: 30 },
] as const;
/** 순위에 넣는 최소 거래 수 (최근 1년 중개거래, 그 평형대) */
export const LEADER_MIN_TRADES = 3;

export interface LeaderRank {
  id: number;
  name: string;
  /** 그 평형대 최근 1년 중개거래 중간값 (만 원) */
  medianManwon: number;
}

/** 단지 전체에서 한 번 계산하는 비교 기준 */
export interface DebateContext {
  /** 평형대별 최근 1년 중개거래 중간값 순위 (1위 = 가장 비쌈), LEADER_BANDS 순서 */
  leader: { label: string; ranking: LeaderRank[] }[];
  /** 다산동 면적대별 최근 1년 신규 전세 중위 (만 원) */
  jeonseBandMedian: Record<AreaBand, number | null>;
}

const DAY = 864e5;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const within = (t: TradeTuple, obs: number, months: number) => obs - day(t[0]) <= months * 30.4;
const between = (t: TradeTuple, obs: number, fromMonths: number, toMonths: number) => {
  const age = obs - day(t[0]);
  return age > fromMonths * 30.4 && age <= toMonths * 30.4;
};
const shortDate = (iso: string) => `${iso.slice(2, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
/** "13억 9,500만" (원 없이 짧게) */
const price = (manwon: number) => formatPriceTenThousand(manwon).replace(/ 원$/, '');
/** 비교용 단지 짧은 이름: 괄호 설명 제거 */
export const shortName = (name: string) => name.replace(/\(.*?\)/g, '').trim();
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`));
const BAND_LABEL: Record<AreaBand, string> = { SMALL: '소형', MEDIUM: '중형', LARGE: '대형' };

/** 거래 전용면적 → 네이버 평형 이름 (같은 면적 묶음의 공급 평 최댓값, 예: "41평") */
function pyeongLabel(c: ComplexMarket, exclusiveM2: number): string | null {
  const group = c.pyeongs.filter((p) => Math.abs(p.exclusiveM2 - exclusiveM2) <= 1.5);
  if (group.length === 0) return null;
  return `${Math.max(...group.map((p) => p.supplyPyeong))}평`;
}

/** 평형대(공급 평 minPyeong 이상 maxPyeong 미만) 최근 1년 중개거래 중간값 순위. 거래가 LEADER_MIN_TRADES건 미만인 단지는 빠진다 */
export function leaderRanking(complexes: ComplexMarket[], obs: number, minPyeong: number, maxPyeong: number): LeaderRank[] {
  return complexes
    .map((c) => {
      const areas = c.pyeongs.filter((p) => p.supplyPyeong >= minPyeong && p.supplyPyeong < maxPyeong).map((p) => p.exclusiveM2);
      const prices = c.trades.filter((t) => t[4] === 1 && within(t, obs, 12) && areas.some((m2) => Math.abs(t[1] - m2) <= 1.5)).map((t) => t[2]);
      return { id: c.id, name: c.name, medianManwon: prices.length >= LEADER_MIN_TRADES ? (median(prices) as number) : null };
    })
    .filter((x): x is LeaderRank => x.medianManwon !== null)
    .sort((a, b) => b.medianManwon - a.medianManwon);
}

export function buildDebateContext(complexes: ComplexMarket[], observedAt: string): DebateContext {
  const obs = day(observedAt);
  const leader = LEADER_BANDS.map((b) => ({ label: b.label, ranking: leaderRanking(complexes, obs, b.minPyeong, b.maxPyeong) }));
  const bands: Record<AreaBand, number[]> = { SMALL: [], MEDIUM: [], LARGE: [] };
  for (const c of complexes) for (const t of c.rents ?? []) if (t[4] === 1 && within(t, obs, 12)) bands[areaBandOf(t[1])].push(t[2]);
  return {
    leader,
    jeonseBandMedian: { SMALL: median(bands.SMALL), MEDIUM: median(bands.MEDIUM), LARGE: median(bands.LARGE) },
  };
}

export function buildDebateTopics(c: ComplexMarket, ctx: DebateContext, observedAt: string): GeneratedDebate[] {
  const T = SITE_CONTENT.analysis.debates.templates;
  const obs = day(observedAt);
  const out: GeneratedDebate[] = [];
  const push = (key: DebateTemplateKey, v: Record<string, string | number>, compare?: [number, string, number, string]) => {
    const t = T[key];
    out.push({
      id: `${c.id}_${key}`,
      key,
      badge: t.badge,
      question: fill(t.question, v),
      description: fill(t.description, v),
      // 실제 집계 전까지 0 — 화면은 결과를 보여주지 않는다
      options: [
        { id: `${c.id}_${key}_A`, label: fill(t.optionA, v), votes: 0 },
        { id: `${c.id}_${key}_B`, label: fill(t.optionB, v), votes: 0 },
      ],
      ...(compare
        ? {
            compare: [
              { label: fill(t.compareA, v), value: compare[0], display: compare[1] },
              { label: fill(t.compareB, v), value: compare[2], display: compare[3] },
            ],
          }
        : {}),
    });
  };

  const brokered12 = c.trades.filter((t) => t[4] === 1 && within(t, obs, 12));

  // 1) 신고가: 최근 1년 중개거래 최고가 vs 그 전 1년(13~24개월 전) 같은 평형 최고가
  const top = [...brokered12].sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? 1 : -1))[0];
  const topPyeong = top ? pyeongLabel(c, top[1]) : null;
  if (top && topPyeong) {
    const prevTop = c.trades
      .filter((t) => t[4] === 1 && between(t, obs, 12, 24) && pyeongLabel(c, t[1]) === topPyeong)
      .reduce((m, t) => Math.max(m, t[2]), 0);
    push(
      'RECORD',
      { pyeong: topPyeong, price: price(top[2]), date: shortDate(top[0]), floor: top[3] ?? '-' },
      prevTop > 0 ? [top[2], price(top[2]), prevTop, price(prevTop)] : undefined,
    );
  }

  // 2) 대장 단지 배틀: 30평대(없으면 20평대) 실거래 중간값 순위에서 바로 위 단지 (1위면 2위와)
  const band = ctx.leader.find((l) => l.ranking.some((r) => r.id === c.id) && l.ranking.length >= 2);
  if (band) {
    const { ranking } = band;
    const idx = ranking.findIndex((r) => r.id === c.id);
    const rival = idx === 0 ? 1 : idx - 1;
    const a = ranking[idx].medianManwon;
    const b = ranking[rival].medianManwon;
    push(
      'LEADER',
      {
        band: band.label,
        // 질문엔 이름을 넣지 않는다 (막대·투표 칸에 있어 반복, 질문이 두 줄로 길어짐) — 이름은 짧은 이름으로
        aBtn: compactComplexName(shortName(c.name)),
        bBtn: compactComplexName(shortName(ranking[rival].name)),
        rankA: idx + 1,
        rankB: rival + 1,
      },
      [a, price(a), b, price(b)],
    );
  }

  // 3) 매도 타이밍: 현재 매매 매물 vs 최근 6개월 중개거래
  const deals6 = c.trades.filter((t) => t[4] === 1 && within(t, obs, 6)).length;
  if (c.listings.sale > 0 || deals6 > 0) {
    push(
      'SUPPLY',
      { listings: c.listings.sale, deals: deals6, observedAt: shortDate(observedAt) },
      [c.listings.sale, `${c.listings.sale}건`, deals6, `${deals6}건`],
    );
  }

  // 4) 전세가 체감: 거래가 가장 많은 평형의 최근 신규 전세 vs 다산동 같은 면적대 신규 전세 중위
  const pyeongCounts = new Map<string, number>();
  for (const t of brokered12) {
    const label = pyeongLabel(c, t[1]);
    if (label) pyeongCounts.set(label, (pyeongCounts.get(label) ?? 0) + 1);
  }
  const mainPyeong = [...pyeongCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const jeonse = (c.rents ?? [])
    .filter((t) => t[4] === 1 && within(t, obs, 12) && pyeongLabel(c, t[1]) === mainPyeong)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))[0];
  if (mainPyeong && jeonse) {
    const band = areaBandOf(jeonse[1]);
    const bandMedian = ctx.jeonseBandMedian[band];
    const ref = bandMedian === null ? null : Math.round(bandMedian / 100) * 100;
    push(
      'JEONSE',
      { pyeong: mainPyeong, price: price(jeonse[2]), date: shortDate(jeonse[0]), floor: jeonse[3] ?? '-', band: BAND_LABEL[band] },
      ref ? [jeonse[2], price(jeonse[2]), ref, price(ref)] : undefined,
    );
  }

  // 5) 평수 갈아타기: 가장 작은·큰 평형 (각 최근 1년 중개거래 2건 이상) 중위가 차이, 100만 원 단위
  const byPyeong = new Map<string, { py: number; prices: number[] }>();
  for (const t of brokered12) {
    const label = pyeongLabel(c, t[1]);
    if (!label) continue;
    const e = byPyeong.get(label) ?? { py: parseInt(label, 10), prices: [] };
    e.prices.push(t[2]);
    byPyeong.set(label, e);
  }
  const eligible = [...byPyeong.entries()].filter(([, e]) => e.prices.length >= 2).sort((a, b) => a[1].py - b[1].py);
  if (eligible.length >= 2) {
    const [smallLabel, small] = eligible[0];
    const [largeLabel, large] = eligible[eligible.length - 1];
    const sp = Math.round((median(small.prices) as number) / 100) * 100;
    const lp = Math.round((median(large.prices) as number) / 100) * 100;
    if (lp > sp) {
      push(
        'UPGRADE',
        { small: smallLabel, large: largeLabel, diff: price(lp - sp), smallPrice: price(sp), largePrice: price(lp) },
        [sp, price(sp), lp, price(lp)],
      );
    }
  }

  return out;
}
