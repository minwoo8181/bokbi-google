/**
 * 중개사 내 사무소 "이번 달 내 성과" (대표님 2026-10-29 중개사 화면 A안): 요청 보냄 → 집주인이 고름 → 계약, 계약한 곳의 보수.
 * 결정론·순수 함수. 이번 달 = 보낸 날의 한국 날짜 기준 같은 달. 계약은 그 요청 카드의 거래 기록이 계약 이후(CONTRACTED·DONE)인 것만
 */
import { kstDateKey } from './credits';
import type { SentRequest } from './feed';
import { dealState, type RequestDeals } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';

export interface MonthPerformance {
  sent: number;
  picked: number;
  contracted: number;
  /** 계약한 곳의 보수 합 (원) */
  feeWon: number;
}

/** 집주인이 인정한 장점: 내가 받은 후기들의 후기 칩 개수 (전체 기간, 많이 고른 순은 topReviewChips) */
export function reviewChipCounts(sent: SentRequest[], dealsFor: (requestId: string) => RequestDeals): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sent) {
    for (const c of dealState(dealsFor(s.requestId)[s.offerId] ?? []).review?.chips ?? []) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}

export function monthPerformance(input: {
  sent: SentRequest[];
  byId: Map<string, OwnerRequest>;
  dealsFor: (requestId: string) => RequestDeals;
  /** 계약 보수 (거래금액이 바뀌었으면 바뀐 금액 기준 — useAgentWorkspace.feeOf) */
  feeOf: (s: SentRequest) => number;
  now: Date;
}): MonthPerformance {
  const month = kstDateKey(input.now).slice(0, 7);
  const out: MonthPerformance = { sent: 0, picked: 0, contracted: 0, feeWon: 0 };
  for (const s of input.sent) {
    if (kstDateKey(new Date(s.sentAt)).slice(0, 7) !== month) continue;
    out.sent += 1;
    const r = input.byId.get(s.requestId);
    if (!r) continue;
    const picked = r.matchedOfferIds.includes(s.offerId) || (r.releasedOfferIds ?? []).includes(s.offerId);
    if (!picked) continue;
    out.picked += 1;
    const phase = dealState(input.dealsFor(r.id)[s.offerId] ?? []).phase;
    if (phase === 'CONTRACTED' || phase === 'DONE') {
      out.contracted += 1;
      out.feeWon += input.feeOf(s);
    }
  }
  return out;
}
