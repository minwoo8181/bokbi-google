/**
 * 거래 페이지 규칙 (결정론·순수 함수, 대표님 그릴링 2026-10-25)
 * 집 하나 × 중개사 하나 = 거래 페이지 하나: 위는 시간순 기록, 맨 아래는 지금 할 일 카드 한 장, 목록 카드엔 색 띠.
 * 설계: docs/handover/phase5-broker-matching.md "거래 페이지"
 *
 * - 중개사가 알리고(가계약·계약 완료·잔금 완료·해제) 집주인이 맞아요/아니에요로 확인한다. 확인 전엔 아무것도 자동으로 바뀌지 않는다
 * - 기록은 이벤트 로그(추가만, 지우지 않음). 매칭·광고·방문은 원래 자리에서 읽어 끼워 넣는다 (같은 사실을 두 곳에 적지 않게)
 * - 집주인이 한 곳의 가계약(또는 바로 계약)을 확인하면 나머지 매칭 중개사는 정리: 광고 내리기 요청, 앞으로 잡힌 방문 자동 취소
 * - 다른 사람에게 영향을 주는 버튼은 확인 창에 "무슨 일이 생기는지"를 지금 상태로 계산해 보여 준다 (consequences = closeOthers 계산 공유)
 * - 블라인드: 중개사 화면 결과에는 다른 중개사의 방문·이벤트·offerId·개수가 들어가지 않는다
 */
import { adState, CONTRACT_REPORT_HOURS, hoursUntil, type AdState } from '@/lib/requests/stage';
import type { BrokerAd, BrokerOffer, OwnerRequest } from '@/lib/requests/types';
import { daysInclusive, kstNow, systemCancelVisits, upcomingVisits, type VisitBooking } from '@/lib/requests/showing';
import { adUrgency, kstVisitMs } from '@/lib/broker/listing';

// ── 타입 ─────────────────────────────────────────────────────

export type ReportStep = 'PROVISIONAL' | 'CONTRACT' | 'BALANCE' | 'BROKEN';
export type DateField = 'CONTRACT' | 'MIDDLE' | 'BALANCE';
export const REPORT_STEPS: ReportStep[] = ['PROVISIONAL', 'CONTRACT', 'BALANCE', 'BROKEN'];
export const DATE_FIELDS: DateField[] = ['CONTRACT', 'MIDDLE', 'BALANCE'];
export type FeeReason = 'AGREED' | 'OVERCHARGED' | 'OTHER';
export const FEE_REASONS: FeeReason[] = ['AGREED', 'OVERCHARGED', 'OTHER'];
/** 기타 사유 글 최대 길이 */
export const FEE_NOTE_MAX = 80;

export type DealEvent = { id: string; at: string } & (
  /** 중개사: 등기부로 소유자 확인 */
  | { kind: 'OWNER_CHECKED'; how: 'CONFIRMED' | 'CALL_CONFIRMED' }
  /** 중개사: 가계약·계약 완료·잔금 완료·해제를 알림. 가계약·계약은 실제 거래금액(만 원)을 함께 (집주인이 맞아요로 확인, dealFee.ts) */
  | { kind: 'REPORT'; step: ReportStep; priceManwon?: number }
  /** 집주인: 맞아요 / 아니에요 */
  | { kind: 'ANSWER'; step: ReportStep; ok: boolean }
  /** 중개사: 날짜 넣기·바꾸기 (null = 없음·지움, 중도금 없음). by OWNER = 중개사가 48시간 안에 안 넣어 집주인이 대신 */
  | { kind: 'DATE'; field: DateField; date: string | null; by?: 'OWNER' }
  /**
   * 중개사: 광고 내렸어요 (다른 곳과 진행·집주인이 끝냄·잠시 멈춤). ad = 내린 광고 (기록용 — 화면의 광고 링크는 비워서
   * 다시 시작하면 새로 올리게 한다. 예전 기록에는 없을 수 있음)
   */
  | { kind: 'AD_REMOVED'; ad?: BrokerAd }
  /** 집주인이 직접 가계약·계약을 알림 (중개사가 안 알렸을 때). 확인하는 쪽이 집주인이라 바로 확정 */
  | { kind: 'OWNER_DECLARED'; step: 'PROVISIONAL' | 'CONTRACT'; priceManwon?: number }
  /**
   * 집주인: 합의한 복비 그대로 계약했는지 (계약 확정 뒤 한 번, 약속 이행 기록의 근거).
   * 아니면 사유 칩 (대표님 2026-10-26): 서로 합의해 조정 / 중개사가 더 요구(관리자 확인) / 기타(80자 글)
   */
  | { kind: 'FEE_ANSWER'; kept: boolean; reason?: FeeReason; note?: string }
  /** 집주인: 후기 (잔금 확인 뒤 한 번, 별점 + 칩). 등록되면 중개사 크레딧 1개 자동 돌려받기 */
  | { kind: 'REVIEW'; stars: number; chips: string[] }
  /**
   * 집주인: 매칭 뒤 희망가를 바꿈 (2026-10-27). 매칭된 곳마다 한 줄 — 복비는 합의 비율 그대로 다시 계산(feeWon, dealFee.feeForPrice).
   * 중개사에게 "새 소식"으로 보인다. 의뢰의 희망가·복비 자체는 requests 쪽에서 바뀐다 (lib/deal/priceChange.ts)
   */
  | { kind: 'PRICE_CHANGED'; priceManwon: number; fromManwon: number; feeWon: number }
  /** 집주인: 그 중개사에게 바뀐 희망가를 전화·문자로 알렸다고 체크 (집주인 화면 "지금 확인할 일"에서 빠짐, 기록에는 안 보임) */
  | { kind: 'PRICE_NOTIFIED'; priceManwon: number }
);

/** 종류별로 id·at만 뺀 이벤트 (유니온에 바로 Omit을 쓰면 종류별 필드가 사라짐) */
export type DealEventBody = { [K in DealEvent['kind']]: Omit<Extract<DealEvent, { kind: K }>, 'id' | 'at'> }[DealEvent['kind']];

/** 이 거래만 보고 접은 단계 */
export type OwnPhase = 'MATCHED' | 'PROVISIONAL' | 'CONTRACTED' | 'DONE' | 'BROKEN';
/** 다른 거래·집주인 해제까지 본 단계 */
export type DealPhase = OwnPhase | 'CLOSED_ELSEWHERE' | 'RELEASED';
export const DEAL_PHASES: DealPhase[] = ['MATCHED', 'PROVISIONAL', 'CONTRACTED', 'DONE', 'BROKEN', 'CLOSED_ELSEWHERE', 'RELEASED'];

export type DealDates = Record<DateField, string | null>;
export interface DateChange {
  field: DateField;
  from: string | null;
  to: string | null;
  at: string;
}

export interface DealState {
  phase: OwnPhase;
  /** 집주인 확인을 기다리는 보고 */
  pending: { step: ReportStep; at: string } | null;
  /** 집주인이 "아니에요"라고 한 보고 (다음 보고 전까지) */
  lastDenied: { step: ReportStep; at: string } | null;
  ownerCheck: 'CONFIRMED' | 'CALL_CONFIRMED' | null;
  adRemoved: boolean;
  /** 마지막으로 "광고 내렸어요"를 누른 시각 (그 뒤에 새로 올린 광고는 살아 있는 광고) */
  adRemovedAt: string | null;
  dates: DealDates;
  changes: DateChange[];
  /** 마지막으로 날짜가 바뀐 시각 (캘린더 저장 안내용) */
  datesChangedAt: string | null;
  /** 집주인이 가계약 또는 계약을 처음 확인한 시각: 이 순간 다른 중개사가 정리된다 */
  committedAt: string | null;
  /** 집주인이 직접 계약을 알렸는지 (중개사 화면 "집주인이 계약을 알렸어요 · 날짜를 넣어 주세요"). 약속 이행에서 빠짐 */
  ownerDeclared: boolean;
  /** 집주인이 직접 알린 마지막 단계 (중개사 화면 안내 문구용) */
  declaredStep: 'PROVISIONAL' | 'CONTRACT' | null;
  /** 복비가 달라졌을 때 사유 (중개사가 더 요구 = 관리자 확인 대상) */
  feeReason: FeeReason | null;
  /** 계약이 확정된 시각 (집주인이 날짜를 대신 넣을 수 있는 48시간 기준) */
  contractedAt: string | null;
  /** 집주인이 날짜를 대신 넣은 적이 있는지 (약속 이행 기록에 안 쌓임) */
  datesByOwner: boolean;
  feeKept: boolean | null;
  review: { stars: number; chips: string[]; at: string } | null;
  /** 확인 대기 중인 보고에 적힌 거래금액 (만 원) */
  pendingPriceManwon: number | null;
  /** 확정된 실제 거래금액 (만 원). 없으면 희망가 기준 합의 복비 그대로 */
  priceManwon: number | null;
}

/**
 * 약속 이행 1건 (stage.ts countsAsKeptPromise와 같은 뜻, 대표님 2026-10-25):
 * 집주인이 "합의한 복비 그대로"라고 답했고, 계약을 중개사가 알렸고(집주인 직접 알림 아님), 계약일·잔금일을 중개사가 직접 넣은 거래
 */
export function promiseKept(s: DealState): boolean {
  return (s.phase === 'CONTRACTED' || s.phase === 'DONE') && s.feeKept === true && !s.ownerDeclared && !s.datesByOwner && !!s.dates.CONTRACT && !!s.dates.BALANCE;
}

/** 크레딧 1개 돌려받기: 잔금 확인으로 거래가 끝났고 집주인 후기가 등록됨 (별점 무관) */
export function creditReturnable(s: DealState): boolean {
  return s.phase === 'DONE' && s.review !== null;
}

/**
 * 집주인이 직접 계약을 알릴 수 있는 단계. 확인하는 쪽이 집주인이라, 중개사 보고가 확인 대기 중이어도
 * 집주인 알림이 우선한다 (대기 중이던 보고는 정리됨)
 */
export const canOwnerDeclare = (s: Pick<DealState, 'phase'>, step: 'PROVISIONAL' | 'CONTRACT' = 'CONTRACT') =>
  step === 'PROVISIONAL' ? s.phase === 'MATCHED' : s.phase === 'MATCHED' || s.phase === 'PROVISIONAL';

// ── 전이표 ────────────────────────────────────────────────────

const ALLOWED: Record<DealPhase, ReportStep[]> = {
  MATCHED: ['PROVISIONAL', 'CONTRACT'],
  PROVISIONAL: ['CONTRACT', 'BROKEN'],
  CONTRACTED: ['BALANCE', 'BROKEN'],
  DONE: [],
  BROKEN: [],
  CLOSED_ELSEWHERE: [],
  RELEASED: [],
};
const AFTER_YES: Record<ReportStep, OwnPhase> = { PROVISIONAL: 'PROVISIONAL', CONTRACT: 'CONTRACTED', BALANCE: 'DONE', BROKEN: 'BROKEN' };

export function allowedReports(phase: DealPhase): ReportStep[] {
  return ALLOWED[phase];
}

export type ReportReject = 'WRONG_PHASE' | 'PENDING' | 'NEED_CONTRACT_DATE' | 'NEED_BALANCE_DATE';

/** 보고할 수 있는지 (중개사 버튼). 계약은 계약일, 잔금은 잔금일이 있어야 한다 */
export function checkReport(phase: DealPhase, state: Pick<DealState, 'pending' | 'dates'>, step: ReportStep): ReportReject | null {
  if (!ALLOWED[phase].includes(step)) return 'WRONG_PHASE';
  if (state.pending) return 'PENDING';
  if (step === 'CONTRACT' && !state.dates.CONTRACT) return 'NEED_CONTRACT_DATE';
  if (step === 'BALANCE' && !state.dates.BALANCE) return 'NEED_BALANCE_DATE';
  return null;
}

/** 집주인은 기다리는 보고에만 답할 수 있다 */
export function checkAnswer(state: Pick<DealState, 'pending'>, step: ReportStep): 'NOTHING_PENDING' | null {
  return state.pending?.step === step ? null : 'NOTHING_PENDING';
}

const EMPTY_DATES: DealDates = { CONTRACT: null, MIDDLE: null, BALANCE: null };

/** 이벤트를 앞에서부터 접는다. 규칙에 맞지 않는 이벤트는 건너뛴다 (저장소가 깨져도 화면이 버티게) */
export function dealState(events: DealEvent[]): DealState {
  const s: DealState = {
    phase: 'MATCHED',
    pending: null,
    lastDenied: null,
    ownerCheck: null,
    adRemoved: false,
    adRemovedAt: null,
    dates: { ...EMPTY_DATES },
    changes: [],
    datesChangedAt: null,
    committedAt: null,
    ownerDeclared: false,
    declaredStep: null,
    feeReason: null,
    contractedAt: null,
    datesByOwner: false,
    feeKept: null,
    review: null,
    pendingPriceManwon: null,
    priceManwon: null,
  };
  const validPrice = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    const wasContracted = s.phase === 'CONTRACTED';
    if (e.kind === 'OWNER_CHECKED') s.ownerCheck = e.how;
    else if (e.kind === 'AD_REMOVED') {
      s.adRemoved = true;
      s.adRemovedAt = e.at;
    }
    else if (e.kind === 'FEE_ANSWER') {
      if ((s.phase !== 'CONTRACTED' && s.phase !== 'DONE') || s.feeKept !== null) continue;
      s.feeKept = e.kept;
      s.feeReason = e.kept ? null : e.reason ?? 'OTHER';
    } else if (e.kind === 'REVIEW') {
      if (s.phase !== 'DONE' || s.review) continue;
      s.review = { stars: e.stars, chips: e.chips, at: e.at };
    } else if (e.kind === 'DATE') {
      if (s.dates[e.field] === e.date) continue;
      s.changes.push({ field: e.field, from: s.dates[e.field], to: e.date, at: e.at });
      s.dates[e.field] = e.date;
      s.datesChangedAt = e.at;
      if (e.by === 'OWNER') s.datesByOwner = true;
    } else if (e.kind === 'REPORT') {
      if (checkReport(s.phase, s, e.step)) continue;
      s.pending = { step: e.step, at: e.at };
      s.pendingPriceManwon = e.step === 'PROVISIONAL' || e.step === 'CONTRACT' ? validPrice(e.priceManwon) : null;
      s.lastDenied = null;
    } else if (e.kind === 'ANSWER') {
      if (checkAnswer(s, e.step)) continue;
      s.pending = null;
      const reportedPrice = s.pendingPriceManwon;
      s.pendingPriceManwon = null;
      if (e.ok) {
        s.phase = AFTER_YES[e.step];
        // 집주인이 맞다고 한 보고의 거래금액이 확정 금액 (계약이 가계약 금액을 덮어씀)
        if (reportedPrice !== null) s.priceManwon = reportedPrice;
        s.declaredStep = null; // 중개사 보고로 다음 단계가 확정되면 "집주인이 알렸어요" 안내는 끝
        s.lastDenied = null;
        if ((e.step === 'PROVISIONAL' || e.step === 'CONTRACT') && !s.committedAt) s.committedAt = e.at;
      } else s.lastDenied = { step: e.step, at: e.at };
    } else if (e.kind === 'OWNER_DECLARED') {
      if (!canOwnerDeclare(s, e.step)) continue;
      s.pending = null;
      s.pendingPriceManwon = null;
      if (validPrice(e.priceManwon) !== null) s.priceManwon = validPrice(e.priceManwon);
      s.phase = e.step === 'PROVISIONAL' ? 'PROVISIONAL' : 'CONTRACTED';
      s.lastDenied = null;
      s.declaredStep = e.step;
      // 약속 이행에서 빠지는 건 계약을 집주인이 알린 경우만 (가계약만 집주인이 알리고 계약은 중개사가 알리면 쌓임)
      if (e.step === 'CONTRACT') s.ownerDeclared = true;
      if (!s.committedAt) s.committedAt = e.at;
    }
    if (!wasContracted && s.phase === 'CONTRACTED' && !s.contractedAt) s.contractedAt = e.at;
  }
  return s;
}

export type DatesReject = 'PAST' | 'BALANCE_BEFORE_CONTRACT' | 'MIDDLE_OUT' | 'NO_CHANGE';

/**
 * 날짜 시트 저장 전 검사. 새로 넣거나 바꾼 칸만 지난 날짜를 막는다 (이미 지난 계약일을 그대로 두는 건 허용).
 * 순서: 계약일 ≤ 중도금일 ≤ 잔금일 (빈 칸은 건너뜀)
 */
export function checkDealDates(current: DealDates, next: DealDates, today: string): DatesReject | null {
  const changed = DATE_FIELDS.filter((f) => current[f] !== next[f]);
  if (changed.length === 0) return 'NO_CHANGE';
  if (changed.some((f) => next[f] !== null && next[f]! < today)) return 'PAST';
  if (next.CONTRACT && next.BALANCE && next.BALANCE < next.CONTRACT) return 'BALANCE_BEFORE_CONTRACT';
  if (next.MIDDLE && ((next.CONTRACT && next.MIDDLE < next.CONTRACT) || (next.BALANCE && next.MIDDLE > next.BALANCE))) return 'MIDDLE_OUT';
  return null;
}

/** 바뀐 칸만 DATE 이벤트로 (검사는 checkDealDates로 먼저). 집주인이 대신 넣으면 by OWNER */
export function dateEvents(current: DealDates, next: DealDates, now: Date, idPrefix: string, by?: 'OWNER'): DealEvent[] {
  return DATE_FIELDS.filter((f) => current[f] !== next[f]).map((f, i) => ({
    id: `${idPrefix}-${now.getTime()}-${i}`,
    at: now.toISOString(),
    kind: 'DATE' as const,
    field: f,
    date: next[f],
    ...(by ? { by } : {}),
  }));
}

/** 날짜별 최신 값과 바뀐 이력 */
export function dealDates(events: DealEvent[]): { current: DealDates; changes: DateChange[] } {
  const s = dealState(events);
  return { current: s.dates, changes: s.changes };
}

// ── 여러 중개사 사이 ─────────────────────────────────────────

/** 의뢰 하나의 중개사별 이벤트 (market.deals[requestId]) */
export type RequestDeals = Record<string, DealEvent[]>;

export interface DealContext {
  request: OwnerRequest;
  deals: RequestDeals;
  offerId: string;
}

/** 집주인이 가장 먼저 가계약·계약을 확인한 중개사 (없으면 null). 이후 깨져도 정리된 곳은 되살리지 않는다 */
export function winnerOf(deals: RequestDeals): string | null {
  let best: { id: string; at: string } | null = null;
  for (const [id, evs] of Object.entries(deals)) {
    const at = dealState(evs).committedAt;
    if (at && (!best || at < best.at)) best = { id, at };
  }
  return best?.id ?? null;
}

/** 집주인이 의뢰를 직접 끝낸 이유 (매칭된 중개사 모두 정리) */
export type OwnerEndReason = 'SOLD_ELSEWHERE' | 'WITHDRAWN';

/**
 * 집주인이 "다른 곳에서 팔았어요"·"거둬들이기"로 끝낸 의뢰, 또는 운영팀이 허위 매물로 확인해 끝난 의뢰면 이유와 시각, 아니면 null.
 * 매칭된 중개사는 모두 같은 정리 (광고 올린 곳은 "광고를 내려 주세요")
 */
export function ownerEnded(r: OwnerRequest): { reason: OwnerEndReason | 'FAKE_CONFIRMED'; at: string } | null {
  if (r.stage !== 'ENDED' || !r.endedAt) return null;
  return r.endedReason === 'SOLD_ELSEWHERE' || r.endedReason === 'WITHDRAWN' || r.endedReason === 'FAKE_CONFIRMED' ? { reason: r.endedReason, at: r.endedAt } : null;
}

export function dealPhase(ctx: DealContext): DealPhase {
  if (ctx.request.releasedOfferIds?.includes(ctx.offerId)) return 'RELEASED';
  const w = winnerOf(ctx.deals);
  if (w && w !== ctx.offerId) return 'CLOSED_ELSEWHERE';
  const own = dealState(ctx.deals[ctx.offerId] ?? []).phase;
  // 집주인이 끝낸 의뢰: 아직 계약 전(매칭·가계약)인 곳은 다른 곳 정리와 같게 (중개사는 이유를 구별하지 못함 — 거둬들이기만 기록 문구가 다름)
  if (ownerEnded(ctx.request) && (own === 'MATCHED' || own === 'PROVISIONAL')) return 'CLOSED_ELSEWHERE';
  return own;
}

/** 광고가 지금 올라가 있나: 링크가 있고, 그 링크를 올린 뒤 "광고 내렸어요"를 누르지 않았으면 */
export function adUp(offer: BrokerOffer | undefined, s: Pick<DealState, 'adRemovedAt'>): boolean {
  return !!offer?.ad && !(s.adRemovedAt && s.adRemovedAt >= offer.ad.postedAt);
}

/** "광고를 내려 주세요"를 받은 뒤 이 시간이 지나면 빨강(기한 지남) → 새 요청 보내기 잠금 */
export const REMOVE_AD_HOURS = 24;

/**
 * 광고를 내려 달라는 요청이 생긴 시각: 다른 곳이 확정된 시각 · 집주인이 끝낸 시각 · 잠시 멈춘 시각.
 * 이 중개사에게 내려 달라고 할 일이 없으면 null
 */
export function removeAdSince(ctx: DealContext): string | null {
  const phase = dealPhase(ctx);
  if (phase === 'CLOSED_ELSEWHERE') {
    const w = winnerOf(ctx.deals);
    return (w && dealState(ctx.deals[w] ?? []).committedAt) || ownerEnded(ctx.request)?.at || null;
  }
  return phase === 'MATCHED' && ctx.request.paused ? ctx.request.paused.pausedAt : null;
}

/**
 * 광고 내림 남은 시간 (시간, 올림). 내려 달라는 요청이 없거나 이미 내렸으면 null, 24시간이 지났으면 0.
 * 중개사 화면에 처음부터 "24시간 안에" + 남은 시간을 보여 준다 (대표님 2026-10-26: 지나면 허위 매물로 신고될 수 있음)
 */
export function removeAdHoursLeft(ctx: DealContext, now: Date): number | null {
  const s = dealState(ctx.deals[ctx.offerId] ?? []);
  if (!adUp(offerOf(ctx.request, ctx.offerId), s)) return null;
  const since = removeAdSince(ctx);
  if (!since) return null;
  const left = new Date(since).getTime() + REMOVE_AD_HOURS * 3_600_000 - now.getTime();
  return left <= 0 ? 0 : Math.min(REMOVE_AD_HOURS, Math.ceil(left / 3_600_000));
}

/** 다른 곳이 집주인 확인을 받았을 때만 정리 (보고만으로는 아님) */
export function closedElsewhere(ctx: DealContext): boolean {
  return dealPhase(ctx) === 'CLOSED_ELSEWHERE';
}

const offerOf = (r: OwnerRequest, id: string): BrokerOffer | undefined => r.offers.find((o) => o.id === id);

/** 정리 대상: 매칭된 곳 중 이긴 곳·해제된 곳 빼고 */
const losersOf = (r: OwnerRequest, winner: string) =>
  r.matchedOfferIds.filter((id) => id !== winner && !(r.releasedOfferIds ?? []).includes(id));

/**
 * 집주인 화면 "광고 내림 확인 n/m": 광고를 올렸던 곳만 센다 (안 올린 곳은 내릴 것이 없어 안내하지 않음).
 * 내려 달라고 한 곳이 없으면 total 0
 */
export function adRemoval(request: OwnerRequest, deals: RequestDeals): { done: number; total: number } | null {
  const w = winnerOf(deals);
  const ended = ownerEnded(request);
  if (!w && !ended) return null;
  // 집주인이 끝낸 의뢰면 이긴 곳이 없으니 매칭된 곳 전부(해제된 곳 빼고)
  return countRemoval(request, deals, losersOf(request, w ?? ''));
}

/** 광고를 올렸던 곳 중 지금 내려가 있는 곳 (내린 뒤 다시 올렸으면 아직 안 내린 것) */
function countRemoval(request: OwnerRequest, deals: RequestDeals, ids: string[]): { done: number; total: number } {
  const withAd = ids.filter((id) => !!offerOf(request, id)?.ad || dealState(deals[id] ?? []).adRemoved);
  const done = withAd.filter((id) => !adUp(offerOf(request, id), dealState(deals[id] ?? []))).length;
  return { done, total: withAd.length };
}

/** 잠시 멈춘 동안 "광고 내림 확인 n/m" (멈춘 뒤 내린 곳만 셈, 해제된 곳 빼고). 멈춤이 아니면 null */
export function pauseAdRemoval(request: OwnerRequest, deals: RequestDeals): { done: number; total: number } | null {
  if (!request.paused) return null;
  const p = request.paused.pausedAt;
  const ids = losersOf(request, '').filter((id) => {
    const o = offerOf(request, id);
    const s = dealState(deals[id] ?? []);
    // 멈추기 전에 광고가 올라가 있던 곳 (멈춘 뒤 내렸으면 링크가 비었으니 이벤트로 확인)
    return (!!o?.ad && o.ad.postedAt <= p) || (!!s.adRemovedAt && s.adRemovedAt >= p);
  });
  const withAd = ids.length;
  const done = ids.filter((id) => !adUp(offerOf(request, id), dealState(deals[id] ?? []))).length;
  return { done, total: withAd };
}

/** 멈추면 취소될 방문: 매칭된 곳의 앞으로 잡힌 방문 (확인 창 "잡힌 방문 n건도 취소돼요") */
export function pauseCancelVisitIds(request: OwnerRequest, now: Date): string[] {
  return upcomingVisits(request.visits, kstNow(now).date)
    .filter((v) => request.matchedOfferIds.includes(v.offerId))
    .map((v) => v.id);
}

/**
 * 집주인 "잠시 멈추기" (대표님 2026-10-26): 의뢰는 그대로, 앞으로 잡힌 방문은 자동 취소(확인 창에서 미리 안내).
 * 광고는 복비가 내릴 수 없어 중개사에게 "광고를 내려 주세요" → "광고 내렸어요" (링크는 비워 다시 시작하면 새로 올리게)
 */
export function pauseByOwner(request: OwnerRequest, reason: string, now: Date): OwnerRequest {
  return {
    ...request,
    paused: { pausedAt: now.toISOString(), reason },
    visits: systemCancelVisits(request.visits, pauseCancelVisitIds(request, now), 'PAUSED', now),
  };
}

/** 다시 시작: 광고 48시간 기한을 이 시각부터 (광고를 내린 곳은 새로 올림, 안 내린 곳은 그대로 광고 중) */
export function resumeByOwner(request: OwnerRequest, now: Date): OwnerRequest {
  return { ...request, paused: null, adWindowStartedAt: now.toISOString(), resumedAt: now.toISOString() };
}

export interface CloseOthersResult {
  closedOfferIds: string[];
  /** 광고를 올려 둬서 내려 달라고 할 곳 */
  adStopOfferIds: string[];
  /** 자동 취소할 앞으로 잡힌 방문 */
  canceledVisitIds: string[];
  visits: VisitBooking[];
}

/**
 * 집주인이 winner의 가계약·계약을 처음 확인할 때 함께 일어나는 일.
 * consequences()가 같은 계산으로 확인 창 숫자를 만든다 → 안내한 것과 실제가 어긋나지 않는다
 */
export function closeOthers(request: OwnerRequest, deals: RequestDeals, winner: string, now: Date): CloseOthersResult {
  if (winnerOf(deals)) return { closedOfferIds: [], adStopOfferIds: [], canceledVisitIds: [], visits: request.visits };
  const losers = losersOf(request, winner);
  const today = kstNow(now).date;
  const canceledVisitIds = upcomingVisits(request.visits, today)
    .filter((v) => losers.includes(v.offerId))
    .map((v) => v.id);
  return {
    closedOfferIds: losers,
    adStopOfferIds: losers.filter((id) => !!offerOf(request, id)?.ad),
    canceledVisitIds,
    visits: systemCancelVisits(request.visits, canceledVisitIds, 'ELSEWHERE', now),
  };
}

/**
 * 집주인이 의뢰를 직접 끝낼 때 (다른 곳에서 팔았어요·거둬들이기, 대표님 2026-10-26):
 * 의뢰는 종료 + 끝낸 시각, 매칭된 곳의 앞으로 잡힌 방문은 자동 취소. 광고 링크는 지우지 않는다
 * (복비가 네이버 광고를 내릴 수 없음 — 중개사 화면에 "광고를 내려 주세요", 집주인 화면에 "광고 내림 확인 n/m")
 */
export function endByOwner(request: OwnerRequest, reason: OwnerEndReason, now: Date): OwnerRequest {
  const today = kstNow(now).date;
  const ids = upcomingVisits(request.visits, today)
    .filter((v) => request.matchedOfferIds.includes(v.offerId))
    .map((v) => v.id);
  return {
    ...request,
    stage: 'ENDED',
    endedReason: reason,
    endedAt: now.toISOString(),
    visits: systemCancelVisits(request.visits, ids, reason === 'WITHDRAWN' ? 'WITHDRAWN' : 'ELSEWHERE', now),
  };
}

/**
 * 거래 기록으로 집주인 의뢰 단계를 맞춘다 (불러올 때·확인 직후 모두, 같은 결과):
 * 계약 확인(또는 집주인이 직접 알림) → CONTRACTED + 계약 완료 카드에 거래 날짜, 해제 확인 → ENDED(DEAL_BROKEN)
 */
export function applyDeals(r: OwnerRequest, deals: RequestDeals, now: Date): OwnerRequest {
  const w = winnerOf(deals);
  if (!w) return r;
  const s = dealState(deals[w] ?? []);
  // 광고 링크는 지우지 않는다: 기록("광고 올렸어요")이 광고 링크에서 나오고, 실제 광고는 중개사가 내린다
  if (s.phase === 'BROKEN') return r.stage === 'ENDED' ? r : { ...r, stage: 'ENDED', endedReason: 'DEAL_BROKEN' };
  if (s.phase !== 'CONTRACTED' && s.phase !== 'DONE') return r;
  const base = r.contract?.offerId === w ? r.contract : null;
  const contract = {
    offerId: w,
    reportedBy: (s.ownerDeclared ? 'OWNER' : 'BROKER') as 'OWNER' | 'BROKER',
    reportedAt: base?.reportedAt ?? now.toISOString(),
    ownerConfirmed: true,
    contractDate: s.dates.CONTRACT ?? base?.contractDate ?? null,
    balanceDate: s.dates.BALANCE ?? base?.balanceDate ?? null,
    feeKept: s.feeKept ?? base?.feeKept ?? null,
    review: s.review ? { stars: s.review.stars, chips: s.review.chips } : base?.review ?? null,
  };
  return r.stage === 'CONTRACTED' ? { ...r, contract } : { ...r, stage: 'CONTRACTED', endedReason: null, contract };
}

// ── 확인 창 안내 ─────────────────────────────────────────────

export type DealAction =
  | { who: 'BROKER'; kind: 'REPORT'; step: ReportStep }
  | { who: 'OWNER'; kind: 'ANSWER'; step: ReportStep; ok: boolean }
  /** 집주인이 직접 가계약·계약을 알림 (확인과 같은 결과 + 중개사에게 날짜 넣기 안내) */
  | { who: 'OWNER'; kind: 'DECLARE'; step?: 'PROVISIONAL' | 'CONTRACT' };

export type ConsequenceKey =
  | 'OWNER_WILL_CONFIRM'
  | 'DATES_LATER_OK'
  | 'CHECK_DATES'
  | 'AFTER_CONFIRM_DONE'
  | 'AFTER_CONFIRM_ENDS'
  | 'OTHERS_CLOSED'
  | 'ADS_STOP'
  | 'VISITS_CANCELED'
  | 'BREAK_NEEDS_REPORT'
  | 'STAGE_CONTRACTED'
  | 'DEAL_DONE'
  | 'REVIEW_OPEN'
  | 'DEAL_ENDED'
  | 'REREQUEST'
  | 'RECORD_KEPT'
  | 'BROKER_WILL_CALL'
  | 'BROKER_SETS_DATES';

export interface Consequence {
  key: ConsequenceKey;
  vars?: Record<string, string | number>;
}

/**
 * ⚠ 버튼 확인 창 줄. 지금 상태로 계산하고 해당 없는 줄은 뺀다.
 * 중개사 쪽 안내에는 다른 중개사 이야기를 넣지 않는다 (블라인드: 몇 곳이 매칭됐는지도 모르게)
 */
export function consequences(action: DealAction, ctx: DealContext, now: Date): Consequence[] {
  const s = dealState(ctx.deals[ctx.offerId] ?? []);
  if (action.who === 'BROKER') {
    const out: Consequence[] = [{ key: 'OWNER_WILL_CONFIRM' }];
    if (action.step === 'PROVISIONAL') out.push({ key: 'DATES_LATER_OK' });
    if (action.step === 'CONTRACT') out.push({ key: 'CHECK_DATES', vars: { contract: s.dates.CONTRACT ?? '', balance: s.dates.BALANCE ?? '' } });
    if (action.step === 'BALANCE') out.push({ key: 'AFTER_CONFIRM_DONE' });
    if (action.step === 'BROKEN') out.push({ key: 'AFTER_CONFIRM_ENDS' });
    return out;
  }
  if (action.kind === 'ANSWER' && !action.ok) return [{ key: 'RECORD_KEPT' }, { key: 'BROKER_WILL_CALL' }];
  const step: ReportStep = action.kind === 'DECLARE' ? action.step ?? 'CONTRACT' : action.step;
  const out: Consequence[] = [];
  if (step === 'PROVISIONAL' || step === 'CONTRACT') {
    const c = closeOthers(ctx.request, ctx.deals, ctx.offerId, now);
    if (c.closedOfferIds.length > 0) out.push({ key: 'OTHERS_CLOSED', vars: { n: c.closedOfferIds.length } });
    if (c.adStopOfferIds.length > 0) out.push({ key: 'ADS_STOP', vars: { n: c.adStopOfferIds.length } });
    if (c.canceledVisitIds.length > 0) out.push({ key: 'VISITS_CANCELED', vars: { n: c.canceledVisitIds.length } });
    if (step === 'PROVISIONAL') {
      out.push({ key: 'BREAK_NEEDS_REPORT' });
      if (action.kind === 'DECLARE' && !s.dates.CONTRACT) out.push({ key: 'BROKER_SETS_DATES' });
    } else {
      // "광고가 모두 내려가요"는 쓰지 않는다: 플랫폼이 네이버 광고를 내릴 수 없어 사실이 아님 (다른 곳 광고 중지 요청은 ADS_STOP)
      out.push({ key: 'STAGE_CONTRACTED' });
      if (action.kind === 'DECLARE' && !s.dates.BALANCE) out.push({ key: 'BROKER_SETS_DATES' });
    }
  } else if (step === 'BALANCE') out.push({ key: 'DEAL_DONE' }, { key: 'REVIEW_OPEN' });
  else out.push({ key: 'DEAL_ENDED' }, { key: 'REREQUEST' });
  return out;
}

// ── 기록 (타임라인) ─────────────────────────────────────────

export type Viewer = 'OWNER' | 'BROKER';

export type TimelineItem =
  | { at: string; kind: 'MATCHED' }
  | { at: string; kind: 'OWNER_CHECKED'; how: 'CONFIRMED' | 'CALL_CONFIRMED' }
  | { at: string; kind: 'AD_POSTED'; url: string }
  | { at: string; kind: 'VISIT'; id: string; date: string; hour: number; canceled: boolean; canceledBy: VisitBooking['canceledBy'] | null }
  | { at: string; kind: 'REPORTED'; step: ReportStep }
  | { at: string; kind: 'ANSWERED'; step: ReportStep; ok: boolean }
  | { at: string; kind: 'DATE'; field: DateField; from: string | null; to: string | null }
  | { at: string; kind: 'AD_REMOVED' }
  | { at: string; kind: 'OWNER_DECLARED'; step: 'PROVISIONAL' | 'CONTRACT' }
  | { at: string; kind: 'FEE_ANSWER'; kept: boolean; reason: FeeReason | null }
  | { at: string; kind: 'REVIEW' }
  | { at: string; kind: 'CLOSED_ELSEWHERE' }
  | { at: string; kind: 'OWNER_WITHDRAWN' }
  /** 집주인 잠시 멈춤·다시 시작 (마지막 한 번씩만 남음) */
  | { at: string; kind: 'OWNER_PAUSED' }
  | { at: string; kind: 'OWNER_RESUMED' }
  /** 허위 매물 신고 (fakeReport.ts): 운영팀 소유자 확인 시작 · 확인 끝(거래 가능) · 허위 매물로 확인돼 의뢰 종료 */
  | { at: string; kind: 'OWNER_CHECK_ASKED' }
  | { at: string; kind: 'OWNER_CHECK_OK' }
  | { at: string; kind: 'FAKE_CONFIRMED' }
  | { at: string; kind: 'PRICE_CHANGED'; priceManwon: number; feeWon: number };

/**
 * 이 거래 페이지의 기록 (오래된 것부터). 집주인·중개사 모두 이 중개사와의 일만 본다.
 * 다른 곳으로 정리됐을 때는 "다른 곳과 진행됐어요" 한 줄만 (누구인지 없음)
 */
export function timeline(ctx: DealContext): TimelineItem[] {
  const { request: r, offerId } = ctx;
  const events = ctx.deals[offerId] ?? [];
  const items: TimelineItem[] = [];
  if (r.matchedAt && (r.matchedOfferIds.includes(offerId) || (r.releasedOfferIds ?? []).includes(offerId))) items.push({ at: r.matchedAt, kind: 'MATCHED' });
  const ad = offerOf(r, offerId)?.ad;
  if (ad) items.push({ at: ad.postedAt, kind: 'AD_POSTED', url: ad.url });
  for (const v of r.visits.filter((x) => x.offerId === offerId)) {
    items.push({
      // 저장 시각이 없는 예전 일정은 매칭 시각으로 (방문 날짜로 두면 미래 시각이라 "새 소식"이 안 꺼짐)
      at: v.createdAt ?? r.matchedAt ?? `${v.date}T00:00:00.000Z`,
      kind: 'VISIT',
      id: v.id,
      date: v.date,
      hour: v.hour,
      canceled: !!v.canceledAt,
      canceledBy: v.canceledBy ?? null,
    });
  }
  const s = dealState(events);
  for (const e of events) {
    if (e.kind === 'OWNER_CHECKED') items.push({ at: e.at, kind: 'OWNER_CHECKED', how: e.how });
    else if (e.kind === 'REPORT') items.push({ at: e.at, kind: 'REPORTED', step: e.step });
    else if (e.kind === 'ANSWER') items.push({ at: e.at, kind: 'ANSWERED', step: e.step, ok: e.ok });
    else if (e.kind === 'AD_REMOVED') {
      // 내린 광고는 링크가 비워지므로 "광고 올렸어요" 줄을 이벤트에 남긴 광고로 (지금 링크와 같으면 한 번만)
      if (e.ad && e.ad.postedAt !== ad?.postedAt) items.push({ at: e.ad.postedAt, kind: 'AD_POSTED', url: e.ad.url });
      items.push({ at: e.at, kind: 'AD_REMOVED' });
    }
    else if (e.kind === 'OWNER_DECLARED') items.push({ at: e.at, kind: 'OWNER_DECLARED', step: e.step });
    else if (e.kind === 'PRICE_CHANGED') items.push({ at: e.at, kind: 'PRICE_CHANGED', priceManwon: e.priceManwon, feeWon: e.feeWon });
  }
  // 복비 답·후기는 접은 결과에서 (규칙 밖 중복 이벤트는 기록에 안 남김)
  if (s.feeKept !== null) {
    const fe = events.find((e) => e.kind === 'FEE_ANSWER');
    if (fe) items.push({ at: fe.at, kind: 'FEE_ANSWER', kept: s.feeKept, reason: s.feeReason });
  }
  if (s.review) items.push({ at: s.review.at, kind: 'REVIEW' });
  for (const c of s.changes) items.push({ at: c.at, kind: 'DATE', field: c.field, from: c.from, to: c.to });
  const w = winnerOf(ctx.deals);
  if (w && w !== offerId) {
    const at = dealState(ctx.deals[w] ?? []).committedAt;
    if (at) items.push({ at, kind: 'CLOSED_ELSEWHERE' });
  } else {
    // 집주인이 끝낸 의뢰: 팔았어요는 "다른 곳과 진행"(누구인지·어디인지 없음), 거둬들이기는 그대로
    const end = ownerEnded(r);
    if (end && dealPhase(ctx) === 'CLOSED_ELSEWHERE')
      items.push({ at: end.at, kind: end.reason === 'WITHDRAWN' ? 'OWNER_WITHDRAWN' : end.reason === 'FAKE_CONFIRMED' ? 'FAKE_CONFIRMED' : 'CLOSED_ELSEWHERE' });
  }
  // 이 중개사가 낸 허위 매물 신고: 확인 시작, 반려되면 확인 끝 (허위로 확인되면 위 FAKE_CONFIRMED 줄)
  const report = offerOf(r, offerId)?.fakeReport;
  if (report) {
    items.push({ at: report.at, kind: 'OWNER_CHECK_ASKED' });
    if (report.status === 'REJECTED' && report.decidedAt) items.push({ at: report.decidedAt, kind: 'OWNER_CHECK_OK' });
  }
  // 잠시 멈춤·다시 시작 (매칭 중인 곳만, 해제된 곳 빼고)
  if (r.matchedOfferIds.includes(offerId) && !(r.releasedOfferIds ?? []).includes(offerId)) {
    if (r.paused) items.push({ at: r.paused.pausedAt, kind: 'OWNER_PAUSED' });
    else if (r.resumedAt) items.push({ at: r.resumedAt, kind: 'OWNER_RESUMED' });
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

// ── 새 소식 (대표님 2026-10-26: 새 소식이 있는 카드에 붙여 맨 위로) ─────────

/** 기록 줄을 누가 만들었는지: 상대가 만든 줄만 나에게 "새 소식" */
export function actorOf(item: TimelineItem): Viewer | 'SYSTEM' {
  switch (item.kind) {
    case 'ANSWERED':
    case 'OWNER_DECLARED':
    case 'FEE_ANSWER':
    case 'REVIEW':
    case 'CLOSED_ELSEWHERE':
    case 'OWNER_WITHDRAWN':
    case 'OWNER_PAUSED':
    case 'OWNER_RESUMED':
    case 'PRICE_CHANGED':
      return 'OWNER';
    case 'MATCHED':
    case 'OWNER_CHECK_ASKED':
    case 'OWNER_CHECK_OK':
    case 'FAKE_CONFIRMED':
      return 'SYSTEM';
    default:
      return 'BROKER';
  }
}

/**
 * 마지막으로 이 거래 페이지를 연 뒤(이 휴대폰 기준) 상대가 만든 기록. 최신이 맨 앞.
 * 한 번도 안 열었으면 매칭 뒤 전부가 새 소식
 */
export function newsSince(ctx: DealContext, viewer: Viewer, lastSeenAt: string | null): TimelineItem[] {
  return timeline(ctx)
    .filter((i) => actorOf(i) !== viewer && actorOf(i) !== 'SYSTEM' && (!lastSeenAt || i.at > lastSeenAt))
    .reverse();
}

/** 목록 순서: 내가 할 일·새 소식이 있는 카드 → 색 띠 우선순위 */
export function listRank(strip: CardStrip, hasNews: boolean, viewer: Viewer): number {
  const tone = stripOrder(viewer).indexOf(strip.tone);
  const first = strip.tone === 'ACTION' || (viewer === 'BROKER' && strip.tone === 'RISK') || hasNews ? 0 : 1;
  return first * 10 + tone;
}

// ── 지금 할 일 ───────────────────────────────────────────────

/** 계약일·잔금일 하루 전부터 그날 카드로 (지나도 보고 전이면 계속) */
export const DAY_CARD_FROM_DAYS_BEFORE = 1;

export type NextKind =
  | 'RELEASED'
  | 'CLOSED'
  | 'REMOVE_AD'
  | 'ENDED_BROKEN'
  | 'WAIT_REVIEW'
  | 'WRITE_REVIEW'
  | 'WAIT_OWNER'
  | 'CONFIRM'
  | 'OWNER_CHECK'
  | 'CALL_OWNER'
  | 'SAVE_CALENDAR'
  | 'CONTRACT_DAY'
  | 'BALANCE_DAY'
  | 'SET_DATES'
  | 'UNTIL_CONTRACT'
  | 'UNTIL_BALANCE'
  | 'POST_AD'
  | 'VISITS_AND_DEAL'
  | 'IN_PROGRESS'
  /** 집주인: 합의한 복비 그대로 계약했는지 (계약 확정 뒤 한 번) */
  | 'FEE_CHECK'
  /** 집주인: 중개사가 계약 확정 뒤 48시간 안에 날짜를 안 넣음 → 직접 넣기 */
  | 'OWNER_SET_DATES'
  | 'REVIEW_DONE'
  /** 중개사: 후기가 등록돼 크레딧 1개를 자동으로 돌려받음 */
  | 'CREDIT_RETURNED';

export interface NextAction {
  kind: NextKind;
  vars: Record<string, string | number>;
  /** 서류 안내 키 (중개사만, 문구는 ③단계 대표님 검수 후) */
  docs?: 'CONTRACT' | 'BALANCE';
  /** 이 카드에서 보여 줄 보고 버튼 (중개사) */
  reports?: ReportStep[];
}

export interface NextOptions {
  /** 이 휴대폰에서 거래 날짜를 캘린더에 저장한 시각 (없으면 null) */
  calendarSavedAt?: string | null;
  /** 기존 저장 위치(중개사 작업 공간)의 소유자 확인. 이벤트가 없을 때 대신 쓴다 */
  ownerChecked?: boolean;
}

/** 한국 날짜 기준 남은 날 (오늘 0, 내일 1, 지났으면 음수) */
export function dday(date: string, now: Date): number {
  const today = kstNow(now).date;
  return date >= today ? daysInclusive(today, date) - 1 : -(daysInclusive(date, today) - 1);
}

const anyDate = (d: DealDates) => DATE_FIELDS.some((f) => d[f]);
const needsCalendar = (s: DealState, o: NextOptions) => anyDate(s.dates) && !!s.datesChangedAt && (!o.calendarSavedAt || o.calendarSavedAt < s.datesChangedAt);

/** 진행 중 단계에서 다음 날짜 카드 (계약일 → 잔금일) */
function dateCard(phase: DealPhase, s: DealState, now: Date, viewer: Viewer): NextAction | null {
  const field: DateField | null = phase === 'CONTRACTED' ? 'BALANCE' : phase === 'MATCHED' || phase === 'PROVISIONAL' ? 'CONTRACT' : null;
  if (!field) return null;
  const date = s.dates[field];
  if (!date) return phase === 'MATCHED' ? null : viewer === 'BROKER' ? { kind: 'SET_DATES', vars: s.declaredStep ? { declared: s.declaredStep } : {}, reports: ALLOWED[phase] } : null;
  const d = dday(date, now);
  if (d <= DAY_CARD_FROM_DAYS_BEFORE) {
    const docs = field === 'CONTRACT' ? 'CONTRACT' : 'BALANCE';
    return {
      kind: field === 'CONTRACT' ? 'CONTRACT_DAY' : 'BALANCE_DAY',
      vars: { date, dday: d },
      ...(viewer === 'BROKER' ? { docs, reports: ALLOWED[phase] } : {}),
    } as NextAction;
  }
  if (phase === 'MATCHED') return null;
  return { kind: field === 'CONTRACT' ? 'UNTIL_CONTRACT' : 'UNTIL_BALANCE', vars: { date, dday: d }, ...(viewer === 'BROKER' ? { reports: ALLOWED[phase] } : {}) };
}

/** 지금 할 일 카드 한 장 (위에서부터 먼저 걸리는 것) */
export function nextAction(ctx: DealContext, viewer: Viewer, now: Date, opts: NextOptions = {}): NextAction {
  const phase = dealPhase(ctx);
  const s = dealState(ctx.deals[ctx.offerId] ?? []);
  const offer = offerOf(ctx.request, ctx.offerId);

  if (phase === 'RELEASED') return { kind: 'RELEASED', vars: {} };
  if (phase === 'CLOSED_ELSEWHERE') {
    const h = viewer === 'BROKER' ? removeAdHoursLeft(ctx, now) : null;
    if (h !== null) return { kind: 'REMOVE_AD', vars: { h } };
    return { kind: 'CLOSED', vars: ownerEnded(ctx.request)?.reason === 'FAKE_CONFIRMED' ? { fake: 1 } : {} };
  }
  if (phase === 'BROKEN') return { kind: 'ENDED_BROKEN', vars: {} };
  if (phase === 'DONE') {
    if (viewer === 'BROKER') return { kind: s.review ? 'CREDIT_RETURNED' : 'WAIT_REVIEW', vars: {} };
    if (s.feeKept === null) return { kind: 'FEE_CHECK', vars: {} };
    // 후기는 잔금 확인 즉시 (대표님 2026-10-25)
    return { kind: s.review ? 'REVIEW_DONE' : 'WRITE_REVIEW', vars: {} };
  }
  if (s.pending)
    return {
      kind: viewer === 'OWNER' ? 'CONFIRM' : 'WAIT_OWNER',
      vars: { step: s.pending.step, contract: s.dates.CONTRACT ?? '', balance: s.dates.BALANCE ?? '' },
    };
  if (viewer === 'OWNER' && phase === 'CONTRACTED') {
    if (s.feeKept === null) return { kind: 'FEE_CHECK', vars: {} };
    // 중개사가 계약 확정 뒤 48시간 안에 잔금일을 안 넣으면 집주인이 직접 (약속 이행 기록엔 안 쌓임)
    if (!s.dates.BALANCE && s.contractedAt && hoursUntil(new Date(s.contractedAt).getTime() + CONTRACT_REPORT_HOURS * 3_600_000, now.getTime()) === 0)
      return { kind: 'OWNER_SET_DATES', vars: {} };
  }

  // 집주인이 잠시 멈춤 (매칭 단계): 광고가 올라가 있으면 내려 달라고, 내렸으면 아래 POST_AD가 "잠시 멈췄어요"
  if (viewer === 'BROKER' && phase === 'MATCHED' && ctx.request.paused) {
    const h = removeAdHoursLeft(ctx, now);
    if (h !== null) return { kind: 'REMOVE_AD', vars: { paused: 1, h } };
  }
  if (viewer === 'BROKER') {
    // 소유자 확인은 매칭 단계에서만 (집주인이 먼저 계약을 알렸으면 건너뜀)
    if (phase === 'MATCHED' && !s.ownerCheck && !opts.ownerChecked) return { kind: 'OWNER_CHECK', vars: {} };
    if (s.lastDenied) return { kind: 'CALL_OWNER', vars: { step: s.lastDenied.step }, reports: ALLOWED[phase] };
  }
  // 당일·전날 카드가 먼저 (그날엔 캘린더에 저장하라고 묻지 않음, 대표님 2026-10-25)
  const dc = dateCard(phase, s, now, viewer);
  const dayCard = dc?.kind === 'CONTRACT_DAY' || dc?.kind === 'BALANCE_DAY';
  if (!dayCard && needsCalendar(s, opts)) return { kind: 'SAVE_CALENDAR', vars: { contract: s.dates.CONTRACT ?? '', middle: s.dates.MIDDLE ?? '', balance: s.dates.BALANCE ?? '' } };
  if (dc) return dc;
  if (viewer === 'OWNER') return { kind: 'IN_PROGRESS', vars: {} };
  if (!adUp(offer, s)) {
    const ad = offer ? adState({ ...offer, ad: null }, ctx.request, now.getTime()) : ({ kind: 'OVERDUE' } as AdState);
    return { kind: 'POST_AD', vars: ad.kind === 'PENDING' ? { h: ad.hoursLeft } : { state: ad.kind } };
  }
  return { kind: 'VISITS_AND_DEAL', vars: {}, reports: ALLOWED[phase] };
}

// ── 색 띠 ─────────────────────────────────────────────────

/** 빨강 기한 / 파랑 내가 확인할 것 / 노랑 24시간 안 / 초록 다음 일정 / 회색 끝남. 겹치면 이 순서로 */
export type StripTone = 'RISK' | 'ACTION' | 'CAUTION' | 'GOOD' | 'DONE';
export const STRIP_ORDER: StripTone[] = ['RISK', 'ACTION', 'CAUTION', 'GOOD', 'DONE'];
/**
 * 보는 사람별 우선순위 (대표님 2026-10-25): 집주인은 "확인해 주세요"(파랑)가 다른 중개사 광고 기한(빨강)보다 중요하다.
 * 중개사는 광고 기한을 넘기면 해제될 수 있어 빨강이 먼저
 */
export function stripOrder(viewer: Viewer): StripTone[] {
  return viewer === 'OWNER' ? ['ACTION', 'RISK', 'CAUTION', 'GOOD', 'DONE'] : STRIP_ORDER;
}

export type StripKey =
  | 'AD_LEFT'
  | 'AD_OVERDUE'
  | 'DATE_PASSED'
  | 'CONFIRM'
  | 'CALL_OWNER'
  | 'REMOVE_AD'
  | 'REMOVE_AD_PAUSED'
  | 'REMOVE_AD_LATE'
  | 'PAUSED'
  | 'SAVE_CALENDAR'
  | 'SET_DATES'
  | 'OWNER_CHECK'
  | 'OWNER_CHECKING'
  | 'WAIT_OWNER'
  | 'VISIT_SOON'
  | 'CONTRACT_DAY'
  | 'BALANCE_DAY'
  | 'AD_SOON'
  | 'CONTRACT_ON'
  | 'BALANCE_ON'
  | 'VISIT_ON'
  | 'AD_LIVE'
  | 'PROVISIONAL'
  | 'IN_PROGRESS'
  | 'FEE_CHECK'
  | 'WRITE_REVIEW'
  | 'CREDIT_RETURNED'
  | 'DONE'
  | 'BROKEN'
  | 'CLOSED'
  | 'RELEASED'
  /** 집주인 "지금 확인할 일" 전용: 바뀐 희망가를 아직 알리지 않은 곳 (priceChange.pendingPriceNotices, 카드 띠에는 안 씀) */
  | 'PRICE_NOTIFY';

export interface CardStrip {
  tone: StripTone;
  key: StripKey;
  vars: Record<string, string | number>;
}

const HOUR_MS = 3_600_000;
export const VISIT_SOON_HOURS = 24;

/** 목록 카드 아래 색 띠 한 줄. 여러 조건에 걸리면 STRIP_ORDER 앞의 것 */
export function cardStrip(ctx: DealContext, viewer: Viewer, now: Date, opts: NextOptions = {}): CardStrip {
  const phase = dealPhase(ctx);
  const s = dealState(ctx.deals[ctx.offerId] ?? []);
  const offer = offerOf(ctx.request, ctx.offerId);
  const out: CardStrip[] = [];
  const add = (tone: StripTone, key: StripKey, vars: Record<string, string | number> = {}) => out.push({ tone, key, vars });

  // 광고 내려 달라는 요청을 24시간 넘게 안 지키면 빨강 (새 요청 보내기 잠금 대상). 그 전엔 남은 시간을 띠 오른쪽에
  const h = viewer === 'BROKER' ? removeAdHoursLeft(ctx, now) : null;

  if (phase === 'RELEASED') add('DONE', 'RELEASED');
  else if (phase === 'CLOSED_ELSEWHERE') {
    if (h !== null) h === 0 ? add('RISK', 'REMOVE_AD_LATE') : add('ACTION', 'REMOVE_AD', { h });
    add('DONE', 'CLOSED');
  } else if (phase === 'MATCHED' && ctx.request.paused) {
    // 잠시 멈춤: 광고 내림만 (방문은 멈출 때 취소됨, 광고 기한은 다시 시작할 때부터)
    if (s.pending) viewer === 'OWNER' ? add('ACTION', 'CONFIRM', { step: s.pending.step }) : add('GOOD', 'WAIT_OWNER', { step: s.pending.step });
    if (h !== null) h === 0 ? add('RISK', 'REMOVE_AD_LATE') : add('ACTION', 'REMOVE_AD_PAUSED', { h });
    add('CAUTION', 'PAUSED');
  } else if (phase === 'DONE') {
    // 집주인은 복비 답·후기가 남았으면 파랑, 중개사는 후기로 크레딧을 돌려받았으면 그 한 줄
    if (viewer === 'OWNER' && s.feeKept === null) add('ACTION', 'FEE_CHECK');
    if (viewer === 'OWNER' && !s.review) add('ACTION', 'WRITE_REVIEW');
    add('DONE', viewer === 'BROKER' && s.review ? 'CREDIT_RETURNED' : 'DONE');
  } else if (phase === 'BROKEN') add('DONE', 'BROKEN');
  else {
    // 확인 대기
    if (s.pending) viewer === 'OWNER' ? add('ACTION', 'CONFIRM', { step: s.pending.step }) : add('GOOD', 'WAIT_OWNER', { step: s.pending.step });
    if (viewer === 'OWNER' && phase === 'CONTRACTED' && s.feeKept === null) add('ACTION', 'FEE_CHECK');
    const checking = offer?.fakeReport?.status === 'PENDING';
    if (checking) add('CAUTION', 'OWNER_CHECKING');
    if (viewer === 'BROKER' && phase === 'MATCHED' && !s.ownerCheck && !opts.ownerChecked && !checking) add('ACTION', 'OWNER_CHECK');
    if (viewer === 'BROKER' && s.lastDenied) add('ACTION', 'CALL_OWNER', { step: s.lastDenied.step });
    const nextDate = s.dates[phase === 'CONTRACTED' ? 'BALANCE' : 'CONTRACT'];
    const dayWindow = !!nextDate && dday(nextDate, now) <= DAY_CARD_FROM_DAYS_BEFORE;
    if (!dayWindow && needsCalendar(s, opts)) add('ACTION', 'SAVE_CALENDAR');
    // 가계약·계약 뒤 다음 날짜가 비어 있으면 중개사 할 일
    if (viewer === 'BROKER' && !s.pending && ((phase === 'PROVISIONAL' && !s.dates.CONTRACT) || (phase === 'CONTRACTED' && !s.dates.BALANCE))) add('ACTION', 'SET_DATES');
    // 광고 기한 (매칭 단계, 광고 전)
    if (phase === 'MATCHED' && offer && !adUp(offer, s)) {
      const ad = adState({ ...offer, ad: null }, ctx.request, now.getTime());
      const u = adUrgency(ad);
      if (u === 'OVERDUE') add('RISK', 'AD_OVERDUE');
      else if (u === 'URGENT' && ad.kind === 'PENDING') add('RISK', 'AD_LEFT', { h: ad.hoursLeft });
      else if (u === 'SOON' && ad.kind === 'PENDING') add('CAUTION', 'AD_SOON', { h: ad.hoursLeft });
      else if (ad.kind === 'PENDING') add('GOOD', 'AD_LEFT', { h: ad.hoursLeft });
    }
    if (adUp(offer, s) && offer && phase === 'MATCHED') {
      const ad = adState(offer, ctx.request, now.getTime());
      if (ad.kind === 'LIVE') add('GOOD', 'AD_LIVE', { day: ad.day });
    }
    // 계약일·잔금일
    const field: DateField | null = phase === 'CONTRACTED' ? 'BALANCE' : 'CONTRACT';
    const date = s.dates[field];
    if (date) {
      const d = dday(date, now);
      if (d < 0 && !s.pending) add('RISK', 'DATE_PASSED', { field, date });
      else if (d <= DAY_CARD_FROM_DAYS_BEFORE) add('CAUTION', field === 'CONTRACT' ? 'CONTRACT_DAY' : 'BALANCE_DAY', { date, dday: d });
      else add('GOOD', field === 'CONTRACT' ? 'CONTRACT_ON' : 'BALANCE_ON', { date, dday: d });
    }
    // 방문 (이 중개사 것만)
    const next = upcomingVisits(ctx.request.visits, kstNow(now).date)
      .filter((v) => v.offerId === ctx.offerId)
      .map((v) => ({ v, ms: kstVisitMs(v.date, v.hour) }))
      .filter(({ ms }) => ms >= now.getTime())[0];
    if (next) {
      const h = Math.ceil((next.ms - now.getTime()) / HOUR_MS);
      add(h <= VISIT_SOON_HOURS ? 'CAUTION' : 'GOOD', h <= VISIT_SOON_HOURS ? 'VISIT_SOON' : 'VISIT_ON', { date: next.v.date, hour: next.v.hour, h });
    }
    if (phase === 'PROVISIONAL') add('GOOD', 'PROVISIONAL');
    if (out.length === 0) add('GOOD', 'IN_PROGRESS');
  }
  const order = stripOrder(viewer);
  return out.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone))[0];
}

// ── 먼저 끝낼 일 (대표님 2026-10-26: 중개사는 기한 지난 일이 있으면 새 요청 보내기만 잠금) ──

/**
 * 새 의뢰에 요청 보내기를 막는 색 띠: 기한이 지난 것만 (광고 48시간 지남, 광고 내림 24시간 지남, 계약일·잔금일 지남 미보고).
 * 내 매물·거래 페이지·전화는 막지 않는다 — 그 일을 하러 들어갈 길이라서
 */
export const BLOCKING_STRIPS: StripKey[] = ['AD_OVERDUE', 'REMOVE_AD_LATE', 'DATE_PASSED'];

export function isBlocking(strip: CardStrip): boolean {
  return strip.tone === 'RISK' && BLOCKING_STRIPS.includes(strip.key);
}
