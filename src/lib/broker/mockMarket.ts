/**
 * 목업 공유 저장소: 집주인 화면과 중개사 화면이 같은 브라우저 localStorage를 읽고 써서 양쪽 흐름을 끝까지 시험한다.
 * (대표님 확정 2026-10-25, docs/handover/phase5-broker-matching.md §3-9) Supabase 연결 시 테이블 + RLS로 옮기고 이 파일은 지운다.
 *
 * - market: 의뢰별로 중개사가 보낸 요청 카드, 집주인이 확정한 요청 id
 * - workspace: 이 브라우저 중개사의 크레딧·보낸 요청·"크레딧 더 받기" 기록
 */
import type { BrokerOffer, DelayReason, OwnerRequest } from '@/lib/requests/types';
import { releaseOffer } from '@/lib/requests/stage';
import type { ShowingAvailability, VisitBooking } from '@/lib/requests/showing';
import type { DealEvent, OwnerEndReason, RequestDeals } from '@/lib/deal/deal';
import { dealEventSchema, endedSchema, isRecord, listOf, matchedSchema, offerSchema, parseJson, pauseSchema, priceSchema, recordOf, sentSchema, showingSchema, visitSchema, walletSchema } from '@/lib/data/schema';
import { EMPTY_WALLET, type CreditWallet, type MoreCreditsTap } from './credits';
import type { SentRequest } from './feed';
import { confirmedFake } from './fakeReport';

export const MARKET_STORAGE_KEY = 'bokbi_mock_market';
export const WORKSPACE_STORAGE_KEY = 'bokbi_broker_workspace';

export interface MockMarket {
  offers: Record<string, BrokerOffer[]>;
  /** 집주인이 확정한 요청 id와 확정 시각 */
  matched: Record<string, { offerIds: string[]; at: string }>;
  /** 집주인이 해제한 요청 id (광고 기한을 넘긴 곳) */
  released?: Record<string, string[]>;
  /** 집주인 방문 가능 시간 (중개사 화면에 요약으로 보임) */
  showing?: Record<string, ShowingAvailability>;
  /** 방문 일정 (중개사가 전화로 정해 저장, 양쪽에서 취소). 방문 일정의 기준은 여기 */
  visits?: Record<string, VisitBooking[]>;
  /** 거래 기록 이벤트 (의뢰 id → 요청 id → 이벤트, 추가만). Supabase에선 deal_events 테이블 + RLS */
  deals?: Record<string, RequestDeals>;
  /** 집주인이 직접 끝낸 의뢰 (다른 곳에서 팔았어요·거둬들이기) → 중개사 화면 "광고를 내려 주세요" */
  ended?: Record<string, { reason: OwnerEndReason; at: string }>;
  /** 집주인 잠시 멈춤·다시 시작 (멈춘 동안 pausedAt, 다시 시작하면 pausedAt null + resumedAt = 광고 48시간 기한 시작) */
  pause?: Record<string, { pausedAt: string | null; reason: string; resumedAt: string | null }>;
  /** 매칭 뒤 집주인이 바꾼 희망가·복비·법정 상한 (2026-10-27). Supabase에선 requests 행이 바로 바뀜 */
  price?: Record<string, { askingPriceManwon: number; commissionWon: number; legalMaxWon: number }>;
}

export interface BrokerWorkspace {
  wallet: CreditWallet;
  sent: SentRequest[];
  moreCreditsTaps: MoreCreditsTap[];
}

export const EMPTY_MARKET: MockMarket = { offers: {}, matched: {}, released: {} };
export const EMPTY_WORKSPACE: BrokerWorkspace = { wallet: EMPTY_WALLET, sent: [], moreCreditsTaps: [] };

/** 거래 이벤트 형식 검사 (종류별 필드까지) — 계약은 lib/data/schema.ts */
export function isDealEvent(v: unknown): v is DealEvent {
  return dealEventSchema.safeParse(v).success;
}

/** 저장된 공유 저장소 읽기: 칸마다 깨진 항목만 버린다 (lib/data/schema.ts) */
export function parseMarket(raw: string | null): MockMarket {
  const m = parseJson(raw);
  if (!isRecord(m)) return EMPTY_MARKET;
  const deals: Record<string, RequestDeals> = {};
  if (isRecord(m.deals)) {
    for (const [rid, byOffer] of Object.entries(m.deals)) {
      if (!isRecord(byOffer)) continue;
      deals[rid] = {};
      for (const [oid, evs] of Object.entries(byOffer)) if (Array.isArray(evs)) deals[rid][oid] = listOf(dealEventSchema, evs);
    }
  }
  const offers: MockMarket['offers'] = {};
  if (isRecord(m.offers)) for (const [rid, list] of Object.entries(m.offers)) if (Array.isArray(list)) offers[rid] = listOf(offerSchema, list);
  const released: Record<string, string[]> = {};
  if (isRecord(m.released)) for (const [id, v] of Object.entries(m.released)) if (Array.isArray(v)) released[id] = v.filter((x): x is string => typeof x === 'string');
  const visits: Record<string, VisitBooking[]> = {};
  if (isRecord(m.visits)) for (const [id, v] of Object.entries(m.visits)) if (Array.isArray(v)) visits[id] = listOf(visitSchema, v);
  return {
    offers,
    matched: recordOf(matchedSchema, m.matched),
    released,
    showing: recordOf(showingSchema, m.showing),
    visits,
    deals,
    ended: recordOf(endedSchema, m.ended),
    pause: recordOf(pauseSchema, m.pause),
    price: recordOf(priceSchema, m.price),
  };
}

/** 저장된 중개사 작업 공간 읽기: 지갑이 깨졌으면 빈 지갑, 보낸 요청은 깨진 것만 버림 */
export function parseWorkspace(raw: string | null): BrokerWorkspace {
  const w = parseJson(raw);
  if (!isRecord(w)) return EMPTY_WORKSPACE;
  const wallet = walletSchema.safeParse(w.wallet);
  return {
    wallet: wallet.success ? wallet.data : EMPTY_WALLET,
    sent: listOf(sentSchema, w.sent),
    moreCreditsTaps: Array.isArray(w.moreCreditsTaps) ? (w.moreCreditsTaps as MoreCreditsTap[]) : [],
  };
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장이 막힌 브라우저: 화면 상태만 바뀐다
  }
};

export const loadMarket = () => parseMarket(read(MARKET_STORAGE_KEY));
export const saveMarket = (m: MockMarket) => write(MARKET_STORAGE_KEY, m);
export const loadWorkspace = () => parseWorkspace(read(WORKSPACE_STORAGE_KEY));
export const saveWorkspace = (w: BrokerWorkspace) => write(WORKSPACE_STORAGE_KEY, w);

export function clearMockMarket(): void {
  try {
    localStorage.removeItem(MARKET_STORAGE_KEY);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {}
}

/**
 * 의뢰에 중개사가 보낸 요청 카드를 붙이고(도착 순번 다시 매김), 집주인이 확정한 결과를 반영한다.
 * 받는 중인 의뢰가 확정됐으면 진행중으로 (광고 48시간 기한은 확정 시각부터)
 */
export function applyMarket(r: OwnerRequest, m: MockMarket): OwnerRequest {
  // 중개사가 보낸 카드는 저장소 쪽이 최신 (광고 링크 등록 등). 이미 붙은 카드도 저장소 값으로 바꾼다
  const fromMarket = m.offers[r.id] ?? [];
  const latest = new Map(fromMarket.map((o) => [o.id, o]));
  const extra = fromMarket.filter((o) => !r.offers.some((x) => x.id === o.id));
  const offers = [...r.offers.map((o) => latest.get(o.id) ?? o), ...extra].map((o, i) => ({ ...o, order: i + 1 }));
  const matched = m.matched[r.id];
  let next: OwnerRequest = {
    ...r,
    ...(m.price?.[r.id] ?? {}),
    offers,
    showing: m.showing?.[r.id] ?? r.showing,
    visits: m.visits?.[r.id] ?? r.visits,
  };
  if (matched && r.matchedOfferIds.length === 0) {
    const promote = r.stage === 'RECEIVING';
    next = {
      ...next,
      matchedOfferIds: matched.offerIds,
      ...(promote ? { stage: 'IN_PROGRESS' as const, matchedAt: matched.at, adWindowStartedAt: matched.at } : {}),
    };
  }
  // 집주인이 해제한 곳: 매칭에서 빼고, 남은 곳이 없으면 종료 (stage.releaseOffer와 같은 결과)
  const released = (m.released?.[r.id] ?? []).filter((id) => next.matchedOfferIds.includes(id));
  let afterRelease = released.reduce((acc, id) => releaseOffer(acc, id), next);
  // 잠시 멈춤·다시 시작: 양쪽 화면이 같은 상태 (다시 시작한 시각부터 광고 48시간)
  const p = m.pause?.[r.id];
  if (p?.pausedAt) afterRelease = { ...afterRelease, paused: { pausedAt: p.pausedAt, reason: p.reason } };
  else if (p?.resumedAt) {
    const start = afterRelease.adWindowStartedAt && afterRelease.adWindowStartedAt > p.resumedAt ? afterRelease.adWindowStartedAt : p.resumedAt;
    afterRelease = { ...afterRelease, paused: null, adWindowStartedAt: start, resumedAt: p.resumedAt };
  }
  // 집주인이 직접 끝낸 의뢰: 중개사 화면도 같은 종료 상태로 (deal.ownerEnded가 읽음)
  // 운영팀이 허위 매물로 확인: 의뢰 전체 종료 (fakeReport.ts, 집주인이 끝낸 것과 같은 정리 — deal.ownerEnded가 읽음)
  const fake = confirmedFake(afterRelease.offers);
  if (fake) return { ...afterRelease, stage: 'ENDED', endedReason: 'FAKE_CONFIRMED', endedAt: fake.decidedAt ?? fake.at };
  const ended = m.ended?.[r.id];
  return ended ? { ...afterRelease, stage: 'ENDED', endedReason: ended.reason, endedAt: ended.at } : afterRelease;
}

export function setPaused(m: MockMarket, requestId: string, reason: string, at: Date): MockMarket {
  return { ...m, pause: { ...(m.pause ?? {}), [requestId]: { pausedAt: at.toISOString(), reason, resumedAt: null } } };
}

export function setResumed(m: MockMarket, requestId: string, at: Date): MockMarket {
  return { ...m, pause: { ...(m.pause ?? {}), [requestId]: { pausedAt: null, reason: '', resumedAt: at.toISOString() } } };
}

/** 광고 링크를 비운다 (광고 내렸어요). 내린 광고는 AD_REMOVED 이벤트에 남겨 기록에 보인다 */
export function clearOfferAd(m: MockMarket, requestId: string, offerId: string): { market: MockMarket; ad: BrokerOffer['ad'] } {
  const list = m.offers[requestId] ?? [];
  const ad = list.find((o) => o.id === offerId)?.ad ?? null;
  if (!ad) return { market: m, ad: null };
  return { market: { ...m, offers: { ...m.offers, [requestId]: list.map((o) => (o.id === offerId ? { ...o, ad: null } : o)) } }, ad };
}

export function setPrice(m: MockMarket, requestId: string, p: { askingPriceManwon: number; commissionWon: number; legalMaxWon: number }): MockMarket {
  return { ...m, price: { ...(m.price ?? {}), [requestId]: p } };
}

export function setEnded(m: MockMarket, requestId: string, reason: OwnerEndReason, at: Date): MockMarket {
  return { ...m, ended: { ...(m.ended ?? {}), [requestId]: { reason, at: at.toISOString() } } };
}

export function setReleased(m: MockMarket, requestId: string, offerId: string): MockMarket {
  const list = m.released?.[requestId] ?? [];
  if (list.includes(offerId)) return m;
  return { ...m, released: { ...(m.released ?? {}), [requestId]: [...list, offerId] } };
}

/** 늦어진 이유를 중개사 요청 카드에 남긴다 (집주인 해제 버튼 옆에 보임) */
export function setDelayNote(m: MockMarket, requestId: string, offerId: string, reason: DelayReason, now: Date): MockMarket {
  const list = m.offers[requestId] ?? [];
  if (!list.some((o) => o.id === offerId)) return m;
  return {
    ...m,
    offers: { ...m.offers, [requestId]: list.map((o) => (o.id === offerId ? { ...o, delayNote: { reason, at: now.toISOString() } } : o)) },
  };
}

export function addOffer(m: MockMarket, requestId: string, offer: BrokerOffer): MockMarket {
  const list = m.offers[requestId] ?? [];
  if (list.some((o) => o.id === offer.id)) return m;
  return { ...m, offers: { ...m.offers, [requestId]: [...list, offer] } };
}

export function setShowing(m: MockMarket, requestId: string, showing: ShowingAvailability): MockMarket {
  return { ...m, showing: { ...(m.showing ?? {}), [requestId]: showing } };
}

export function setVisits(m: MockMarket, requestId: string, visits: VisitBooking[]): MockMarket {
  return { ...m, visits: { ...(m.visits ?? {}), [requestId]: visits } };
}

/** 거래 이벤트 추가 (지우거나 고치지 않는다: 기록이 곧 근거) */
export function appendDealEvent(m: MockMarket, requestId: string, offerId: string, event: DealEvent): MockMarket {
  const byOffer = m.deals?.[requestId] ?? {};
  const list = byOffer[offerId] ?? [];
  if (list.some((e) => e.id === event.id)) return m;
  return { ...m, deals: { ...(m.deals ?? {}), [requestId]: { ...byOffer, [offerId]: [...list, event] } } };
}

export const dealsOf = (m: MockMarket, requestId: string): RequestDeals => m.deals?.[requestId] ?? {};

export function setMatched(m: MockMarket, requestId: string, offerIds: string[], at: Date): MockMarket {
  return { ...m, matched: { ...m.matched, [requestId]: { offerIds, at: at.toISOString() } } };
}
