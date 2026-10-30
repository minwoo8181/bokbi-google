/**
 * 지표 계산 (결정론·순수 함수, 설계 5-3 "지표"). 이벤트 배열만 받는다 → 목업(브라우저 저장소)과 Supabase에서 같은 함수.
 * 데이터가 없으면 null (화면은 "—", 가짜 숫자 금지)
 */
import type { AnalyticsEvent, EventName } from './events';

const of = (events: AnalyticsEvent[], name: EventName) => events.filter((e) => e.name === name);
const num = (e: AnalyticsEvent, k: string) => (typeof e.props[k] === 'number' ? (e.props[k] as number) : null);

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 비율 (분모 0이면 null) */
export const ratio = (hit: number, total: number): number | null => (total > 0 ? hit / total : null);

/** 첫 요청까지 시간 (분, 중앙값): 의뢰별 가장 빠른 offer_arrived */
export function firstOfferMedianMinutes(events: AnalyticsEvent[]): number | null {
  const first = new Map<string, number>();
  for (const e of of(events, 'offer_arrived')) {
    const m = num(e, 'minutesAfterRequest');
    if (!e.requestId || m === null) continue;
    first.set(e.requestId, Math.min(first.get(e.requestId) ?? Infinity, m));
  }
  return median([...first.values()]);
}

/** 할인율 구간 (법정 상한 대비 %). 경계는 정책값 보정용 — 아래 경계 포함 */
export const DISCOUNT_BANDS = [0, 10, 20, 30, 40, 50] as const;
export function discountBand(pct: number): number {
  return [...DISCOUNT_BANDS].reverse().find((b) => pct >= b) ?? 0;
}

/** 할인율 구간별 매칭률: request_submit 의뢰 중 match_confirm이 있는 비율 (정책값 보정 근거, 구간별 30건부터 보정) */
export function matchRateByDiscount(events: AnalyticsEvent[]): { band: number; requests: number; matched: number; rate: number | null }[] {
  const confirmed = new Set(of(events, 'match_confirm').map((e) => e.requestId));
  return DISCOUNT_BANDS.map((band) => {
    const reqs = of(events, 'request_submit').filter((e) => e.requestId && discountBand(num(e, 'discountPct') ?? -1) === band && (num(e, 'discountPct') ?? -1) >= 0);
    const matched = reqs.filter((e) => confirmed.has(e.requestId)).length;
    return { band, requests: reqs.length, matched, rate: ratio(matched, reqs.length) };
  });
}

/** 합의 복비 유지율: 복비 답 중 "그대로" */
export function feeKeptRate(events: AnalyticsEvent[]): number | null {
  const answers = of(events, 'fee_answer');
  return ratio(answers.filter((e) => e.props.kept === true).length, answers.length);
}

/** 광고 48시간 준수율: 광고 등록 중 매칭 뒤 48시간 안 */
export function adOnTimeRate(events: AnalyticsEvent[], deadlineHours = 48): number | null {
  const posted = of(events, 'ad_posted').map((e) => num(e, 'hoursAfterMatch')).filter((h): h is number => h !== null);
  return ratio(posted.filter((h) => h <= deadlineHours).length, posted.length);
}

/** 이용 흐름 (분석 진입 → 의뢰 → 매칭 확정 → 후기): 단계마다 그 단계와 앞 단계를 모두 한 사람 수 */
export const FUNNEL: EventName[] = ['analysis_view', 'request_submit', 'match_confirm', 'review_submit'];
export function funnel(events: AnalyticsEvent[], steps: EventName[] = FUNNEL): { step: EventName; actors: number; fromPrev: number | null }[] {
  let pool: Set<string> | null = null;
  const out: { step: EventName; actors: number; fromPrev: number | null }[] = [];
  for (const step of steps) {
    const did = new Set(of(events, step).map((e) => e.actorId));
    const prev: Set<string> | null = pool;
    const kept: Set<string> = prev ? new Set([...did].filter((a) => prev.has(a))) : did;
    out.push({ step, actors: kept.size, fromPrev: prev ? ratio(kept.size, prev.size) : null });
    pool = kept;
  }
  return out;
}

/** 한국 시간 기준 그 주 월요일 'YYYY-MM-DD' */
export function kstWeek(iso: string): string {
  const k = new Date(Date.parse(iso) + 9 * 3_600_000);
  const back = (k.getUTCDay() + 6) % 7;
  const mon = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - back));
  return mon.toISOString().slice(0, 10);
}

/**
 * 중개사 주차별 리텐션: 처음 활동한 주(코호트)별로 n주 뒤에도 활동한 비율 (offset 0 = 100%).
 * 활동 = 중개사 쪽 이벤트 아무거나
 */
export function weeklyRetention(events: AnalyticsEvent[], weeks = 4): { cohort: string; size: number; rates: (number | null)[] }[] {
  const active = new Map<string, Set<string>>();
  for (const e of events.filter((x) => x.role === 'broker')) {
    const s = active.get(e.actorId) ?? new Set<string>();
    s.add(kstWeek(e.at));
    active.set(e.actorId, s);
  }
  const cohorts = new Map<string, string[]>();
  for (const [actor, ws] of active) {
    const first = [...ws].sort()[0];
    cohorts.set(first, [...(cohorts.get(first) ?? []), actor]);
  }
  const addWeeks = (w: string, n: number) => new Date(Date.parse(`${w}T00:00:00Z`) + n * 7 * 86_400_000).toISOString().slice(0, 10);
  return [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, actors]) => ({
      cohort,
      size: actors.length,
      rates: Array.from({ length: weeks + 1 }, (_, n) => ratio(actors.filter((a) => active.get(a)!.has(addWeeks(cohort, n))).length, actors.length)),
    }));
}

/** 집주인이 아낀 복비 합계 (만 원): 계약 뒤 복비 답에 담긴 아낀 금액. 기록이 없으면 null */
export function savedFeeTotalManwon(events: AnalyticsEvent[]): number | null {
  const xs = of(events, 'fee_answer').map((e) => num(e, 'savedManwon')).filter((x): x is number => x !== null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
}

/** 다산동 매매 점유율: 복비로 끝난 매매 거래 수 / 국토부 월 거래량 (분모는 바깥에서) */
export const marketShare = (bokbiDeals: number, molitMonthlyTrades: number): number | null => ratio(bokbiDeals, molitMonthlyTrades);

/** 페이크 도어 클릭률: 피드를 본 중개사 중 "크레딧 더 받기"를 누른 사람 */
export function fakeDoorRate(events: AnalyticsEvent[]): number | null {
  const viewers = new Set(of(events, 'feed_view').map((e) => e.actorId));
  const tappers = new Set(of(events, 'more_credits_tap').map((e) => e.actorId).filter((a) => viewers.has(a)));
  return ratio(tappers.size, viewers.size);
}
