import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';
import type { VisitBooking } from '@/lib/requests/showing';
import { applyMarket, EMPTY_MARKET, parseMarket, setEnded } from '@/lib/broker/mockMarket';
import { sentStatus } from '@/lib/broker/feed';
import {
  adRemoval,
  cardStrip,
  dealPhase,
  endByOwner,
  newsSince,
  nextAction,
  ownerEnded,
  timeline,
  type DealContext,
  type DealEvent,
  type DealEventBody,
  type OwnerEndReason,
  type RequestDeals,
} from '../deal';

// 2026-11-01 12:00 KST
const now = new Date('2026-11-01T03:00:00Z');
const H = 3_600_000;
const iso = (h: number) => new Date(now.getTime() + h * H).toISOString();
let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `x${seq++}`, at: iso(h), ...body }) as DealEvent;

const visit = (id: string, offerId: string, date: string): VisitBooking => ({ id, offerId, date, hour: 14, createdAt: iso(-5) });

/** 매칭 3곳, offer-1·2 광고 중, 방문: offer-1 내일 · offer-2 어제 · offer-3 모레 */
function base(): OwnerRequest {
  const r = demoRequest(now);
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: ['offer-1', 'offer-2', 'offer-3'],
    matchedAt: iso(-10),
    adWindowStartedAt: iso(-10),
    offers: r.offers.map((o) => ({ ...o, ad: o.id !== 'offer-3' ? { url: `https://fin.land.naver.com/articles/1${o.id.slice(-1)}`, postedAt: iso(-8) } : null })),
    visits: [visit('v1', 'offer-1', '2026-11-02'), visit('v2', 'offer-2', '2026-10-31'), visit('v3', 'offer-3', '2026-11-03')],
  };
}
const ctx = (request: OwnerRequest, deals: RequestDeals, offerId: string): DealContext => ({ request, deals, offerId });
const REASONS: OwnerEndReason[] = ['SOLD_ELSEWHERE', 'WITHDRAWN'];

describe('endByOwner (다른 곳에서 팔았어요 · 거둬들이기)', () => {
  for (const reason of REASONS) {
    it(`${reason}: 종료 + 끝낸 시각, 광고 링크는 그대로`, () => {
      const r = endByOwner(base(), reason, now);
      expect(r).toMatchObject({ stage: 'ENDED', endedReason: reason, endedAt: now.toISOString() });
      expect(r.offers.filter((o) => o.ad).map((o) => o.id)).toEqual(['offer-1', 'offer-2']);
      expect(ownerEnded(r)).toEqual({ reason, at: now.toISOString() });
    });
  }

  it('앞으로 잡힌 방문만 자동 취소 (지난 방문은 그대로), 이유는 끝낸 방식대로', () => {
    const sold = endByOwner(base(), 'SOLD_ELSEWHERE', now).visits;
    expect(sold.find((v) => v.id === 'v1')).toMatchObject({ canceledBy: 'SYSTEM', cancelReason: 'ELSEWHERE' });
    expect(sold.find((v) => v.id === 'v3')).toMatchObject({ canceledBy: 'SYSTEM', cancelReason: 'ELSEWHERE' });
    expect(sold.find((v) => v.id === 'v2')?.canceledAt).toBeUndefined();
    const withdrawn = endByOwner(base(), 'WITHDRAWN', now).visits;
    expect(withdrawn.find((v) => v.id === 'v1')?.cancelReason).toBe('WITHDRAWN');
  });

  it('만료·취소·해제로 끝난 의뢰나 시각이 없으면 ownerEnded는 null', () => {
    expect(ownerEnded({ ...base(), stage: 'ENDED', endedReason: 'EXPIRED', endedAt: iso(0) })).toBeNull();
    expect(ownerEnded({ ...base(), stage: 'ENDED', endedReason: 'SOLD_ELSEWHERE', endedAt: null })).toBeNull();
    expect(ownerEnded(base())).toBeNull();
  });
});

describe('중개사 화면: 집주인이 끝낸 의뢰는 "다른 곳과 진행"과 같은 정리', () => {
  for (const reason of REASONS) {
    it(`${reason}: 광고 올린 곳은 "광고를 내려 주세요", 안 올린 곳은 종료`, () => {
      const r = endByOwner(base(), reason, now);
      expect(dealPhase(ctx(r, {}, 'offer-1'))).toBe('CLOSED_ELSEWHERE');
      expect(nextAction(ctx(r, {}, 'offer-1'), 'BROKER', now).kind).toBe('REMOVE_AD');
      expect(nextAction(ctx(r, {}, 'offer-3'), 'BROKER', now).kind).toBe('CLOSED');
      expect(cardStrip(ctx(r, {}, 'offer-1'), 'BROKER', now)).toMatchObject({ tone: 'ACTION', key: 'REMOVE_AD' });
      // 광고 내렸어요 → 종료
      const deals = { 'offer-1': [ev(1, { kind: 'AD_REMOVED' })] };
      expect(nextAction(ctx(r, deals, 'offer-1'), 'BROKER', now).kind).toBe('CLOSED');
    });
  }

  it('가계약 중이던 곳도 정리, 계약까지 간 곳은 자기 단계 그대로', () => {
    const r = endByOwner(base(), 'SOLD_ELSEWHERE', now);
    const provisional = { 'offer-1': [ev(-3, { kind: 'REPORT', step: 'PROVISIONAL' })] };
    expect(dealPhase(ctx(r, provisional, 'offer-1'))).toBe('CLOSED_ELSEWHERE');
    const contracted = { 'offer-2': [ev(-3, { kind: 'OWNER_DECLARED', step: 'CONTRACT' })] };
    // 계약이 확정된 곳이 있으면 그곳이 이긴 곳 → 나머지만 정리
    expect(dealPhase(ctx(r, contracted, 'offer-2'))).toBe('CONTRACTED');
    expect(dealPhase(ctx(r, contracted, 'offer-1'))).toBe('CLOSED_ELSEWHERE');
  });

  it('기록: 팔았어요는 "다른 곳과 진행"(블라인드), 거둬들이기는 따로, 둘 다 집주인이 만든 새 소식', () => {
    const sold = endByOwner(base(), 'SOLD_ELSEWHERE', now);
    expect(timeline(ctx(sold, {}, 'offer-1')).at(-1)).toEqual({ at: now.toISOString(), kind: 'CLOSED_ELSEWHERE' });
    const withdrawn = endByOwner(base(), 'WITHDRAWN', now);
    expect(timeline(ctx(withdrawn, {}, 'offer-1')).at(-1)).toEqual({ at: now.toISOString(), kind: 'OWNER_WITHDRAWN' });
    expect(newsSince(ctx(withdrawn, {}, 'offer-1'), 'BROKER', iso(-1)).map((i) => i.kind)).toEqual(['OWNER_WITHDRAWN']);
  });

  it('해제된 곳은 끝난 뒤에도 "해제" 그대로, 기록 줄도 안 붙음', () => {
    const r = endByOwner({ ...base(), releasedOfferIds: ['offer-3'] }, 'SOLD_ELSEWHERE', now);
    expect(dealPhase(ctx(r, {}, 'offer-3'))).toBe('RELEASED');
    expect(timeline(ctx(r, {}, 'offer-3')).some((i) => i.kind === 'CLOSED_ELSEWHERE')).toBe(false);
  });
});

describe('집주인 화면: 광고 내림 확인 n/m', () => {
  it('광고를 올렸던 곳만 센다 (2곳), 내리면 1/2', () => {
    const r = endByOwner(base(), 'WITHDRAWN', now);
    expect(adRemoval(r, {})).toEqual({ done: 0, total: 2 });
    expect(adRemoval(r, { 'offer-2': [ev(1, { kind: 'AD_REMOVED' })] })).toEqual({ done: 1, total: 2 });
  });
  it('진행 중 의뢰는 이긴 곳이 없으면 null (지금과 같음)', () => {
    expect(adRemoval(base(), {})).toBeNull();
  });
});

describe('공유 저장소: 집주인이 끝낸 의뢰가 중개사 화면으로 넘어간다', () => {
  it('setEnded → applyMarket이 종료·이유·시각을 붙이고, 중개사 보낸 요청은 선택된 상태 유지', () => {
    const m = setEnded(EMPTY_MARKET, base().id, 'SOLD_ELSEWHERE', now);
    const seen = applyMarket(base(), m);
    expect(seen).toMatchObject({ stage: 'ENDED', endedReason: 'SOLD_ELSEWHERE', endedAt: now.toISOString() });
    expect(dealPhase(ctx(seen, {}, 'offer-1'))).toBe('CLOSED_ELSEWHERE');
    // 보낸 요청 목록은 "선택됨" 그대로 (거래 페이지에서 광고 내림까지 해야 하므로)
    const sent = { requestId: seen.id, offerId: 'offer-1', sentAt: iso(-20), strengths: [] } as never;
    expect(sentStatus(sent, seen, now.getTime())).toBe('SELECTED');
  });
  it('저장 형식 검사: 이유가 이상하거나 시각이 없으면 버린다', () => {
    const raw = JSON.stringify({ offers: {}, matched: {}, ended: { a: { reason: 'SOLD_ELSEWHERE', at: iso(0) }, b: { reason: 'EXPIRED', at: iso(0) }, c: { reason: 'WITHDRAWN' } } });
    expect(Object.keys(parseMarket(raw).ended ?? {})).toEqual(['a']);
  });
});
