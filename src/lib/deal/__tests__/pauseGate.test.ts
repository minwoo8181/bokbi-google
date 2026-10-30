import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';
import type { VisitBooking } from '@/lib/requests/showing';
import { adState } from '@/lib/requests/stage';
import { applyMarket, clearOfferAd, EMPTY_MARKET, parseMarket, setPaused, setResumed } from '@/lib/broker/mockMarket';
import { sendBlock } from '@/lib/broker/feed';
import { EMPTY_WALLET } from '@/lib/broker/credits';
import {
  adRemoval,
  adUp,
  BLOCKING_STRIPS,
  cardStrip,
  dealState,
  endByOwner,
  isBlocking,
  nextAction,
  pauseAdRemoval,
  pauseByOwner,
  pauseCancelVisitIds,
  REMOVE_AD_HOURS,
  removeAdHoursLeft,
  resumeByOwner,
  timeline,
  type DealContext,
  type DealEvent,
  type DealEventBody,
  type RequestDeals,
} from '../deal';

// 2026-11-01 12:00 KST
const now = new Date('2026-11-01T03:00:00Z');
const H = 3_600_000;
const iso = (h: number) => new Date(now.getTime() + h * H).toISOString();
const at = (h: number) => new Date(now.getTime() + h * H);
let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `p${seq++}`, at: iso(h), ...body }) as DealEvent;
const visit = (id: string, offerId: string, date: string): VisitBooking => ({ id, offerId, date, hour: 14, createdAt: iso(-5) });

/** 매칭 3곳 (10시간 전), offer-1·2 광고 중(8시간 전), 방문: offer-1 내일 · offer-3 어제. 셋 다 소유자 확인 */
function base(): OwnerRequest {
  const r = demoRequest(now);
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: ['offer-1', 'offer-2', 'offer-3'],
    matchedAt: iso(-10),
    adWindowStartedAt: iso(-10),
    offers: r.offers.map((o) => ({ ...o, ad: o.id !== 'offer-3' ? { url: `https://fin.land.naver.com/articles/9${o.id.slice(-1)}`, postedAt: iso(-8) } : null })),
    visits: [visit('v1', 'offer-1', '2026-11-02'), visit('v3', 'offer-3', '2026-10-31')],
  };
}
const checked = (h = -9): DealEvent[] => [ev(h, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' })];
const ctx = (request: OwnerRequest, deals: RequestDeals, offerId: string): DealContext => ({ request, deals, offerId });
/** 중개사가 광고 내렸어요: 링크를 비우고 내린 광고를 이벤트에 (AgentWorkspace와 같은 동작) */
const removed = (r: OwnerRequest, offerId: string, h: number) => {
  const o = r.offers.find((x) => x.id === offerId)!;
  return { request: { ...r, offers: r.offers.map((x) => (x.id === offerId ? { ...x, ad: null } : x)) }, event: ev(h, { kind: 'AD_REMOVED', ...(o.ad ? { ad: o.ad } : {}) }) };
};

describe('잠시 멈추기', () => {
  it('멈춤 + 앞으로 잡힌 방문만 자동 취소(PAUSED), 지난 방문·광고 링크는 그대로', () => {
    expect(pauseCancelVisitIds(base(), now)).toEqual(['v1']);
    const r = pauseByOwner(base(), '이사 일정이 바뀌었어요', now);
    expect(r.paused).toEqual({ pausedAt: now.toISOString(), reason: '이사 일정이 바뀌었어요' });
    expect(r.visits.find((v) => v.id === 'v1')).toMatchObject({ canceledBy: 'SYSTEM', cancelReason: 'PAUSED' });
    expect(r.visits.find((v) => v.id === 'v3')?.canceledAt).toBeUndefined();
    expect(r.offers.filter((o) => o.ad).length).toBe(2);
  });

  it('중개사: 광고가 올라가 있으면 "광고를 내려 주세요"(멈춤), 내리면 POST_AD 멈춤 안내', () => {
    const r = pauseByOwner(base(), '기타', now);
    const d = { 'offer-1': checked() };
    expect(nextAction(ctx(r, d, 'offer-1'), 'BROKER', at(1))).toEqual({ kind: 'REMOVE_AD', vars: { paused: 1, h: 23 } });
    expect(cardStrip(ctx(r, d, 'offer-1'), 'BROKER', at(1))).toEqual({ tone: 'ACTION', key: 'REMOVE_AD_PAUSED', vars: { h: 23 } });
    const x = removed(r, 'offer-1', 2);
    const d2 = { 'offer-1': [...checked(), x.event] };
    expect(nextAction(ctx(x.request, d2, 'offer-1'), 'BROKER', at(3))).toMatchObject({ kind: 'POST_AD', vars: { state: 'PAUSED' } });
    expect(cardStrip(ctx(x.request, d2, 'offer-1'), 'BROKER', at(3))).toMatchObject({ tone: 'CAUTION', key: 'PAUSED' });
  });

  it(`광고 내림 남은 시간: 처음 ${REMOVE_AD_HOURS}시간 → 1시간 → ${REMOVE_AD_HOURS}시간이 되는 순간 빨강 + 잠금 (내릴 때까지)`, () => {
    const r = pauseByOwner(base(), '기타', now);
    const d = { 'offer-1': checked() };
    expect(removeAdHoursLeft(ctx(r, d, 'offer-1'), now)).toBe(REMOVE_AD_HOURS);
    expect(removeAdHoursLeft(ctx(r, d, 'offer-1'), at(REMOVE_AD_HOURS - 0.5))).toBe(1);
    expect(cardStrip(ctx(r, d, 'offer-1'), 'BROKER', at(REMOVE_AD_HOURS - 0.5)).key).toBe('REMOVE_AD_PAUSED');
    const late = cardStrip(ctx(r, d, 'offer-1'), 'BROKER', at(REMOVE_AD_HOURS));
    expect(late).toMatchObject({ tone: 'RISK', key: 'REMOVE_AD_LATE' });
    expect(isBlocking(late)).toBe(true);
    expect(nextAction(ctx(r, d, 'offer-1'), 'BROKER', at(30))).toEqual({ kind: 'REMOVE_AD', vars: { paused: 1, h: 0 } });
    // 내리면 남은 시간 없음 → 잠금 풀림
    const x = removed(r, 'offer-1', 30);
    expect(removeAdHoursLeft(ctx(x.request, { 'offer-1': [...checked(), x.event] }, 'offer-1'), at(31))).toBeNull();
    expect(isBlocking(cardStrip(ctx(x.request, { 'offer-1': [...checked(), x.event] }, 'offer-1'), 'BROKER', at(31)))).toBe(false);
  });

  it('집주인: 멈춘 동안 광고 내림 확인 n/m (멈추기 전 광고가 있던 곳만)', () => {
    const r = pauseByOwner(base(), '기타', now);
    expect(pauseAdRemoval(r, {})).toEqual({ done: 0, total: 2 });
    const x = removed(r, 'offer-2', 1);
    expect(pauseAdRemoval(x.request, { 'offer-2': [x.event] })).toEqual({ done: 1, total: 2 });
    expect(pauseAdRemoval(base(), {})).toBeNull();
  });

  it('기록: 내린 광고도 "광고 올렸어요" 줄이 남고 "광고 내렸어요"가 이어짐', () => {
    const x = removed(pauseByOwner(base(), '기타', now), 'offer-1', 1);
    const kinds = timeline(ctx(x.request, { 'offer-1': [...checked(), x.event] }, 'offer-1')).map((i) => i.kind);
    expect(kinds).toEqual(['MATCHED', 'OWNER_CHECKED', 'AD_POSTED', 'VISIT', 'OWNER_PAUSED', 'AD_REMOVED']);
    // 다시 시작하면 멈춤 줄 대신 "다시 시작했어요", 중개사에겐 새 소식
    const resumed = resumeByOwner(x.request, at(30));
    const items = timeline(ctx(resumed, { 'offer-1': [...checked(), x.event] }, 'offer-1'));
    expect(items.at(-1)).toEqual({ at: iso(30), kind: 'OWNER_RESUMED' });
    expect(items.some((i) => i.kind === 'OWNER_PAUSED')).toBe(false);
  });
});

describe('다시 시작', () => {
  it('광고를 내린 곳: 48시간 기한이 다시 시작한 시각부터, 안 내린 곳은 그대로 광고 중', () => {
    const paused = pauseByOwner(base(), '기타', now);
    const x = removed(paused, 'offer-1', 1);
    const r = resumeByOwner(x.request, at(30));
    const d = { 'offer-1': [...checked(), x.event], 'offer-2': checked() };
    expect(nextAction(ctx(r, d, 'offer-1'), 'BROKER', at(31))).toEqual({ kind: 'POST_AD', vars: { h: 47 } });
    expect(cardStrip(ctx(r, d, 'offer-2'), 'BROKER', at(31))).toMatchObject({ tone: 'GOOD', key: 'AD_LIVE' });
    // 48시간 넘기면 광고 기한 지남 → 잠금 대상
    expect(isBlocking(cardStrip(ctx(r, d, 'offer-1'), 'BROKER', at(30 + 49)))).toBe(true);
  });

  it('다시 올리면 살아 있는 광고 (내린 뒤 새로 올린 링크)', () => {
    const x = removed(pauseByOwner(base(), '기타', now), 'offer-1', 1);
    const r = resumeByOwner(x.request, at(30));
    const reposted = { ...r, offers: r.offers.map((o) => (o.id === 'offer-1' ? { ...o, ad: { url: 'https://fin.land.naver.com/articles/77', postedAt: iso(32) } } : o)) };
    const s = dealState([...checked(), x.event]);
    expect(adUp(reposted.offers.find((o) => o.id === 'offer-1'), s)).toBe(true);
    // 그 뒤 다른 곳에서 팔면 다시 "광고를 내려 주세요"
    const sold = endByOwner(reposted, 'SOLD_ELSEWHERE', at(40));
    expect(nextAction(ctx(sold, { 'offer-1': [...checked(), x.event] }, 'offer-1'), 'BROKER', at(41)).kind).toBe('REMOVE_AD');
    expect(adRemoval(sold, { 'offer-1': [...checked(), x.event] })).toEqual({ done: 0, total: 2 });
  });
});

describe('새 의뢰 요청 보내기 잠금 (기한 지난 할 일만)', () => {
  const feedReq = (): OwnerRequest => ({ ...demoRequest(now), id: 'feed-1', stage: 'RECEIVING', createdAt: iso(-1) });
  const wallet = { ...EMPTY_WALLET, balance: 3 };
  it('기한 지난 일이 있으면 TODO_FIRST, 없으면 보낼 수 있음', () => {
    expect(sendBlock({ request: feedReq(), sent: [], wallet, now, blocking: 1 })).toBe('TODO_FIRST');
    expect(sendBlock({ request: feedReq(), sent: [], wallet, now, blocking: 0 })).toBeNull();
  });
  it('이미 보낸 의뢰·끝난 의뢰는 그 이유가 먼저 (잠금 안내보다)', () => {
    const sent = [{ requestId: 'feed-1', offerId: 'x', sentAt: iso(-1), strengths: [] }] as never;
    expect(sendBlock({ request: feedReq(), sent, wallet, now, blocking: 2 })).toBe('ALREADY_SENT');
  });
  it('잠그는 띠는 빨강 중 기한 지남 3종뿐 (광고 기한 임박·파랑 할 일은 안 잠금)', () => {
    expect(BLOCKING_STRIPS).toEqual(['AD_OVERDUE', 'REMOVE_AD_LATE', 'DATE_PASSED']);
    expect(isBlocking({ tone: 'RISK', key: 'AD_LEFT', vars: { h: 3 } })).toBe(false);
    expect(isBlocking({ tone: 'ACTION', key: 'REMOVE_AD', vars: {} })).toBe(false);
  });
  it('다른 곳과 진행 뒤 24시간 넘게 광고를 안 내리면 잠금', () => {
    const r = endByOwner(base(), 'SOLD_ELSEWHERE', now);
    expect(isBlocking(cardStrip(ctx(r, {}, 'offer-1'), 'BROKER', at(25)))).toBe(true);
    expect(isBlocking(cardStrip(ctx(r, {}, 'offer-1'), 'BROKER', at(23)))).toBe(false);
  });
});

describe('공유 저장소: 멈춤·다시 시작이 중개사 화면으로', () => {
  it('setPaused → paused, setResumed → paused 없음 + 광고 기한 시작', () => {
    const p = applyMarket(base(), setPaused(EMPTY_MARKET, base().id, '기타', now));
    expect(p.paused).toEqual({ pausedAt: now.toISOString(), reason: '기타' });
    expect(adState(p.offers[0], p, at(1).getTime())).toEqual({ kind: 'PAUSED' });
    const q = applyMarket(base(), setResumed(EMPTY_MARKET, base().id, at(30)));
    expect(q.paused).toBeNull();
    expect(q.adWindowStartedAt).toBe(iso(30));
  });
  it('clearOfferAd: 링크를 비우고 내린 광고를 돌려줌, 없으면 그대로', () => {
    const m = { ...EMPTY_MARKET, offers: { [base().id]: base().offers } };
    const { market, ad } = clearOfferAd(m, base().id, 'offer-1');
    expect(ad?.postedAt).toBe(iso(-8));
    expect(market.offers[base().id].find((o) => o.id === 'offer-1')?.ad).toBeNull();
    expect(clearOfferAd(m, base().id, 'offer-3').ad).toBeNull();
  });
  it('저장 형식: 시각이 하나도 없는 멈춤 기록과 형식이 틀린 내린 광고는 버림', () => {
    const raw = JSON.stringify({
      offers: {},
      matched: {},
      pause: { a: { pausedAt: iso(0), reason: 'x', resumedAt: null }, b: { pausedAt: null, resumedAt: null } },
      deals: { r: { o: [{ id: '1', at: iso(0), kind: 'AD_REMOVED', ad: { url: 1 } }, { id: '2', at: iso(0), kind: 'AD_REMOVED' }] } },
    });
    const m = parseMarket(raw);
    expect(Object.keys(m.pause ?? {})).toEqual(['a']);
    expect(m.deals?.r.o.map((e) => e.id)).toEqual(['2']);
  });
});
