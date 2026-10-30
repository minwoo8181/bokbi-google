/**
 * 중개사 새 의뢰 피드·요청 보내기 (결정론, 순수 함수). 설계: docs/handover/phase5-broker-matching.md
 * - 블라인드: 피드에는 동·호수(가린 값만)·집주인 정보·다른 중개사 요청이 내려가지 않는다
 * - 요청 1번에 크레딧 1개 (하루 제한 없음 — 크레딧이 주 3개라 같은 3이 두 번 나와 헷갈림, 대표님 2026-10-29)
 * - 보낸 요청 상태: 기다리는 중 → 선택됨 / 선택되지 않음 / 마감
 */
import { effectiveStage, hoursLeft } from '@/lib/requests/stage';
import type { BrokerOffer, HouseDetails, Occupancy, OwnerRequest } from '@/lib/requests/types';
import { buyerCashManwon } from '@/lib/market/leasedSale';
import { calculateLegalCommission } from '@/lib/commission';
import type { CreditWallet } from './credits';
import type { BrokerApplication } from './application';

/** 피드 카드에 쓰는 값만 (집주인 이름·연락처·실제 동호수 없음) */
export interface FeedItem {
  requestId: string;
  complexName: string;
  tradeType: OwnerRequest['tradeType'];
  pyeongLabel: string;
  floorLabel: string;
  maskedDongHo: string;
  askingPriceManwon: number;
  commissionWon: number;
  legalMaxWon: number;
  occupancy: Occupancy;
  /** 정해진 칸으로 고른 집 정보 (자유 메모 없음) */
  details: HouseDetails | null;
  // 방문 가능 시간은 넣지 않는다: 집주인이 매칭 뒤에 정하므로 접수 때는 기본값뿐 (대표님 2026-10-25)
  createdAt: string;
  hoursLeft: number;
}

/** 받는 금액이 법정 상한의 몇 %인지 (반올림, 0~100). 상한을 모르면 null */
export function legalRatioPct(commissionWon: number, legalMaxWon: number): number | null {
  if (!(legalMaxWon > 0) || !(commissionWon >= 0)) return null;
  return Math.min(100, Math.round((commissionWon / legalMaxWon) * 100));
}

/**
 * 계약하면 받는 금액 (A안, 대표님 2026-10-26): 집주인 쪽 합의 금액 + 상대방(매수인·세입자) 쪽 법정 상한.
 * 상대방 쪽은 실제로는 따로 협의하므로 "최대"로만 쓴다. 기준가는 희망가 (실제 거래가가 다르면 달라짐)
 */
export function dealEarnings(item: Pick<FeedItem, 'tradeType' | 'askingPriceManwon' | 'commissionWon'>): {
  ownerWon: number;
  otherMaxWon: number;
  totalMaxWon: number;
} {
  const otherMaxWon = calculateLegalCommission(item.askingPriceManwon * 10_000, item.tradeType).maxWon;
  return { ownerWon: item.commissionWon, otherMaxWon, totalMaxWon: item.commissionWon + otherMaxWon };
}

/** 세입자 낀 매매의 갭(매수에 필요한 금액 = 희망가 − 보증금, 만 원). 해당 없으면 null */
export function gapManwon(item: Pick<FeedItem, 'tradeType' | 'askingPriceManwon' | 'details'>): number | null {
  const lease = item.details?.lease;
  if (item.tradeType !== '매매' || !lease) return null;
  return buyerCashManwon(item.askingPriceManwon, lease.depositManwon);
}

/** 요청을 받는 중인 의뢰만, 남은 시간이 짧은 순 */
export function toFeed(requests: OwnerRequest[], now: number): FeedItem[] {
  return requests
    .filter((r) => effectiveStage(r, now).stage === 'RECEIVING')
    .map((r) => ({
      requestId: r.id,
      complexName: r.complexName,
      tradeType: r.tradeType,
      pyeongLabel: r.pyeongLabel,
      floorLabel: r.floorLabel,
      maskedDongHo: r.maskedDongHo,
      askingPriceManwon: r.askingPriceManwon,
      commissionWon: r.commissionWon,
      legalMaxWon: r.legalMaxWon,
      occupancy: r.occupancy,
      details: r.details ?? null,
      createdAt: r.createdAt,
      hoursLeft: hoursLeft(r.createdAt, now),
    }))
    .sort((a, b) => a.hoursLeft - b.hoursLeft);
}

/** 남은 시간 글자를 빨강으로 보이는 기준: 24시간 미만 (대표님 2026-10-27, 하루 한 번 들어오면 다음엔 마감됐을 매물) */
export const URGENT_HOURS = 24;

export function isUrgent(hoursLeft: number): boolean {
  return hoursLeft < URGENT_HOURS;
}

export type FeedFilter = 'ALL' | OwnerRequest['tradeType'];

/**
 * 피드 섹션 (대표님 2026-10-27): 요청 가능한 매물 → 요청 보낸 매물(맨 아래). 예전 곧 마감·여유 있음 묶음은 하나로 합침.
 * 거래 종류 필터를 먼저 걸고, 각 섹션 안은 toFeed 순서(남은 시간 짧은 순) 그대로
 */
export function groupFeed(feed: FeedItem[], sentIds: ReadonlySet<string>, filter: FeedFilter = 'ALL') {
  const items = filter === 'ALL' ? feed : feed.filter((f) => f.tradeType === filter);
  return {
    open: items.filter((f) => !sentIds.has(f.requestId)),
    sent: items.filter((f) => sentIds.has(f.requestId)),
  };
}

/** 필터 칩 개수 (필터와 상관없이 전체 피드 기준) */
export function feedFilterCounts(feed: FeedItem[]): Record<FeedFilter, number> {
  return { ALL: feed.length, 매매: feed.filter((f) => f.tradeType === '매매').length, 전세: feed.filter((f) => f.tradeType === '전세').length };
}

export interface SentRequest {
  requestId: string;
  /** 집주인 화면에 들어간 요청 카드 id */
  offerId: string;
  sentAt: string;
  strengths: string[];
  /** 보낼 때 피드 카드 (의뢰가 끝나 목록에서 사라져도 내 매물에 남김) */
  snapshot: Pick<FeedItem, 'complexName' | 'tradeType' | 'pyeongLabel' | 'maskedDongHo' | 'commissionWon'>;
  /** 선택된 뒤 소유자 확인 (등기부 소유자와 같음 / 달라서 집주인에게 전화로 확인함) */
  ownerCheck?: 'CONFIRMED' | 'CALL_CONFIRMED' | null;
  /** 허위 매물 신고는 공유 저장소의 요청 카드(offer.fakeReport)에 둔다 (집주인·관리자도 보게, fakeReport.ts) */
}

export type SentStatus = 'WAITING' | 'SELECTED' | 'NOT_SELECTED' | 'CLOSED' | 'STOPPED' | 'RELEASED';

/** request: 지금 그 의뢰 (사라졌으면 null) */
export function sentStatus(s: SentRequest, request: OwnerRequest | null, now: number): SentStatus {
  if (!request) return 'CLOSED';
  // 내가 허위 매물로 알렸고 운영팀이 확인함 (같은 의뢰에 매칭된 다른 곳은 "광고를 내려 주세요"까지 거래 페이지로 정리)
  if (request.offers.find((o) => o.id === s.offerId)?.fakeReport?.status === 'CONFIRMED') return 'STOPPED';
  if (request.releasedOfferIds?.includes(s.offerId)) return 'RELEASED';
  if (request.matchedOfferIds.includes(s.offerId)) return 'SELECTED';
  if (request.matchedOfferIds.length > 0) return 'NOT_SELECTED';
  return effectiveStage(request, now).stage === 'RECEIVING' ? 'WAITING' : 'CLOSED';
}

export type SendBlock = 'ALREADY_SENT' | 'CLOSED' | 'TODO_FIRST' | 'NO_CREDIT';

/**
 * 보낼 수 있으면 null, 못 보내면 이유 (화면 우선순위 순서로 검사).
 * blocking: 기한이 지난 내 할 일 수 (deal.isBlocking) — 있으면 새 요청만 막는다 (크레딧 안 씀, 대표님 2026-10-26)
 */
export function sendBlock(input: { request: OwnerRequest; sent: SentRequest[]; wallet: CreditWallet; now: Date; blocking?: number }): SendBlock | null {
  const { request, sent, wallet, now } = input;
  if (sent.some((s) => s.requestId === request.id)) return 'ALREADY_SENT';
  if (effectiveStage(request, now.getTime()).stage !== 'RECEIVING') return 'CLOSED';
  if ((input.blocking ?? 0) > 0) return 'TODO_FIRST';
  if (wallet.balance < 1) return 'NO_CREDIT';
  return null;
}

/**
 * 이 매물에 추천하는 강점 칩 (고정 규칙, 칩 이름은 siteContent.brokerStrengths와 같아야 한다 — 테스트가 확인)
 * 세입자 거주 → 세입자 조율, 빈집 → 사진·장점 살리기, 전세 → 전세 계약·권리관계, 매매 → 가격 조율·세금·대출
 */
export function recommendedStrengths(item: Pick<FeedItem, 'tradeType' | 'occupancy'>): string[] {
  const out: string[] = [];
  if (item.occupancy === 'TENANT') out.push('세입자와 잘 조율해요', ...(item.tradeType === '매매' ? ['세입자 낀 매매 잘해요'] : []));
  if (item.occupancy === 'VACANT') out.push('사진을 잘 찍어요', '집 장점을 잘 살려요');
  if (item.tradeType === '전세') out.push('전세 계약 꼼꼼해요', '권리관계 꼼꼼히 봐요');
  else out.push('가격 조율을 잘해요', '세금·대출까지 알려줘요');
  out.push('진행 상황 자주 알려요');
  return [...new Set(out)].slice(0, 5);
}

/** 집주인 화면에 들어갈 익명 요청 카드. 사무소 정보는 매칭 확정 뒤에만 그려진다 (types.ts) */
export function buildOffer(app: BrokerApplication, input: { requestId: string; existing: BrokerOffer[]; strengths: string[]; now: Date }): BrokerOffer {
  return {
    id: `offer-${app.regNo}-${input.requestId}`,
    order: input.existing.length + 1,
    arrivedAt: input.now.toISOString(),
    officeOpenYear: app.openYear,
    agentCount: null,
    promise: { kept: 0, total: 0 },
    review: { count: 0, average: 0, chipCounts: {} },
    strengths: input.strengths,
    conditions: app.conditions ?? [],
    // 목업: 대표자 이름·주소는 명단(서버)에만 있어 화면으로 내려오지 않는다. Supabase 연결 시 서버가 매칭 확정 뒤 채운다
    disclosure: { officeName: app.office, ceoName: '', phone: app.phone, address: '', regNo: app.regNo },
    ad: null,
  };
}
