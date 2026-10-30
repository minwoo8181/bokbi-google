import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { BrokerApplication } from '@/lib/broker/application';
import type { DealEvent, RequestDeals } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import { NO_OFFER_ALERT_HOURS, todayCounts, todayItems, type TodayInput } from '../today';
import { appendAdminAction, type AdminAction } from '../adminLog';

const H = 3_600_000;
const now = new Date('2026-11-02T03:00:00Z');
const ago = (h: number) => new Date(now.getTime() - h * H).toISOString();

const app = (hoursAgo: number, status: BrokerApplication['status'] = 'PENDING'): BrokerApplication => ({
  regNo: '41360-2024-60048',
  office: '예시공인중개사사무소',
  code: '1234',
  strengths: [],
  phone: '010-0000-0000',
  submittedAt: ago(hoursAgo),
  status,
  reviewedAt: null,
  rejectReason: null,
  openYear: null,
});

/** 매칭 3곳 진행 중 의뢰 (offer-2 광고 중) */
function matched(): OwnerRequest {
  const r = demoRequest(now);
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: ['offer-1', 'offer-2', 'offer-3'],
    matchedAt: ago(30),
    adWindowStartedAt: ago(30),
    offers: r.offers.map((o) => ({ ...o, ad: o.id === 'offer-2' ? { url: 'https://fin.land.naver.com/articles/123456789', postedAt: ago(28) } : null })),
  };
}
/** 받는 중, 요청 0곳 */
const receiving = (createdHoursAgo: number): OwnerRequest => ({ ...demoRequest(now), id: 'R-EMPTY', offers: [], stage: 'RECEIVING', createdAt: ago(createdHoursAgo) });

const base = (over: Partial<TodayInput> = {}): TodayInput => ({ application: null, requests: [], deals: {}, log: [], now, ...over });
const feeEvents = (reason: 'AGREED' | 'OVERCHARGED' | 'OTHER', hoursAgo: number): DealEvent[] => [
  { id: 'd1', at: ago(hoursAgo + 2), kind: 'OWNER_DECLARED', step: 'CONTRACT' },
  { id: 'f1', at: ago(hoursAgo), kind: 'FEE_ANSWER', kept: false, reason },
];

describe('오늘 처리할 일', () => {
  it('아무 일도 없으면 빈 목록', () => {
    expect(todayItems(base())).toEqual([]);
  });

  it('가입 확인 대기: 대기 중만, 48시간부터 빨강', () => {
    expect(todayItems(base({ application: app(47) }))[0]).toMatchObject({ kind: 'SIGNUP', overdue: false, hours: 47 });
    expect(todayItems(base({ application: app(48) }))[0]).toMatchObject({ overdue: true });
    expect(todayItems(base({ application: app(10, 'APPROVED') }))).toEqual([]);
  });

  it('허위 매물 신고: 판정 전만, 24시간부터 빨강', () => {
    const r = matched();
    const withReport = (h: number, status: 'PENDING' | 'REJECTED' = 'PENDING') => ({
      ...r,
      offers: r.offers.map((o) => (o.id === 'offer-1' ? { ...o, fakeReport: { at: ago(h), status, decidedAt: status === 'PENDING' ? null : ago(1) } } : o)),
    });
    expect(todayItems(base({ requests: [withReport(23)] }))).toEqual([expect.objectContaining({ kind: 'FAKE_REPORT', offerId: 'offer-1', overdue: false })]);
    expect(todayItems(base({ requests: [withReport(24)] }))[0].overdue).toBe(true);
    expect(todayItems(base({ requests: [withReport(30, 'REJECTED')] }))).toEqual([]);
  });

  it('복비 "중개사가 더 요구"만 (합의 조정·기타 제외), 관리자가 확인·반려하면 빠지고 연락함만으로는 남음', () => {
    const r = matched();
    const deals = (reason: 'AGREED' | 'OVERCHARGED' | 'OTHER'): Record<string, RequestDeals> => ({ [r.id]: { 'offer-1': feeEvents(reason, 5) } });
    expect(todayItems(base({ requests: [r], deals: deals('OVERCHARGED') }))).toEqual([expect.objectContaining({ kind: 'FEE_OVERCHARGED', offerId: 'offer-1', hours: 5 })]);
    expect(todayItems(base({ requests: [r], deals: deals('AGREED') }))).toEqual([]);
    expect(todayItems(base({ requests: [r], deals: deals('OTHER') }))).toEqual([]);

    const act = (id: string, result: AdminAction['result']): AdminAction => ({ id, at: ago(1), target: 'FEE_OVERCHARGED', requestId: r.id, offerId: 'offer-1', result });
    const contacted = appendAdminAction([], act('c', 'CONTACTED'));
    if (!contacted.ok) throw new Error();
    expect(todayItems(base({ requests: [r], deals: deals('OVERCHARGED'), log: contacted.log }))).toHaveLength(1);
    const done = appendAdminAction(contacted.log, act('d', 'REJECTED'));
    if (!done.ok) throw new Error();
    expect(todayItems(base({ requests: [r], deals: deals('OVERCHARGED'), log: done.log }))).toEqual([]);
  });

  it('광고 내림 기한 지남: 중개사 화면 빨강과 같은 판정 (24시간째부터), 내렸으면 빠짐', () => {
    const r = matched();
    // 다른 곳(offer-1) 가계약을 집주인이 확인 → 광고 올린 offer-2에 "광고를 내려 주세요"
    const won = (hoursAgo: number): DealEvent[] => [
      { id: 'p', at: ago(hoursAgo + 1), kind: 'REPORT', step: 'PROVISIONAL' },
      { id: 'y', at: ago(hoursAgo), kind: 'ANSWER', step: 'PROVISIONAL', ok: true },
    ];
    expect(todayItems(base({ requests: [r], deals: { [r.id]: { 'offer-1': won(23) } } }))).toEqual([]);
    expect(todayItems(base({ requests: [r], deals: { [r.id]: { 'offer-1': won(25) } } }))).toEqual([
      expect.objectContaining({ kind: 'REMOVE_AD_LATE', offerId: 'offer-2', overdue: true, hours: 1 }),
    ]);
    const removed = { [r.id]: { 'offer-1': won(25), 'offer-2': [{ id: 'rm', at: ago(0.5), kind: 'AD_REMOVED' } as DealEvent] } };
    expect(todayItems(base({ requests: [r], deals: removed }))).toEqual([]);
  });

  it('요청 0곳: 받는 중이고 24시간이 지난 의뢰만 (만료·요청 온 의뢰 제외)', () => {
    expect(todayItems(base({ requests: [receiving(NO_OFFER_ALERT_HOURS - 1)] }))).toEqual([]);
    expect(todayItems(base({ requests: [receiving(NO_OFFER_ALERT_HOURS)] }))).toEqual([expect.objectContaining({ kind: 'NO_OFFERS', requestId: 'R-EMPTY', overdue: false })]);
    expect(todayItems(base({ requests: [receiving(49)] }))).toEqual([]);
    expect(todayItems(base({ requests: [{ ...receiving(30), offers: matched().offers }] }))).toEqual([]);
  });

  it('정렬: 빨강 먼저, 그 안에서 오래된 것부터 + 개수', () => {
    const items = todayItems(base({ application: app(50), requests: [receiving(40), receiving(30)].map((r, i) => ({ ...r, id: `E${i}` })) }));
    expect(items.map((i) => i.key)).toEqual(['signup:41360-2024-60048', 'noOffers:E0', 'noOffers:E1']);
    expect(todayCounts(items)).toMatchObject({ total: 3, overdue: 1, byKind: { SIGNUP: 1, NO_OFFERS: 2 } });
  });

  it('화면에 나가는 제목에 동·호수·연락처가 섞이지 않는다', () => {
    const r = { ...matched(), offers: matched().offers.map((o) => (o.id === 'offer-1' ? { ...o, fakeReport: { at: ago(2), status: 'PENDING' as const, decidedAt: null } } : o)) };
    const json = JSON.stringify(todayItems(base({ requests: [r] })));
    expect(json).not.toContain(r.dongHo);
    expect(json).not.toMatch(/01\d-?\d{3,4}-?\d{4}/);
  });
});
