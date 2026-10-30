/**
 * 홈 복비 엔진 카드의 그래프·한 줄 (결정론·순수 함수, 대표님 2026-10-28 "카운트업 말고 그래프").
 * - 월별 막대: 다산동 매매 실거래 건수, 데이터 기준일이 있는 달(아직 덜 모인 달)은 빼고 그 앞 12개월
 * - 한 줄: 같은 12개월 중개 거래(직거래 제외)의 법정 상한 평균 — commission.ts로 계산 (가짜 실적 아님, 법 계산)
 */
import { calculateLegalCommission } from '@/lib/commission';

/** [계약일 'YYYY-MM-DD', 전용㎡, 거래금액(만 원), 층, 중개 거래 여부] — dasan-market.json tradeColumns */
export type TradeRow = readonly [string, number, number, number | string | null, boolean | number];

export const HOME_CHART_MONTHS = 12;

export interface HomeMarketSummary {
  /** 오래된 달 → 최근 달 */
  months: { month: string; count: number }[];
  brokeredCount: number;
  /** 법정 상한 평균 (원). 중개 거래가 없으면 0 */
  avgLegalCapWon: number;
  /** 법정 상한 합계 (원) — 홈 큰 숫자 "최대 n억 원" (집주인 쪽 한 번 기준, 사는 쪽은 더하지 않음) */
  capSumWon: number;
  /** 한 집 법정 상한 최고 (원) */
  maxCapWon: number;
}

/** 'YYYY-MM'에서 n달 앞 */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

export function homeMarketSummary(trades: Iterable<TradeRow>, observedAt: string, n = HOME_CHART_MONTHS): HomeMarketSummary {
  const last = shiftMonth(observedAt.slice(0, 7), -1);
  const first = shiftMonth(last, -(n - 1));
  const counts = new Map<string, number>();
  for (let i = 0; i < n; i++) counts.set(shiftMonth(first, i), 0);

  let capSum = 0;
  let maxCap = 0;
  let brokeredCount = 0;
  for (const [date, , price, , brokered] of trades) {
    const month = date.slice(0, 7);
    if (month < first || month > last) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
    if (brokered) {
      const cap = calculateLegalCommission(price * 10_000, '매매').maxWon;
      capSum += cap;
      maxCap = Math.max(maxCap, cap);
      brokeredCount++;
    }
  }
  return {
    months: [...counts].map(([month, count]) => ({ month, count })),
    brokeredCount,
    avgLegalCapWon: brokeredCount ? Math.round(capSum / brokeredCount) : 0,
    capSumWon: capSum,
    maxCapWon: maxCap,
  };
}

/** 홈 가정 한 줄의 할인율 (복비 엔진 추천 구간 보통 20~30%의 위쪽 끝, 대표님 2026-10-28) */
export const HOME_SCENARIO_DISCOUNT = 0.3;

/** 법정 상한 평균에서 그만큼 낮게 정하면 줄어드는 금액 (원, 만 원 아래 버림 — 크게 보이지 않게) */
export function scenarioCutWon(avgCapWon: number, discount = HOME_SCENARIO_DISCOUNT): number {
  return Math.floor((avgCapWon * discount) / 10_000) * 10_000;
}

/**
 * 숫자 카드 단지 예시 칩 (대표님 2026-10-29 C안: "내 단지 평균"으로, 금액이 커 보이는 아이비플레이스를 기본으로).
 * 가장 큰 단지만 보여 주면 다산동 숫자처럼 읽히므로 거래가 많은 두 단지를 함께 둔다. name은 dasan-market.json 단지 이름
 */
export const HOME_EXAMPLE_COMPLEXES = [
  { name: '다산자이아이비플레이스(주거복합)', label: '아이비플레이스' },
  { name: '힐스테이트다산', label: '힐스테이트다산' },
  { name: '다산롯데캐슬', label: '롯데캐슬' },
] as const;

export interface HomeComplexExample {
  label: string;
  brokeredCount: number;
  /** 최근 12개월 중개 매매 법정 상한 평균 (원) */
  avgLegalCapWon: number;
  /** 그 평균에서 가정 할인율만큼 낮게 정하면 줄어드는 금액 (원, scenarioCutWon) */
  cutWon: number;
}

/** 예시 단지마다 같은 창(최근 12개월)·같은 계산. 데이터에 없거나 중개 거래가 0건인 단지는 뺀다 */
export function homeComplexExamples(
  complexes: readonly { name: string; trades: unknown }[],
  observedAt: string,
  picks: readonly { name: string; label: string }[] = HOME_EXAMPLE_COMPLEXES,
): HomeComplexExample[] {
  return picks.flatMap(({ name, label }) => {
    const c = complexes.find((x) => x.name === name);
    if (!c) return [];
    const s = homeMarketSummary(c.trades as TradeRow[], observedAt);
    if (s.brokeredCount === 0) return [];
    return [{ label, brokeredCount: s.brokeredCount, avgLegalCapWon: s.avgLegalCapWon, cutWon: scenarioCutWon(s.avgLegalCapWon) }];
  });
}

/** 원 → "107억 원" (억 아래 버림: 실제보다 크게 보이지 않게). 1억 미만이면 만 원 단위 */
export function eokLabel(won: number): string {
  const eok = Math.floor(won / 100_000_000);
  if (eok >= 1) return `${eok.toLocaleString('ko-KR')}억 원`;
  return `${Math.floor(won / 10_000).toLocaleString('ko-KR')}만 원`;
}
