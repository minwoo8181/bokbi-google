/**
 * 선택된 매물 관리 (Phase 5 ④, 결정론·순수 함수). 설계: docs/handover/phase5-broker-matching.md §3-5·6
 * 순서: 선택됨 → 소유자 확인(등기부) → 네이버 광고 링크 등록. 광고 기한은 확정 시각부터 48시간 (집주인 쪽 adState와 같은 규칙)
 * 허위 매물 신고 → 운영팀 확인 → 의뢰 종료 + 매칭된 곳 크레딧 1개씩 돌려줌 (fakeReport.ts)
 */
import type { AdState } from '@/lib/requests/stage';
import type { BrokerOffer, OwnerRequest } from '@/lib/requests/types';
import type { SentRequest } from './feed';
import type { BrokerWorkspace, MockMarket } from './mockMarket';

export type ListingStep = 'OWNER_CHECK' | 'AD' | 'AD_LIVE' | 'REPORTED';

/** 선택된 매물에서 지금 할 단계 */
export function listingStep(s: SentRequest, offer: BrokerOffer | null): ListingStep {
  // 반려된 신고는 소유자 확인부터 다시 (fakeReport.ts)
  if (offer?.fakeReport && offer.fakeReport.status !== 'REJECTED') return 'REPORTED';
  if (offer?.ad) return 'AD_LIVE';
  return s.ownerCheck ? 'AD' : 'OWNER_CHECK';
}

export function myOffer(request: OwnerRequest | null, s: SentRequest): BrokerOffer | null {
  return request?.offers.find((o) => o.id === s.offerId) ?? null;
}

/**
 * 광고 기한 알림 단계: 24시간 이하 SOON, 6시간 이하 URGENT, 지나면 OVERDUE (해제 전에 빨리 움직이게, 대표님 2026-10-25)
 * 문자 알림을 붙일 때도 같은 단계를 쓴다
 */
export type AdUrgency = 'NORMAL' | 'SOON' | 'URGENT' | 'OVERDUE';
export const AD_SOON_HOURS = 24;
export const AD_URGENT_HOURS = 6;

export function adUrgency(ad: AdState): AdUrgency {
  if (ad.kind === 'OVERDUE') return 'OVERDUE';
  if (ad.kind !== 'PENDING') return 'NORMAL';
  if (ad.hoursLeft <= AD_URGENT_HOURS) return 'URGENT';
  return ad.hoursLeft <= AD_SOON_HOURS ? 'SOON' : 'NORMAL';
}

/** 한국 날짜·시각 → 시각(ms). 내 매물 "지금 할 일"은 거래 색 띠(deal.ts cardStrip)로 합쳤다 (2026-10-25) */
export function kstVisitMs(date: string, hour: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour - 9);
}

const updateSent = (ws: BrokerWorkspace, requestId: string, fn: (s: SentRequest) => SentRequest): BrokerWorkspace => ({
  ...ws,
  sent: ws.sent.map((s) => (s.requestId === requestId ? fn(s) : s)),
});

export function confirmOwner(ws: BrokerWorkspace, requestId: string, how: 'CONFIRMED' | 'CALL_CONFIRMED'): BrokerWorkspace {
  return updateSent(ws, requestId, (s) => ({ ...s, ownerCheck: how }));
}

/** 소유자 확인 전에는 광고 링크를 저장하지 않는다. url은 normalizeNaverListingInput 결과 */
export function postAd(
  market: MockMarket,
  s: SentRequest,
  url: string,
  now: Date,
): { ok: true; market: MockMarket } | { ok: false; error: 'OWNER_CHECK_FIRST' | 'NO_OFFER' } {
  if (!s.ownerCheck) return { ok: false, error: 'OWNER_CHECK_FIRST' };
  const list = market.offers[s.requestId] ?? [];
  if (!list.some((o) => o.id === s.offerId)) return { ok: false, error: 'NO_OFFER' };
  const offers = list.map((o) => (o.id === s.offerId ? { ...o, ad: { url, postedAt: now.toISOString() } } : o));
  return { ok: true, market: { ...market, offers: { ...market.offers, [s.requestId]: offers } } };
}

// 허위 매물 신고·판정·환불은 fakeReport.ts (공유 저장소의 요청 카드에 기록, 2026-10-26)
