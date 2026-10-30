import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { BrokerApplication } from '../application';
import { EMPTY_WALLET, refillWeekly, spendCredit } from '../credits';
import { buildOffer, sentStatus, type SentRequest } from '../feed';
import { adUrgency, confirmOwner, listingStep, myOffer, postAd } from '../listing';
import { cardStrip } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import {
  EMPTY_MARKET,
  EMPTY_WORKSPACE,
  addOffer,
  applyMarket,
  dealsOf,
  parseMarket,
  setDelayNote,
  setMatched,
  setReleased,
  setShowing,
  setVisits,
  type BrokerWorkspace,
  type MockMarket,
} from '../mockMarket';

const now = new Date('2026-10-27T03:00:00Z');
const HOUR = 3_600_000;
const app: BrokerApplication = {
  regNo: '41360-2024-60048',
  office: '예시공인중개사사무소',
  code: '1234',
  strengths: [],
  phone: '010-0000-0000',
  submittedAt: now.toISOString(),
  status: 'APPROVED',
  reviewedAt: now.toISOString(),
  rejectReason: null,
  openYear: 2024,
};

/** 요청 보냄 → 집주인이 matchedHoursAgo 전에 이 사무소를 고름 */
function setup(matchedHoursAgo = 2) {
  const base = demoRequest(now);
  const offer = buildOffer(app, { requestId: base.id, existing: base.offers, strengths: [], now });
  const market = setMatched(addOffer(EMPTY_MARKET, base.id, offer), base.id, [offer.id], new Date(now.getTime() - matchedHoursAgo * HOUR));
  const spent = spendCredit(refillWeekly(EMPTY_WALLET, now), base.id, now);
  if (!spent.ok) throw new Error('spend');
  const s: SentRequest = {
    requestId: base.id,
    offerId: offer.id,
    sentAt: now.toISOString(),
    strengths: [],
    snapshot: { complexName: base.complexName, tradeType: base.tradeType, pyeongLabel: base.pyeongLabel, maskedDongHo: base.maskedDongHo, commissionWon: base.commissionWon },
  };
  const ws: BrokerWorkspace = { ...EMPTY_WORKSPACE, wallet: spent.wallet, sent: [s] };
  return { base, market, ws, s };
}

describe('매물 관리 단계', () => {
  it('소유자 확인 → 광고 → 광고 중, 소유자 확인 전에는 광고 링크를 저장하지 않는다', () => {
    const { base, market, ws, s } = setup();
    expect(listingStep(s, myOffer(applyMarket(base, market), s))).toBe('OWNER_CHECK');
    expect(postAd(market, s, 'https://fin.land.naver.com/articles/2657553153', now)).toEqual({ ok: false, error: 'OWNER_CHECK_FIRST' });

    const checked = confirmOwner(ws, base.id, 'CALL_CONFIRMED').sent[0];
    expect(checked.ownerCheck).toBe('CALL_CONFIRMED');
    expect(listingStep(checked, myOffer(applyMarket(base, market), checked))).toBe('AD');

    const posted = postAd(market, checked, 'https://fin.land.naver.com/articles/2657553153', now);
    if (!posted.ok) throw new Error('post');
    const merged = applyMarket(base, posted.market);
    expect(listingStep(checked, myOffer(merged, checked))).toBe('AD_LIVE');
  });

  it('광고 링크는 집주인 화면에 이미 붙은 카드에도 반영된다', () => {
    const { base, market, ws } = setup();
    const ownerView = applyMarket(base, market); // 집주인 화면이 먼저 카드를 붙여 둔 상태
    const s = confirmOwner(ws, base.id, 'CONFIRMED').sent[0];
    const posted = postAd(market, s, 'https://fin.land.naver.com/articles/2657553153', now);
    if (!posted.ok) throw new Error('post');
    const again = applyMarket(ownerView, posted.market);
    expect(again.offers.filter((o) => o.id === s.offerId)).toHaveLength(1);
    expect(myOffer(again, s)?.ad?.url).toContain('2657553153');
  });
});

/** 내 매물 카드 색 띠 (예전 "지금 할 일" 목록을 대신함) */
const stripOf = (r: OwnerRequest, s: SentRequest, m: MockMarket) =>
  cardStrip({ request: applyMarket(r, m), deals: dealsOf(m, r.id), offerId: s.offerId }, 'BROKER', now, { ownerChecked: !!s.ownerCheck });

describe('색 띠 (지금 할 일 대체)', () => {
  it('광고 기한: 1시간 남으면 빨강, 지나면 빨강', () => {
    const a = setup(47);
    expect(stripOf(a.base, a.s, a.market)).toMatchObject({ tone: 'RISK', key: 'AD_LEFT', vars: { h: 1 } });
    const b = setup(50);
    expect(stripOf(b.base, b.s, b.market)).toMatchObject({ tone: 'RISK', key: 'AD_OVERDUE' });
  });

  it('광고를 올리면 기한 띠가 빠진다', () => {
    const { base, market, ws } = setup();
    const s = confirmOwner(ws, base.id, 'CONFIRMED').sent[0];
    const posted = postAd(market, s, 'https://fin.land.naver.com/articles/2657553153', now);
    if (!posted.ok) throw new Error('post');
    expect(stripOf(base, s, posted.market)).toMatchObject({ tone: 'GOOD', key: 'AD_LIVE' });
  });
});

describe('해제 전 대응', () => {
  it('알림 단계: 24시간 이하 SOON, 6시간 이하 URGENT, 지나면 OVERDUE', () => {
    expect(adUrgency({ kind: 'PENDING', hoursLeft: 30 })).toBe('NORMAL');
    expect(adUrgency({ kind: 'PENDING', hoursLeft: 24 })).toBe('SOON');
    expect(adUrgency({ kind: 'PENDING', hoursLeft: 6 })).toBe('URGENT');
    expect(adUrgency({ kind: 'OVERDUE' })).toBe('OVERDUE');
    expect(adUrgency({ kind: 'LIVE', day: 2 })).toBe('NORMAL');
    expect(adUrgency({ kind: 'PAUSED' })).toBe('NORMAL');
  });

  it('늦어진 이유는 내 요청 카드에만 붙고 집주인 화면 카드에 보인다', () => {
    const { base, market, s } = setup(50);
    const m = setDelayNote(market, base.id, s.offerId, 'PHOTO', now);
    expect(myOffer(applyMarket(base, m), s)?.delayNote?.reason).toBe('PHOTO');
    expect(setDelayNote(market, base.id, 'other-offer', 'PHOTO', now)).toBe(market);
  });

  it('집주인이 해제하면 중개사 쪽은 "매칭이 해제됐어요", 남은 곳이 없으면 의뢰 종료, 크레딧은 그대로', () => {
    const { base, market, ws, s } = setup(50);
    const m = setReleased(market, base.id, s.offerId);
    const merged = applyMarket(base, m);
    expect(sentStatus(s, merged, now.getTime())).toBe('RELEASED');
    expect(merged.stage).toBe('ENDED');
    expect(merged.endedReason).toBe('RELEASED');
    expect(stripOf(base, s, m)).toMatchObject({ tone: 'DONE', key: 'RELEASED' });
    expect(ws.wallet.balance).toBe(2);
    expect(setReleased(m, base.id, s.offerId)).toBe(m);
  });
});

describe('방문 일정 공유 (⑤)', () => {
  it('저장소의 방문 시간·일정이 양쪽 화면 기준이 된다', () => {
    const { base, market, s } = setup();
    const showing = { ...base.showing, blocked: [{ start: '2026-10-30', end: '2026-10-30' }] };
    const visits = [{ id: 'v1', offerId: s.offerId, date: '2026-10-28', hour: 19 }];
    const merged = applyMarket(base, setVisits(setShowing(market, base.id, showing), base.id, visits));
    expect(merged.showing.blocked).toEqual(showing.blocked);
    expect(merged.visits).toEqual(visits);
    expect(applyMarket(base, market).visits).toBe(base.visits); // 저장소에 없으면 원래 값
  });

  it('깨진 방문 기록은 읽을 때 버린다', () => {
    const m = parseMarket(JSON.stringify({ visits: { a: [{ id: 'v', offerId: 'o', date: '2026-10-28', hour: 19 }, { id: 3 }], b: 'x' }, showing: { a: { weekly: {}, blocked: [] }, b: 1 } }));
    expect(m.visits).toEqual({ a: [{ id: 'v', offerId: 'o', date: '2026-10-28', hour: 19 }] });
    expect(Object.keys(m.showing ?? {})).toEqual(['a']);
  });

  it('색 띠: 24시간 안의 내 방문만 노랑 (남의 방문·취소된 방문 제외)', () => {
    const { base, market, ws, s } = setup();
    const checked = confirmOwner(ws, base.id, 'CONFIRMED').sent[0];
    const posted = postAd(market, checked, 'https://fin.land.naver.com/articles/2657553153', now);
    if (!posted.ok) throw new Error('post');
    // now = 2026-10-27 12시(한국). 같은 날 19시(7시간 뒤), 다음 날 19시(31시간 뒤), 남의 방문, 취소된 방문
    const visits = [
      { id: 'soon', offerId: s.offerId, date: '2026-10-27', hour: 19 },
      { id: 'far', offerId: s.offerId, date: '2026-10-28', hour: 19 },
      { id: 'other', offerId: 'someone', date: '2026-10-27', hour: 20 },
      { id: 'gone', offerId: s.offerId, date: '2026-10-27', hour: 20, canceledAt: now.toISOString() },
    ];
    expect(stripOf(base, checked, setVisits(posted.market, base.id, visits))).toMatchObject({
      tone: 'CAUTION',
      key: 'VISIT_SOON',
      vars: { date: '2026-10-27', hour: 19, h: 7 },
    });
    expect(stripOf(base, checked, setVisits(posted.market, base.id, visits.slice(1)))).toMatchObject({ tone: 'GOOD' });
  });
});

// 허위 매물 신고 상황 전체는 fakeReport.test.ts
