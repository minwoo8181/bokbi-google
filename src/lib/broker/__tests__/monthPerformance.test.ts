import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import { dealState, type DealEvent, type DealEventBody, type RequestDeals } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import type { SentRequest } from '../feed';
import { monthPerformance, reviewChipCounts } from '../monthPerformance';

const now = new Date('2026-11-20T03:00:00Z');
let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `e${seq++}`, at: new Date(Date.UTC(2026, 10, 10, h)).toISOString(), ...body }) as DealEvent;
const contracted = [ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-12' }), ev(1, { kind: 'REPORT', step: 'CONTRACT' }), ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true })];

const sent = (requestId: string, offerId: string, sentAt: string): SentRequest => ({
  requestId,
  offerId,
  sentAt,
  strengths: [],
  snapshot: { complexName: '단지', tradeType: '매매', pyeongLabel: '34평', maskedDongHo: '1**동', commissionWon: 4_000_000 },
});
const req = (id: string, matched: string[], released: string[] = []): OwnerRequest => ({ ...demoRequest(now), id, matchedOfferIds: matched, releasedOfferIds: released });

describe('이번 달 내 성과', () => {
  const byId = new Map([
    ['R1', req('R1', ['o1'])],
    ['R2', req('R2', ['other'])],
    ['R3', req('R3', [], ['o3'])],
  ]);
  const deals: Record<string, RequestDeals> = { R1: { o1: contracted } };
  const base = { byId, dealsFor: (id: string) => deals[id] ?? {}, feeOf: () => 3_500_000, now };

  it('보냄 → 고름(해제된 곳 포함) → 계약 + 계약 보수', () => {
    expect(dealState(contracted).phase).toBe('CONTRACTED');
    const list = [sent('R1', 'o1', '2026-11-02T01:00:00Z'), sent('R2', 'o2', '2026-11-05T01:00:00Z'), sent('R3', 'o3', '2026-11-06T01:00:00Z')];
    expect(monthPerformance({ ...base, sent: list })).toEqual({ sent: 3, picked: 2, contracted: 1, feeWon: 3_500_000 });
  });

  it('지난달 보낸 요청은 빼고, 달 경계는 한국 시간', () => {
    // 10/31 23:30 KST = 10/31 14:30Z → 지난달, 11/1 00:30 KST = 10/31 15:30Z → 이번 달
    const list = [sent('R2', 'o2', '2026-10-31T14:30:00Z'), sent('R2', 'o2', '2026-10-31T15:30:00Z')];
    expect(monthPerformance({ ...base, sent: list }).sent).toBe(1);
  });

  it('인정한 장점: 받은 후기 칩을 모두 센다', () => {
    // 후기는 잔금(DONE) 뒤에만 받는다
    const review = (chips: string[]) => [
      ...contracted,
      ev(3, { kind: 'DATE', field: 'BALANCE', date: '2026-11-15' }),
      ev(4, { kind: 'REPORT', step: 'BALANCE' }),
      ev(5, { kind: 'ANSWER', step: 'BALANCE', ok: true }),
      ev(6, { kind: 'REVIEW', stars: 5, chips }),
    ];
    const d: Record<string, RequestDeals> = { R1: { o1: review(['설명이 자세해요', '연락이 빨라요']) }, R3: { o3: review(['설명이 자세해요']) } };
    const list = [sent('R1', 'o1', '2026-09-02T01:00:00Z'), sent('R3', 'o3', '2026-11-06T01:00:00Z'), sent('R2', 'o2', '2026-11-05T01:00:00Z')];
    expect(reviewChipCounts(list, (id) => d[id] ?? {})).toEqual({ '설명이 자세해요': 2, '연락이 빨라요': 1 });
    expect(reviewChipCounts([], () => ({}))).toEqual({});
  });

  it('사라진 의뢰는 보냄만 센다, 아무것도 없으면 0', () => {
    expect(monthPerformance({ ...base, sent: [sent('GONE', 'x', '2026-11-03T01:00:00Z')] })).toEqual({ sent: 1, picked: 0, contracted: 0, feeWon: 0 });
    expect(monthPerformance({ ...base, sent: [] })).toEqual({ sent: 0, picked: 0, contracted: 0, feeWon: 0 });
  });
});
