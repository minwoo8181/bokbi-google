/**
 * 잘하는 점 칩 칸 수 (결정론, 대표님 2026-10-26)
 * - 기본 3칸, 받은 후기가 10개 이상이면 1칸 더 (약관 제9조: 기준은 바뀔 수 있음)
 * - 후기는 별점과 상관없이 등록된 개수만 센다 (가짜 숫자 금지: 실제 거래 기록에서만)
 */
import { SITE_CONTENT } from '@/config/siteContent';
import type { BrokerWorkspace, MockMarket } from './mockMarket';
import { dealState } from '@/lib/deal/deal';

export const BASE_STRENGTH_SLOTS = SITE_CONTENT.brokerStrengths.max;
export const BONUS_SLOT_REVIEWS = 10;

export function strengthSlots(reviewCount: number): number {
  return BASE_STRENGTH_SLOTS + (reviewCount >= BONUS_SLOT_REVIEWS ? 1 : 0);
}

/** 내가 받은 후기 개수와 별점 평균 (후기 없으면 average null) */
export function reviewSummary(ws: BrokerWorkspace, market: Pick<MockMarket, 'deals'>): { count: number; average: number | null } {
  const stars = ws.sent
    .map((s) => dealState(market.deals?.[s.requestId]?.[s.offerId] ?? []).review?.stars)
    .filter((n): n is number => typeof n === 'number');
  if (stars.length === 0) return { count: 0, average: null };
  return { count: stars.length, average: Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 };
}
