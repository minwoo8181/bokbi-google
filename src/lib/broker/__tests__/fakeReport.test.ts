/**
 * 허위 매물 신고 상황 검증 (대표님 확정 2026-10-26): 누르면 → 그 중개사만 확인 중 → 관리자 → 허위 맞음 / 아님 / 안 누름
 * 예전 구멍 3개(집주인은 모름 · 신고로 광고 기한 피하기 · 관리자가 안 누르면 끝없이 멈춤)를 상황별로 막는지 본다
 */
import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';
import { adState } from '@/lib/requests/stage';
import { cardStrip, dealPhase, isBlocking, nextAction, removeAdHoursLeft, timeline } from '@/lib/deal/deal';
import { EMPTY_WALLET, refillWeekly, spendCredit } from '../credits';
import { sentStatus, type SentRequest } from '../feed';
import { listingStep } from '../listing';
import { EMPTY_MARKET, EMPTY_WORKSPACE, applyMarket, setMatched, type BrokerWorkspace, type MockMarket } from '../mockMarket';
import { decideFakeReport, fileFakeReport, pendingOwnerCheck, reportOverdue, settleFakeRefunds } from '../fakeReport';

const H = 3_600_000;
const t0 = new Date('2026-11-01T00:00:00Z'); // 매칭 확정 시각 (광고 48시간 시작)
const at = (h: number) => new Date(t0.getTime() + h * H);

/** 매칭 3곳: offer-1(A) 광고 전, offer-2(B) 광고 중, offer-3(C) 광고 전 */
function setup(): { base: OwnerRequest; market: MockMarket } {
  const r = demoRequest(t0);
  const offers = r.offers.map((o) => ({ ...o, ad: o.id === 'offer-2' ? { url: 'https://fin.land.naver.com/articles/123456789', postedAt: at(2).toISOString() } : null }));
  const base: OwnerRequest = { ...r, offers, stage: 'IN_PROGRESS', matchedOfferIds: ['offer-1', 'offer-2', 'offer-3'], matchedAt: t0.toISOString(), adWindowStartedAt: t0.toISOString() };
  const market = setMatched({ ...EMPTY_MARKET, offers: { [r.id]: offers } }, r.id, base.matchedOfferIds, t0);
  return { base, market };
}
const view = (base: OwnerRequest, m: MockMarket) => applyMarket(base, m);
const offer = (r: OwnerRequest, id: string) => r.offers.find((o) => o.id === id)!;
const ctx = (r: OwnerRequest, offerId: string) => ({ request: r, deals: {}, offerId });

function file(m: MockMarket, base: OwnerRequest, h: number) {
  const res = fileFakeReport(m, base.id, 'offer-1', at(h));
  if (!res.ok) throw new Error(res.error);
  return res.market;
}
function decide(m: MockMarket, base: OwnerRequest, verdict: 'CONFIRMED' | 'REJECTED', h: number) {
  const res = decideFakeReport(m, base.id, 'offer-1', verdict, at(h));
  if (!res.ok) throw new Error(res.error);
  return res.market;
}
/** 이 브라우저 중개사가 그 의뢰에 크레딧 1개를 써서 요청을 보낸 작업 공간 */
function ws(requestId: string, offerId: string): BrokerWorkspace {
  const spent = spendCredit(refillWeekly(EMPTY_WALLET, at(-30)), requestId, at(-30));
  if (!spent.ok) throw new Error('spend');
  const s: SentRequest = { requestId, offerId, sentAt: at(-30).toISOString(), strengths: [], snapshot: { complexName: '', tradeType: '매매', pyeongLabel: '', maskedDongHo: '', commissionWon: 0 } };
  return { ...EMPTY_WORKSPACE, wallet: spent.wallet, sent: [s] };
}

describe('① 중개사가 누름', () => {
  it('신고는 요청 카드 하나에 한 번만, 광고를 올린 뒤나 없는 카드는 안 됨', () => {
    const { base, market } = setup();
    const m = file(market, base, 18);
    expect(offer(view(base, m), 'offer-1').fakeReport).toEqual({ at: at(18).toISOString(), status: 'PENDING', decidedAt: null });
    expect(fileFakeReport(m, base.id, 'offer-1', at(19))).toEqual({ ok: false, error: 'ALREADY_REPORTED' });
    expect(fileFakeReport(m, base.id, 'offer-2', at(19))).toEqual({ ok: false, error: 'AD_POSTED' });
    expect(fileFakeReport(m, base.id, 'nope', at(19))).toEqual({ ok: false, error: 'NO_OFFER' });
  });

  it('신고한 중개사: 거래는 "확인 중"(소유자 확인 할 일 없음), 신고만으로 크레딧은 그대로', () => {
    const { base, market } = setup();
    const v = view(base, file(market, base, 18));
    expect(listingStep(ws(base.id, 'offer-1').sent[0], offer(v, 'offer-1'))).toBe('REPORTED');
    expect(cardStrip(ctx(v, 'offer-1'), 'BROKER', at(20))).toMatchObject({ tone: 'CAUTION', key: 'OWNER_CHECKING' });
    const w = ws(base.id, 'offer-1');
    expect(settleFakeRefunds(w, file(market, base, 18), at(20))).toBe(w);
  });
});

describe('② 집주인도 알고, 광고 시간은 멈춘다 (예전 구멍: 집주인은 모르고 해제할 수 있었음)', () => {
  it('집주인 화면: 맨 위 안내 대상 = 신고된 곳, A 카드는 확인 중(해제 버튼 없는 상태)', () => {
    const { base, market } = setup();
    const v = view(base, file(market, base, 18));
    expect(pendingOwnerCheck(v)?.id).toBe('offer-1');
    expect(pendingOwnerCheck(view(base, market))).toBeNull();
    // 48시간이 한참 지나도 기한 지남(해제 가능)이 아니라 확인 중
    expect(adState(offer(v, 'offer-1'), v, at(60).getTime())).toEqual({ kind: 'CHECKING' });
    expect(cardStrip(ctx(v, 'offer-1'), 'OWNER', at(60))).toMatchObject({ key: 'OWNER_CHECKING' });
    expect(timeline(ctx(v, 'offer-1')).map((i) => i.kind)).toContain('OWNER_CHECK_ASKED');
  });

  it('다른 중개사(C)와 집주인 의뢰는 그대로: C는 평소처럼 기한이 가고, 의뢰는 진행 중', () => {
    const { base, market } = setup();
    const v = view(base, file(market, base, 18));
    expect(v.stage).toBe('IN_PROGRESS');
    expect(adState(offer(v, 'offer-3'), v, at(49).getTime())).toEqual({ kind: 'OVERDUE' });
    expect(dealPhase(ctx(v, 'offer-2'))).toBe('MATCHED');
  });
});

describe('③ 거짓으로 누름 (예전 구멍: 신고하면 광고 기한 잠금이 사라졌음)', () => {
  it('확인 중엔 잠금 대상이 아니지만, 반려되면 남은 30시간이 그대로 이어지고 지나면 다시 잠금', () => {
    const { base, market } = setup();
    // 18시간째 신고(30시간 남음) → 60시간째 반려
    const v = view(base, decide(file(market, base, 18), base, 'REJECTED', 60));
    expect(adState(offer(v, 'offer-1'), v, at(60).getTime())).toEqual({ kind: 'PENDING', hoursLeft: 30 });
    expect(adState(offer(v, 'offer-1'), v, at(89).getTime())).toEqual({ kind: 'PENDING', hoursLeft: 1 });
    expect(adState(offer(v, 'offer-1'), v, at(90).getTime())).toEqual({ kind: 'OVERDUE' });
    expect(isBlocking(cardStrip(ctx(v, 'offer-1'), 'BROKER', at(91)))).toBe(true);
  });

  it('반려: 크레딧은 돌려주지 않고, 소유자 확인부터 다시, 다시 신고할 수 없음', () => {
    const { base, market } = setup();
    const m = decide(file(market, base, 18), base, 'REJECTED', 20);
    const v = view(base, m);
    const w = ws(base.id, 'offer-1');
    expect(settleFakeRefunds(w, m, at(21))).toBe(w);
    expect(listingStep(w.sent[0], offer(v, 'offer-1'))).toBe('OWNER_CHECK');
    expect(nextAction(ctx(v, 'offer-1'), 'BROKER', at(21)).kind).toBe('OWNER_CHECK');
    expect(pendingOwnerCheck(v)).toBeNull();
    expect(timeline(ctx(v, 'offer-1')).map((i) => i.kind)).toEqual(expect.arrayContaining(['OWNER_CHECK_ASKED', 'OWNER_CHECK_OK']));
    expect(fileFakeReport(m, base.id, 'offer-1', at(22))).toEqual({ ok: false, error: 'ALREADY_REPORTED' });
  });
});

describe('④ 관리자가 안 누름', () => {
  it('자동으로 정하지 않음: 열흘 뒤에도 확인 중, 관리자 화면 기한은 24시간부터 빨강', () => {
    const { base, market } = setup();
    const m = file(market, base, 18);
    const v = view(base, m);
    expect(adState(offer(v, 'offer-1'), v, at(18 + 240).getTime())).toEqual({ kind: 'CHECKING' });
    const report = offer(v, 'offer-1').fakeReport!;
    expect(reportOverdue(report, at(18 + 23.9))).toBe(false);
    expect(reportOverdue(report, at(18 + 24))).toBe(true);
    expect(isBlocking(cardStrip(ctx(v, 'offer-1'), 'BROKER', at(18 + 240)))).toBe(false);
  });
});

describe('⑤ 허위 맞음', () => {
  it('의뢰 전체 종료, 광고 올린 B는 "광고를 내려 주세요"(24시간), 광고 없는 A·C는 종료', () => {
    const { base, market } = setup();
    const v = view(base, decide(file(market, base, 18), base, 'CONFIRMED', 20));
    expect(v).toMatchObject({ stage: 'ENDED', endedReason: 'FAKE_CONFIRMED', endedAt: at(20).toISOString() });
    expect(pendingOwnerCheck(v)).toBeNull();
    expect(nextAction(ctx(v, 'offer-2'), 'BROKER', at(21)).kind).toBe('REMOVE_AD');
    expect(removeAdHoursLeft(ctx(v, 'offer-2'), at(21))).toBe(23);
    expect(nextAction(ctx(v, 'offer-3'), 'BROKER', at(21))).toEqual({ kind: 'CLOSED', vars: { fake: 1 } });
    expect(timeline(ctx(v, 'offer-3')).map((i) => i.kind)).toContain('FAKE_CONFIRMED');
    expect(sentStatus(ws(base.id, 'offer-1').sent[0], v, at(21).getTime())).toBe('STOPPED');
    expect(sentStatus(ws(base.id, 'offer-3').sent[0], v, at(21).getTime())).toBe('SELECTED');
  });

  it('매칭된 곳은 신고한 곳이든 아니든 크레딧 1개씩 한 번만, 매칭 안 된 곳은 없음', () => {
    const { base, market } = setup();
    const m = decide(file(market, base, 18), base, 'CONFIRMED', 20);
    for (const id of ['offer-1', 'offer-2', 'offer-3']) {
      const w = ws(base.id, id);
      const once = settleFakeRefunds(w, m, at(21));
      expect(once.wallet.balance).toBe(w.wallet.balance + 1);
      expect(settleFakeRefunds(once, m, at(22))).toBe(once);
    }
    const outsider = ws(base.id, 'offer-x');
    expect(settleFakeRefunds(outsider, m, at(21))).toBe(outsider);
  });
});

describe('판정 규칙', () => {
  it('한 번만, 신고 없으면 안 됨', () => {
    const { base, market } = setup();
    const m = decide(file(market, base, 18), base, 'REJECTED', 20);
    expect(decideFakeReport(m, base.id, 'offer-1', 'CONFIRMED', at(21))).toEqual({ ok: false, error: 'ALREADY_DECIDED' });
    expect(decideFakeReport(market, base.id, 'offer-1', 'CONFIRMED', at(21))).toEqual({ ok: false, error: 'NO_REPORT' });
  });
});
