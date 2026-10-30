/**
 * 내 의뢰 상태 계산 (순수 함수)
 */
import type { BrokerOffer, ContractInfo, OwnerRequest, RequestStage } from './types';
import { reportHoldMs } from '@/lib/broker/fakeReport';

export const RECEIVING_HOURS = 48;
export const MAX_MATCH = 3;
/** 매칭 후 광고 등록 기한. 넘기면 집주인이 그 중개사만 바로 해제할 수 있다 */
export const AD_DEADLINE_HOURS = 48;
/** 매칭 후 취소·멈춤·거둬들이기를 막는 보호 기간 (파일럿 데이터로 조정) */
export const PROTECTION_DAYS = 7;
/** 계약을 알린 뒤 중개사가 계약일·잔금일을 알려 줄 기한. 넘기면 집주인이 직접 입력 */
export const CONTRACT_REPORT_HOURS = 48;
/** 후기 평균은 3건부터 (1~2건은 한두 사람 점수에 흔들려서 건수만) */
export const REVIEW_AVERAGE_MIN = 3;
/** 복비 다시 요청 시트의 버튼 (10만·1만 단위) */
export const FEE_STEPS = [-100_000, -10_000, 10_000, 100_000] as const;
/** 다시 요청할 수 있는 최소 복비 */
export const MIN_FEE_WON = 100_000;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const ms = (iso: string) => new Date(iso).getTime();

/** 남은 시간(시간 단위, 올림). 지났으면 0 */
export function hoursUntil(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / HOUR));
}

export function hoursLeft(createdAt: string, now: number): number {
  return hoursUntil(ms(createdAt) + RECEIVING_HOURS * HOUR, now);
}

/** 저장된 단계에 시간 만료를 반영한 실제 단계 */
export function effectiveStage(r: OwnerRequest, now: number): { stage: RequestStage; endedReason: OwnerRequest['endedReason'] } {
  if (r.stage === 'RECEIVING' && hoursLeft(r.createdAt, now) === 0) return { stage: 'ENDED', endedReason: 'EXPIRED' };
  return { stage: r.stage, endedReason: r.endedReason };
}

/** 선택 토글. 최대 3곳을 넘으면 그대로 둔다 */
export function toggleSelection(selected: string[], offerId: string): string[] {
  if (selected.includes(offerId)) return selected.filter((id) => id !== offerId);
  if (selected.length >= MAX_MATCH) return selected;
  return [...selected, offerId];
}

// ── 익명 카드 배지 ────────────────────────────────────────────

export type OfficeAgeBand = 'UNDER_3' | 'FROM_3_TO_10' | 'OVER_10';
export type AgentCountBand = 'ONE' | 'TWO_PLUS';

/** 정확한 연도는 오래된 사무소일수록 다산동에서 1~3곳뿐이라 구간으로만 */
export function officeAgeBand(openYear: number | null, currentYear: number): OfficeAgeBand | null {
  if (openYear === null) return null;
  const age = currentYear - openYear;
  if (age < 3) return 'UNDER_3';
  if (age < 10) return 'FROM_3_TO_10';
  return 'OVER_10';
}

export function agentCountBand(n: number | null): AgentCountBand | null {
  if (n === null || n < 1) return null;
  return n === 1 ? 'ONE' : 'TWO_PLUS';
}

/**
 * 약속 이행 1건으로 세는 거래 (대표님 2026-10-25):
 * 집주인이 "합의한 복비 그대로 계약했다"고 확인했고, 계약일·잔금일을 중개사가 직접 알린 거래만.
 * 기한을 넘겨 집주인이 대신 입력한 거래는 벌점 없이 기록에만 쌓이지 않는다 (직접 보고하러 다시 들어오게)
 */
export function countsAsKeptPromise(c: Pick<ContractInfo, 'reportedBy' | 'feeKept' | 'contractDate' | 'balanceDate'>): boolean {
  return c.feeKept === true && c.reportedBy === 'BROKER' && !!c.contractDate && !!c.balanceDate;
}

/** 방패 단계: 1건부터 1개, 5건부터 2개, 10건부터 3개 (최대 3개, 그 위는 건수로). 기준은 정책값 */
export const PROMISE_TIER_MIN = [1, 5, 10] as const;

export function promiseTier(kept: number): 0 | 1 | 2 | 3 {
  if (kept >= PROMISE_TIER_MIN[2]) return 3;
  if (kept >= PROMISE_TIER_MIN[1]) return 2;
  if (kept >= PROMISE_TIER_MIN[0]) return 1;
  return 0;
}

/** 약속 레벨 1~4 = 방패 단계 + 1 (0건 레벨 1 · 1건 2 · 5건 3 · 10건 4). 화면 부품 common/PromiseLevel */
export function promiseLevel(kept: number): 1 | 2 | 3 | 4 {
  return (promiseTier(kept) + 1) as 1 | 2 | 3 | 4;
}

/** 익명 카드에 보여줄 확인 배지 (가짜 숫자 금지: 기록이 없으면 "복비 첫 거래") */
export interface TrustBadges {
  ageBand: OfficeAgeBand | null;
  agentBand: AgentCountBand | null;
  firstDeal: boolean;
  /** 약속 이행 건수와 방패 단계. 0건이면 null */
  promise: { kept: number; tier: 1 | 2 | 3 } | null;
  review: { count: number; average: number | null } | null;
}

export function trustBadges(o: BrokerOffer, currentYear: number): TrustBadges {
  const hasDeals = o.promise.total > 0;
  const hasReview = o.review.count > 0;
  const tier = promiseTier(o.promise.kept);
  return {
    ageBand: officeAgeBand(o.officeOpenYear, currentYear),
    agentBand: agentCountBand(o.agentCount),
    firstDeal: !hasDeals && !hasReview,
    promise: tier > 0 ? { kept: o.promise.kept, tier: tier as 1 | 2 | 3 } : null,
    review: hasReview
      ? { count: o.review.count, average: o.review.count >= REVIEW_AVERAGE_MIN ? o.review.average : null }
      : null,
  };
}

/** 후기 요약 시트: 칩별 개수 많은 순 */
export function topReviewChips(chipCounts: Record<string, number>, limit = 5): Array<[string, number]> {
  return Object.entries(chipCounts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

/**
 * 강점 칩 "인정" 수: 계약한 집주인들이 후기에서 짝이 되는 후기 칩을 고른 횟수 (pairs = brokerStrengths.endorsedBy)
 * 짝이 없거나 0이면 0 (화면에는 1 이상일 때만 표시)
 */
export function endorsementCount(strength: string, chipCounts: Record<string, number>, pairs: Record<string, string>): number {
  const pair = pairs[strength];
  return pair ? chipCounts[pair] ?? 0 : 0;
}

/**
 * 후기 쓰기 (①안, 대표님 2026-10-29): 위에 "이 중개사가 잘한다고 한 것, 맞았나요?" = 중개사가 이 요청에 실어 보낸 강점의 짝 후기 칩,
 * 아래 접힌 "다른 좋았던 점" = 나머지 후기 칩 묶음(위와 겹치는 칩 빼고, 빈 묶음 없앰). 짝이 없거나 후기 칩 목록에 없는 강점은 건너뜀
 */
export function reviewChipSplit<G extends { label: string; chips: readonly string[] }>(
  strengths: readonly string[],
  pairs: Record<string, string>,
  groups: readonly G[],
): { claimed: string[]; rest: { label: string; chips: string[] }[] } {
  const all = new Set(groups.flatMap((g) => g.chips));
  const claimed = [...new Set(strengths.map((s) => pairs[s]).filter((c): c is string => !!c && all.has(c)))];
  const rest = groups
    .map((g) => ({ label: g.label, chips: g.chips.filter((c) => !claimed.includes(c)) }))
    .filter((g) => g.chips.length > 0);
  return { claimed, rest };
}

/**
 * 익명 카드 "집주인이 인정한 장점" 펼치기 (대표님 2026-10-29): 후기 칩 많이 고른 순 5개.
 * 위 "잘하는 점"에 이미 "인정 n"으로 나온 칩(중개사가 이번에 실어 보낸 강점의 짝)은 뺀다
 */
export function ownerEndorsedChips(
  chipCounts: Record<string, number>,
  shownStrengths: readonly string[],
  pairs: Record<string, string>,
  limit = 5,
): Array<[string, number]> {
  const shown = new Set(shownStrengths.map((s) => pairs[s]).filter(Boolean));
  return topReviewChips(
    Object.fromEntries(Object.entries(chipCounts).filter(([c]) => !shown.has(c))),
    limit,
  );
}

// ── 진행중: 광고 기한·보호 기간 ───────────────────────────────

export type AdState =
  | { kind: 'LIVE'; day: number }
  | { kind: 'PENDING'; hoursLeft: number }
  | { kind: 'OVERDUE' }
  | { kind: 'PAUSED' }
  /** 이 중개사가 허위 매물로 알려 운영팀이 소유자 확인 중: 광고 시간 멈춤, 집주인 해제 버튼 없음 */
  | { kind: 'CHECKING' };

/** 광고 며칠째 (올린 날 = 1일째) */
export function adDay(postedAt: string, now: number): number {
  return Math.max(1, Math.floor((now - ms(postedAt)) / DAY) + 1);
}

export function adState(o: BrokerOffer, r: Pick<OwnerRequest, 'adWindowStartedAt' | 'paused'>, now: number): AdState {
  if (o.fakeReport?.status === 'PENDING') return { kind: 'CHECKING' };
  if (r.paused) return { kind: 'PAUSED' };
  if (o.ad) return { kind: 'LIVE', day: adDay(o.ad.postedAt, now) };
  const windowStart = r.adWindowStartedAt ? ms(r.adWindowStartedAt) : now;
  // 허위 매물 신고가 반려됐으면 확인을 기다린 시간만큼 늦게 시작한 것으로 (남은 시간 그대로 이어짐)
  const start = windowStart + reportHoldMs(o.fakeReport, windowStart, now);
  // 화면 시각(1분마다 갱신)이 상대가 방금 다시 시작한 시각보다 조금 이를 수 있어 48시간을 넘겨 보이지 않게
  const left = Math.min(AD_DEADLINE_HOURS, hoursUntil(start + AD_DEADLINE_HOURS * HOUR, now));
  return left > 0 ? { kind: 'PENDING', hoursLeft: left } : { kind: 'OVERDUE' };
}

/** 7일 보호가 끝나는 시각 */
export function protectionEndsAt(matchedAt: string): number {
  return ms(matchedAt) + PROTECTION_DAYS * DAY;
}

export function isProtected(matchedAt: string | null, now: number): boolean {
  return matchedAt !== null && now < protectionEndsAt(matchedAt);
}

/** 한 곳 해제 후: 남은 곳이 없으면 종료 */
export function releaseOffer(r: OwnerRequest, offerId: string): OwnerRequest {
  const matchedOfferIds = r.matchedOfferIds.filter((id) => id !== offerId);
  const releasedOfferIds = [...(r.releasedOfferIds ?? []), offerId];
  return matchedOfferIds.length === 0
    ? { ...r, matchedOfferIds, releasedOfferIds, stage: 'ENDED', endedReason: 'RELEASED' }
    : { ...r, matchedOfferIds, releasedOfferIds };
}

// ── 계약 ───────────────────────────────────────────────────

/** 중개사가 계약일·잔금일을 알려 줄 남은 시간. 0이면 집주인이 직접 입력 */
export function contractReportHoursLeft(reportedAt: string, now: number): number {
  return hoursUntil(ms(reportedAt) + CONTRACT_REPORT_HOURS * HOUR, now);
}

/** 후기는 잔금일 다음 날부터 (복비는 보통 잔금 때 낸다) */
export function canReview(balanceDate: string | null, today: string): boolean {
  return balanceDate !== null && today > balanceDate;
}

// ── 진행 막대 ─────────────────────────────────────────────

export const PROGRESS_STEPS = 5;

/** 1부터. 계약 완료 뒤 후기까지 끝나면 5 */
export function progressStep(stage: RequestStage, reviewed: boolean): number {
  if (stage === 'RECEIVING') return 1;
  if (stage === 'IN_PROGRESS') return 3;
  if (stage === 'CONTRACTED') return reviewed ? 5 : 4;
  return 0;
}

// ── 다시 요청 (매칭 전 복비 변경 = 취소하고 다시 등록) ─────────────

export function clampFee(fee: number, legalMaxWon: number): number {
  return Math.min(Math.max(fee, MIN_FEE_WON), legalMaxWon);
}

/** 같은 집·같은 정보로 새 요청. 도착한 요청·매칭·계약은 비운다 */
export function rerequest(r: OwnerRequest, commissionWon: number, now: Date): OwnerRequest {
  return {
    ...r,
    id: `${r.id.split('~')[0]}~${now.getTime()}`,
    commissionWon: clampFee(commissionWon, r.legalMaxWon),
    createdAt: now.toISOString(),
    stage: 'RECEIVING',
    endedReason: null,
    endedAt: null,
    offers: [],
    matchedOfferIds: [],
    matchedAt: null,
    adWindowStartedAt: null,
    paused: null,
    visits: [],
    contract: null,
  };
}
