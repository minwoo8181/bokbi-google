import { describe, expect, it } from 'vitest';
import { EMPTY_MARKET, EMPTY_WORKSPACE } from '@/lib/broker/mockMarket';
import type { DealEvent, DealEventBody } from '@/lib/deal/deal';
import { BASE_STRENGTH_SLOTS, BONUS_SLOT_REVIEWS, reviewSummary, strengthSlots } from '../strengthSlots';

const now = new Date('2026-11-01T03:00:00Z');
let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `e${seq++}`, at: new Date(now.getTime() + h * 3_600_000).toISOString(), ...body }) as DealEvent;

/** 잔금까지 끝나고 후기(별점 stars)가 등록된 거래 */
const doneWithReview = (stars: number): DealEvent[] => [
  ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }),
  ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }),
  ev(1, { kind: 'REPORT', step: 'CONTRACT' }),
  ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
  ev(5, { kind: 'REPORT', step: 'BALANCE' }),
  ev(6, { kind: 'ANSWER', step: 'BALANCE', ok: true }),
  ev(7, { kind: 'REVIEW', stars, chips: [] }),
];

function workspaceWith(starsList: (number | null)[]) {
  const sent = starsList.map((_, i) => ({ requestId: `R${i}`, offerId: `offer-${i}`, sentAt: now.toISOString(), strengths: [], snapshot: {} as never }));
  const deals = Object.fromEntries(
    starsList.map((stars, i) => [`R${i}`, { [`offer-${i}`]: stars === null ? doneWithReview(5).slice(0, -1) : doneWithReview(stars) }]),
  );
  return { ws: { ...EMPTY_WORKSPACE, sent }, market: { ...EMPTY_MARKET, deals } };
}

describe('잘하는 점 칩 칸 (후기 10개 이상이면 1칸 더)', () => {
  it('경계값 전수: 0~9개는 3칸, 10개부터 4칸, 그 위로는 늘지 않음', () => {
    for (let n = 0; n <= 30; n++) expect(strengthSlots(n), `${n}`).toBe(n >= BONUS_SLOT_REVIEWS ? BASE_STRENGTH_SLOTS + 1 : BASE_STRENGTH_SLOTS);
    expect(BASE_STRENGTH_SLOTS).toBe(3);
  });

  it('후기 집계: 등록된 후기만 세고, 평균은 소수 첫째 자리', () => {
    expect(reviewSummary(EMPTY_WORKSPACE, EMPTY_MARKET)).toEqual({ count: 0, average: null });
    const { ws, market } = workspaceWith([5, 4, 4, null]);
    expect(reviewSummary(ws, market)).toEqual({ count: 3, average: 4.3 });
  });

  it('후기 10개가 쌓이면 실제로 4칸이 된다 (별점 무관)', () => {
    const nine = workspaceWith(Array(9).fill(1));
    const ten = workspaceWith(Array(10).fill(1));
    expect(strengthSlots(reviewSummary(nine.ws, nine.market).count)).toBe(3);
    expect(strengthSlots(reviewSummary(ten.ws, ten.market).count)).toBe(4);
  });
});
