/**
 * 내 의뢰 화면 틀 확인용 목업 (실제 사무소와 겹치지 않게 "예시" 이름만 사용)
 * 가짜 실적 숫자는 넣지 않는다: 기본 목업은 모두 "복비 첫 거래".
 * 실적 숫자는 테스트 스위처 "실적 있는 예시"에서만 (디자인 확인용, 배포 전 제거)
 * 지도는 등록번호로 서버가 그린다. 1·2번은 지도 모양 확인용으로 명단의 실제 등록번호를 빌려 씀(이름·전화·주소는 예시라 지도와 다름),
 * 3번은 명단에 없는 번호 → 지도 실패 안내 확인용. 배포 전 목업 전체 제거
 */
import { defaultAvailability, openHoursOn } from '@/lib/requests/showing';
import type { BrokerOffer, OwnerRequest, PastRequest } from '@/lib/requests/types';
import { detailsFromSummary, formatDongHo } from '@/lib/requests/summaryRequest';
import { toDateKey } from './format';

const noRecord = { promise: { kept: 0, total: 0 }, review: { count: 0, average: 0, chipCounts: {} } };

const DEMO_OFFERS: BrokerOffer[] = [
  {
    id: 'offer-1',
    order: 1,
    arrivedAt: '2026-10-24T10:12:00+09:00',
    officeOpenYear: 2018,
    agentCount: 2,
    ...noRecord,
    strengths: ['시세를 잘 알아요', '연락이 빨라요', '가격 조율을 잘해요'],
    conditions: ['전자계약 가능', '주말 안내 가능'],
    distanceBand: 'M500',
    disclosure: { officeName: '다산 예시공인중개사사무소', ceoName: '김예시', phone: '031-000-0001', address: '다산동 예시상가 1층', regNo: '41360-2024-60048' },
    ad: null,
  },
  {
    id: 'offer-2',
    order: 2,
    arrivedAt: '2026-10-24T11:40:00+09:00',
    officeOpenYear: 2024,
    agentCount: 1,
    ...noRecord,
    strengths: ['사진을 잘 찍어요', '진행 상황 자주 알려요'],
    // 3번째 예시는 거리 구간 없음 (주소 변환 실패 때 칩이 빠지는 모습)
    distanceBand: 'KM1',
    disclosure: { officeName: '예시부동산공인중개사사무소', ceoName: '이예시', phone: '031-000-0002', address: '다산동 예시타워 102호', regNo: '41360-2021-70022' },
    ad: null,
  },
  {
    id: 'offer-3',
    order: 3,
    arrivedAt: '2026-10-24T13:05:00+09:00',
    officeOpenYear: null,
    agentCount: null,
    ...noRecord,
    strengths: ['쉽게 설명해요', '세입자와 잘 조율해요'],
    conditions: ['저녁 안내 가능', '카톡 상담 가능'],
    disclosure: { officeName: '예시공인중개사사무소', ceoName: '박예시', phone: '031-000-0003', address: '다산동 예시프라자 105호', regNo: '예시-없음' },
    ad: null,
  },
];

/** 테스트 스위처 전용: 실적이 쌓였을 때의 카드 모습 */
export const DEMO_OFFERS_WITH_RECORD: BrokerOffer[] = DEMO_OFFERS.map((o, i) =>
  i === 0
    ? {
        ...o,
        promise: { kept: 12, total: 12 },
        review: {
          count: 9,
          average: 4.8,
          chipCounts: { '복비 약속을 지켰어요': 8, '설명이 친절해요': 6, '연락이 빨라요': 5, '시세를 잘 알아요': 3, '사진을 잘 찍어요': 1 },
        },
      }
    : i === 1
      ? { ...o, promise: { kept: 2, total: 2 }, review: { count: 2, average: 5, chipCounts: { '연락이 빨라요': 2, '부담 없이 편했어요': 1 } } }
      : o,
);

export function demoRequest(now: Date): OwnerRequest {
  // 요청한 지 7시간 지난 상태 (41시간 남음)
  const createdAt = new Date(now.getTime() - 7 * 3_600_000).toISOString();
  return {
    id: 'BK-DEMO-0001',
    aptId: '16',
    complexName: '다산자이아이비플레이스',
    tradeType: '매매',
    pyeongLabel: '34평 · 전용 84㎡',
    floorLabel: '중층',
    maskedDongHo: '10*동 ***호',
    dongHo: '104동 1802호',
    askingPriceManwon: 99_000,
    commissionWon: 2_970_000,
    legalMaxWon: 4_950_000,
    occupancy: 'OWNER',
    details: {
      moveIn: { type: 'NEGOTIABLE', date: '' },
      aircon: '3대',
      midDoor: false,
      closet: false,
      mortgage: { status: 'NONE', plan: null },
      lease: null,
    },
    contact: { ownerName: '홍길동', ownerPhone: '010-0000-0000', tenantPhone: '', visitMemo: '', optionMemo: '' },
    createdAt,
    stage: 'RECEIVING',
    endedReason: null,
    offers: DEMO_OFFERS,
    matchedOfferIds: [],
    matchedAt: null,
    adWindowStartedAt: null,
    paused: null,
    showing: defaultAvailability(),
    visits: [],
    contract: null,
  };
}

/** 매칭 모달이 저장한 요약(localStorage `bokbi_active_request_summary`)을 화면 모델로. 중개사 요청은 목업 */
export function requestFromSummary(saved: Record<string, unknown>, now: Date): OwnerRequest | null {
  if (typeof saved.aptName !== 'string') return null;
  const base = demoRequest(now);
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v ? v : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const occ = saved.occupancy;
  const supply = typeof saved.pyeongExclusiveArea === 'number' ? ` · 전용 ${Math.round(saved.pyeongExclusiveArea)}㎡` : '';
  const pyeong = str(saved.pyeongName, '').split(' ')[0];
  return {
    ...base,
    id: str(saved.id, base.id),
    aptId: typeof saved.aptId === 'string' || typeof saved.aptId === 'number' ? String(saved.aptId) : null,
    complexName: saved.aptName,
    tradeType: saved.tradeType === '전세' ? '전세' : '매매',
    pyeongLabel: pyeong ? `${pyeong}${typeof saved.pyeongTypeName === 'string' ? ` ${saved.pyeongTypeName}` : ''}${supply}` : base.pyeongLabel,
    floorLabel: str(saved.floorLabel, base.floorLabel),
    maskedDongHo: `${str(saved.maskedDong, '')} ${str(saved.maskedHo, '***호')}`.trim(),
    dongHo: formatDongHo(str(saved.dongInput, ''), str(saved.hoInput, '')),
    askingPriceManwon: num(saved.askingPriceTenThousand, base.askingPriceManwon),
    commissionWon: num(saved.finalCommissionWon, base.commissionWon),
    legalMaxWon: num(saved.legalMaxWon, base.legalMaxWon),
    occupancy: occ === 'VACANT' || occ === 'TENANT' ? occ : 'OWNER',
    details: detailsFromSummary(saved),
    contact: {
      ownerName: str(saved.ownerName, ''),
      ownerPhone: str(saved.ownerPhone, ''),
      tenantPhone: str(saved.tenantPhone, ''),
      visitMemo: str(saved.visitNoticeMemo, ''),
      optionMemo: str(saved.customOptionMemo, ''),
    },
  };
}

/** 목업 의뢰의 요청서 (다시 요청 → 수정 흐름 확인용). 매칭 모달이 저장하는 모양과 같다. 단지 16 = 다산자이아이비플레이스 */
export const DEMO_SAVED_REQUEST = {
  aptId: '16',
  pyeongId: '85',
  pyeongName: '34평 (전용 85㎡)',
  pyeongTypeName: null,
  tradeType: '매매',
  floorCategory: 'mid',
  askingPriceTenThousand: 99_000,
  finalCommissionWon: 2_970_000,
  legalMaxWon: 4_950_000,
  occupancy: 'OWNER',
  tenantPhone: '',
  isTenantNotifiedChecked: false,
  visitNoticeMemo: '',
  moveInType: 'NEGOTIABLE',
  moveInDate: '',
  moveInDateFormatted: '입주 협의',
  leasedSale: null,
  mortgage: { status: 'NONE', maxClaimManwon: 0, plan: null, summary: '없음' },
  dongInput: '104',
  hoInput: '1802',
  hasAircon: true,
  airconCount: '3대',
  hasMidDoor: false,
  hasCloset: false,
  customOptionMemo: '',
  selectedOptionsSummary: '시스템에어컨(3대)',
  ownerName: '홍길동',
  ownerPhone: '010-0000-0000',
  ownerTelecom: 'SKT',
};

const daysAgo = (now: Date, d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

/**
 * 확정 뒤 모습: 1번은 광고를 올렸고 방문 예약 1건, 2번은 아직 준비중.
 * matchedDaysAgo로 경과 시간을 정한다 (0.7일 = 광고 기한 남음, 3일 = 기한 지남, 8일 = 7일 보호 끝)
 */
export function withDemoProgress(r: OwnerRequest, now: Date, matchedDaysAgo = 0.7): OwnerRequest {
  const matched = r.matchedOfferIds.length > 0 ? r.matchedOfferIds : ['offer-1', 'offer-2'];
  const matchedAt = daysAgo(now, matchedDaysAgo);
  const next = toDateKey(new Date(now.getTime() + 2 * 86_400_000));
  return {
    ...r,
    stage: 'IN_PROGRESS',
    matchedOfferIds: matched,
    matchedAt,
    adWindowStartedAt: matchedAt,
    offers: r.offers.map((o) =>
      o.id === matched[0] ? { ...o, ad: { url: 'https://fin.land.naver.com/articles/2657553153', postedAt: daysAgo(now, Math.max(0, matchedDaysAgo - 0.5)) } } : o,
    ),
    visits:
      r.occupancy === 'TENANT'
        ? []
        : [{ id: 'visit-1', offerId: matched[0], date: next, hour: openHoursOn(r.showing, next, [])[0] ?? 19 }],
  };
}

export function demoPastRequests(now: Date): PastRequest[] {
  return [
    { id: 'past-1', complexName: '다산자이아이비플레이스', pyeongLabel: '34평', result: 'EXPIRED', endedAt: daysAgo(now, 3) },
    { id: 'past-2', complexName: '힐스테이트다산', pyeongLabel: '27평', result: 'CONTRACTED', endedAt: daysAgo(now, 120) },
  ];
}
