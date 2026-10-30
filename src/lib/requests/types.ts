/**
 * 집주인 "내 의뢰" 데이터 모델 (대표님 합의 2026-10-24~25)
 *
 * 한 화면 + 상태 3단계 + 종료:
 *   RECEIVING   요청 받는 중 (48시간, 익명 요청 카드, 최대 3곳 선택). 복비를 바꾸려면 취소하고 다시 요청
 *   IN_PROGRESS 중개 진행중 (확정한 곳에만 사무소 정보 공개, 광고 48시간 기한, 방문 가능 시간)
 *               확정 후 7일은 취소 불가 → 7일 뒤 "잠시 멈추기"·"매물 거둬들이기"
 *   CONTRACTED  계약 완료 (합의 복비 확인 1번 + 잔금 후 후기 1번)
 *   ENDED       취소·만료·거둬들임·다른 곳 계약·전원 해제
 *
 * 백엔드 연동 시: `disclosure`는 매칭 확정 전 응답에서 제외해야 한다 (CLAUDE.md 원칙 5).
 * 지금은 목업이라 클라이언트에 있지만, 화면은 확정된 곳만 그린다.
 */
import type { ShowingAvailability, VisitBooking } from './showing';
import type { LeasedSaleInput } from '@/lib/market/leasedSale';
import type { MortgagePlan, MortgageStatus } from '@/lib/market/mortgage';
import type { DistanceBand } from '@/lib/geo/distance';

export type RequestStage = 'RECEIVING' | 'IN_PROGRESS' | 'CONTRACTED' | 'ENDED';
/** DEAL_BROKEN: 가계약·계약 뒤 해제를 집주인이 확인 (거래 기록 src/lib/deal) */
/** FAKE_CONFIRMED: 운영팀이 허위 매물로 확인 (lib/broker/fakeReport.ts) */
export type EndedReason = 'EXPIRED' | 'CANCELLED' | 'WITHDRAWN' | 'SOLD_ELSEWHERE' | 'RELEASED' | 'DEAL_BROKEN' | 'FAKE_CONFIRMED';
export type Occupancy = 'VACANT' | 'OWNER' | 'TENANT';

/** 매칭 확정 뒤에만 보여주는 사무소 정보 */
export interface BrokerDisclosure {
  officeName: string;
  ceoName: string;
  phone: string;
  address: string;
  /** 중개사무소 등록번호. 지도는 서버가 명단 주소를 그때그때 좌표로 바꿔 그린다 (VWorld 약관상 좌표 저장 금지) */
  regNo: string;
}

export interface BrokerAd {
  /** normalizeNaverListingInput 결과 */
  url: string;
  postedAt: string;
}

export interface BrokerOffer {
  id: string;
  /** 카드 순번 1·2·3 (도착 순) */
  order: number;
  arrivedAt: string;
  /** 등록번호에서 계산한 개설 연도, 확인 불가면 null. 화면에는 구간으로만 (사무소 식별 방지) */
  officeOpenYear: number | null;
  /** 소속 공인중개사 수 (가입 때 VWorld 화면으로 확인), 모르면 null. 화면에는 구간으로만 */
  agentCount: number | null;
  /**
   * total: 복비 매칭으로 계약한 거래 수. kept: 그중 약속 이행으로 센 거래 수
   * (집주인이 합의 복비대로라고 확인 + 계약일·잔금일을 중개사가 직접 보고, stage.ts countsAsKeptPromise)
   */
  promise: { kept: number; total: number };
  /** 계약 완료가 확인된 거래의 후기 (글 없이 별점 + 칩) */
  review: { count: number; average: number; chipCounts: Record<string, number> };
  /** 중개사가 고른 강점 칩 (최대 3개, 자유 글 없음). 추가 할인 제의는 두지 않음 (대표님 결정 2026-10-25) */
  strengths: string[];
  /** 가능한 것 (주말 안내·전자계약 등 조건, 가입 때 고름). 강점과 따로 한 줄로 */
  conditions?: string[];
  /** 단지 ↔ 사무소 직선거리 구간 (요청 보낼 때 서버가 한 번 계산, 좌표·정확한 거리는 없음). 모르면 없음 → 칩 없음 (2026-10-29) */
  distanceBand?: DistanceBand | null;
  disclosure: BrokerDisclosure;
  ad: BrokerAd | null;
  /** 광고 기한을 넘긴 중개사가 고른 늦어진 이유 (정해진 칩만, 집주인 해제 버튼 옆에 보임) */
  delayNote?: { reason: DelayReason; at: string } | null;
  /** 이 중개사가 낸 허위 매물 신고 (한 번만, lib/broker/fakeReport.ts). 확인 중이면 이 중개사 광고 시간이 멈춘다 */
  fakeReport?: FakeReport | null;
}

export type FakeReportStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export interface FakeReport {
  at: string;
  status: FakeReportStatus;
  /** 관리자 판정 시각 (확인 중이면 null) */
  decidedAt: string | null;
}

export type DelayReason = 'PHOTO' | 'TODAY' | 'OWNER_CHECK';

export interface ContractInfo {
  offerId: string;
  /** 계약을 먼저 알린 쪽 */
  reportedBy: 'OWNER' | 'BROKER';
  reportedAt: string;
  /** 중개사가 먼저 알렸을 때 집주인이 "맞아요"를 눌렀는지 */
  ownerConfirmed: boolean;
  /** 중개사가 48시간 안에 알려 주거나, 지나면 집주인이 직접 입력 */
  contractDate: string | null;
  balanceDate: string | null;
  /** "합의한 복비 그대로 계약하셨나요?" 답. 아직이면 null */
  feeKept: boolean | null;
  review: { stars: number; chips: string[] } | null;
}

/**
 * 집 정보 (매칭 모달에서 집주인이 정해진 칸으로 고른 값만). 중개사 피드에 매칭 전에도 보여 준다.
 * 자유 글(옵션 메모·방문 메모)과 채권최고액은 넣지 않는다: 연락처·동호수가 섞이거나 민감해서 (2026-10-25)
 */
export interface HouseDetails {
  moveIn: { type: 'IMMEDIATE' | 'NEGOTIABLE' | 'DATE'; date: string };
  /** 시스템에어컨 대수 표시 (없으면 null) */
  aircon: string | null;
  midDoor: boolean;
  closet: boolean;
  mortgage: { status: MortgageStatus; plan: MortgagePlan | null } | null;
  /** 세입자 낀 매매 (보증금·만기·갱신권) */
  lease: LeasedSaleInput | null;
}

/**
 * 매칭 확정 뒤 고른 중개사에게만 공개하는 집주인 쪽 정보 (집주인 동의 화면 제3자 제공 항목).
 * 백엔드 연동 시 확정 전 응답에서 제외 (CLAUDE.md 원칙 5). 피드(toFeed)에는 들어가지 않는다
 */
export interface OwnerContact {
  ownerName: string;
  ownerPhone: string;
  /** 세입자 거주일 때만 */
  tenantPhone: string;
  /** 방문 안내 메모·옵션 메모 (자유 글이라 매칭 전에는 숨김) */
  visitMemo: string;
  optionMemo: string;
}

export interface PauseInfo {
  pausedAt: string;
  reason: string;
}

export interface OwnerRequest {
  id: string;
  /** 분석 화면 단지 번호 (자세히 조절하기 링크) */
  aptId: string | null;
  complexName: string;
  tradeType: '매매' | '전세';
  pyeongLabel: string;
  floorLabel: string;
  maskedDongHo: string;
  dongHo: string;
  askingPriceManwon: number;
  commissionWon: number;
  legalMaxWon: number;
  occupancy: Occupancy;
  /** 집 정보 (예전 저장분에는 없을 수 있음) */
  details?: HouseDetails;
  /** 매칭 후 공개 정보 */
  contact?: OwnerContact;
  createdAt: string;
  stage: RequestStage;
  endedReason: EndedReason | null;
  /** 집주인이 의뢰를 직접 끝낸 시각 (다른 곳에서 팔았어요·거둬들이기 → 중개사 기록 시각) */
  endedAt?: string | null;
  offers: BrokerOffer[];
  /** 확정한 요청 id (최대 3) */
  matchedOfferIds: string[];
  /** 집주인이 해제한 요청 id (중개사 화면에 "매칭이 해제됐어요") */
  releasedOfferIds?: string[];
  matchedAt: string | null;
  /** 광고 48시간 기한의 시작 (확정 시각, 잠시 멈춘 뒤 다시 시작하면 그 시각) */
  adWindowStartedAt: string | null;
  paused: PauseInfo | null;
  /** 마지막으로 다시 시작한 시각 (거래 기록 "다시 시작했어요" 줄) */
  resumedAt?: string | null;
  showing: ShowingAvailability;
  visits: VisitBooking[];
  contract: ContractInfo | null;
}

/** 끝난 의뢰 목록 한 줄 */
export interface PastRequest {
  id: string;
  complexName: string;
  pyeongLabel: string;
  result: EndedReason | 'CONTRACTED';
  endedAt: string;
}
