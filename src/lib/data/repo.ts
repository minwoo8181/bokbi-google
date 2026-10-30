/**
 * 저장소 인터페이스 (데이터 계약 계층, 설계 docs/handover/supabase-schema.md §6).
 * 화면 훅은 이 인터페이스만 부른다 → 지금은 브라우저 저장소 구현(local/), Supabase 때는 서버 액션 + RPC 구현으로 갈아 끼운다.
 * - 모든 동작은 비동기(Promise): 서버로 바뀌어도 화면 코드가 그대로이게
 * - 돈·여러 칸이 같이 바뀌는 동작(요청 보내기·허위 매물 판정·후기 정산)은 메서드 하나 = Supabase RPC 한 트랜잭션
 * - 동·호수·연락처는 일반 저장소와 분리된 ContactVault로만, 열람 목적을 꼭 넘긴다 (열 때마다 기록)
 */
import type { ConsentKey } from '@/components/analysis/ConsentGroup';
import type { ApproveError, BrokerApplication } from '@/lib/broker/application';
import type { DecideError, FileReportError } from '@/lib/broker/fakeReport';
import type { SendBlock } from '@/lib/broker/feed';
import type { MoreCreditsAnswer, MoreCreditsTap } from '@/lib/broker/credits';
import type { BrokerWorkspace } from '@/lib/broker/mockMarket';
import type { AdminAction, AppendError } from '@/lib/admin/adminLog';
import type { DealEvent, DealEventBody, OwnerEndReason, RequestDeals } from '@/lib/deal/deal';
import type { ShowingAvailability, VisitBooking } from '@/lib/requests/showing';
import type { BrokerOffer, DelayReason, HouseDetails, OwnerContact, OwnerRequest } from '@/lib/requests/types';

export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

/** 문자열 키-값 저장소 (브라우저 localStorage, 테스트는 메모리) */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * 새 의뢰 (매칭 모달 결과). 블라인드 칸과 비밀 칸을 나눠 받는다 — 비밀 칸(동·호수·집주인 이름·세입자 전화·메모)은
 * Supabase에서 서버가 암호화해 따로 저장하고 열람 함수로만 나간다. 집주인 전화는 로그인 계정에만 (여기 없음)
 */
export interface NewRequestInput {
  blind: Pick<
    OwnerRequest,
    'aptId' | 'complexName' | 'tradeType' | 'pyeongLabel' | 'floorLabel' | 'maskedDongHo' | 'askingPriceManwon' | 'commissionWon' | 'legalMaxWon' | 'occupancy'
  > & { details?: HouseDetails; recommendation?: Record<string, unknown>; showing?: ShowingAvailability };
  secret: { dongHo: string; ownerName: string; tenantPhone: string; visitMemo: string; optionMemo: string };
  /** 동의한 약관 버전 (동의 3개 기록) */
  termsVersion: string;
}

/** 의뢰: 읽기(집주인·중개사·관리자 공통 — 권한에 맞는 것만) + 집주인 동작 */
export interface RequestRepo {
  /** 의뢰 보내기 = 의뢰 + 비밀 칸 + 동의를 한 번에. 새 의뢰 id */
  create(input: NewRequestInput, now: Date): Promise<string>;
  /** 저장된 상태(요청 카드·매칭·멈춤·종료·방문)를 붙인 의뢰 목록 */
  list(now: Date): Promise<OwnerRequest[]>;
  get(requestId: string, now: Date): Promise<OwnerRequest | null>;
  /** 화면이 들고 있는 의뢰에 저장된 최신 상태를 붙인다 (집주인 화면 — 테스트 스위처 예시도 그대로 살림) */
  refresh(request: OwnerRequest): Promise<OwnerRequest>;
  /** 매칭 확정 (최대 3곳) */
  confirmMatch(requestId: string, offerIds: string[], at: Date): Promise<Result<void, 'NO_REQUEST' | 'EMPTY' | 'TOO_MANY'>>;
  release(requestId: string, offerId: string): Promise<void>;
  setShowing(requestId: string, showing: ShowingAvailability): Promise<void>;
  /** 잠시 멈춤 (앞으로 잡힌 방문 자동 취소 포함) */
  pause(requestId: string, reason: string, at: Date): Promise<Result<void, 'NO_REQUEST'>>;
  resume(requestId: string, at: Date): Promise<void>;
  /** 다른 곳에서 팔았어요·거둬들이기 (방문 자동 취소 포함) */
  end(requestId: string, reason: OwnerEndReason, at: Date): Promise<Result<void, 'NO_REQUEST'>>;
  /**
   * 매칭 뒤 희망가 바꾸기 (2026-10-27): 의뢰 희망가·복비·법정 상한 + 매칭된 곳마다 PRICE_CHANGED 기록을 한 번에.
   * 복비는 호출하는 쪽이 lib/deal/priceChange.ts로 계산해 넘긴다
   */
  changePrice(
    requestId: string,
    plan: { priceManwon: number; fromManwon: number; feeWon: number; legalMaxWon: number },
    at: Date,
  ): Promise<Result<void, 'NO_REQUEST' | 'WRONG_STAGE'>>;
}

export type SendError = SendBlock | 'NOT_APPROVED' | 'NO_REQUEST';
export type PostAdError = 'OWNER_CHECK_FIRST' | 'NO_OFFER' | 'NO_SENT';

/** 중개사 요청 카드 */
export interface OfferRepo {
  /** 요청 보내기 = 막힘 검사 + 크레딧 1개 + 카드 + 보낸 기록을 한 번에. blocking: 기한 지난 내 할 일 수 (새 요청 잠금) */
  send(input: { requestId: string; strengths: string[]; now: Date; blocking: number }): Promise<Result<BrokerOffer, SendError>>;
  /** 등기부로 소유자 확인 (거래 기록 OWNER_CHECKED) */
  confirmOwner(requestId: string, offerId: string, how: 'CONFIRMED' | 'CALL_CONFIRMED', at: Date): Promise<void>;
  postAd(requestId: string, offerId: string, url: string, at: Date): Promise<Result<void, PostAdError>>;
  /** 광고 내렸어요: 링크를 비우고 내린 광고는 거래 기록에 남김 */
  removeAd(requestId: string, offerId: string, at: Date): Promise<void>;
  setDelay(requestId: string, offerId: string, reason: DelayReason, at: Date): Promise<void>;
  fileFakeReport(requestId: string, offerId: string, at: Date): Promise<Result<void, FileReportError>>;
  /** 운영팀 판정 = 판정 + (허위 맞음이면) 의뢰 종료·매칭된 곳 환불을 한 번에 */
  decideFakeReport(requestId: string, offerId: string, verdict: 'CONFIRMED' | 'REJECTED', at: Date): Promise<Result<void, DecideError>>;
}

/** 거래 기록: 추가만 */
export interface DealRepo {
  events(requestId: string): Promise<RequestDeals>;
  append(requestId: string, offerId: string, body: DealEventBody, at: Date): Promise<DealEvent>;
}

export interface VisitRepo {
  save(requestId: string, visits: VisitBooking[]): Promise<void>;
}

/** 이 중개사의 크레딧·보낸 요청 */
export interface CreditRepo {
  workspace(): Promise<BrokerWorkspace>;
  /** 승인된 중개사면 이번 주 채움 + 돌려받을 크레딧(후기·허위 매물 확인) 정산. 바뀌었으면 저장 */
  settle(now: Date): Promise<BrokerWorkspace>;
  tapMoreCredits(from: MoreCreditsTap['from'], at: Date): Promise<void>;
  /** "크레딧 더 받기" 투표 답 (마지막으로 누른 기록에) */
  answerMoreCredits(answer: MoreCreditsAnswer): Promise<void>;
}

export interface ApplicationRepo {
  get(): Promise<BrokerApplication | null>;
  /** 브라우저 저장소 단계 저장. Supabase는 null(지우기)만 — 신청은 서버 액션 submitBrokerApplication (A4) */
  save(app: BrokerApplication | null): Promise<void>;
  /**
   * 가입 동의 기록 (A6, 대표님 2026-10-29: 휴대폰 인증 직후). 추가만, 같은 약관 버전·항목은 한 번만.
   * Supabase = consents(context BROKER_SIGNUP, 본인 user_id — RLS), 브라우저 저장소 = 이 브라우저
   */
  recordConsents(keys: ConsentKey[], termsVersion: string, at: Date): Promise<void>;
}

/** 동의 기록 한 줄 (브라우저 저장소 단계, 서버는 consents 표) */
export interface ConsentRecord {
  key: ConsentKey;
  termsVersion: string;
  at: string;
}

/** 관리자 가입 목록 한 줄 (A2''): 확인 코드는 없음(서버엔 해시만) */
export type AdminApplication = Omit<BrokerApplication, 'code'> & { id: string };
export type ApplicationDecision =
  | { kind: 'APPROVE'; spokenCode: string; registryOpenYear: number | null; enteredYear: string }
  | { kind: 'REJECT'; reason: string };
/** LOCKED: 코드 5번 틀림(서버), REASON_REQUIRED: 반려 사유 없음, NOT_FOUND: 없는 신청 */
export type ApplicationDecideError = ApproveError | 'LOCKED' | 'REASON_REQUIRED' | 'NOT_FOUND';

export interface AdminRepo {
  actions(): Promise<AdminAction[]>;
  append(action: AdminAction): Promise<Result<void, AppendError>>;
  /** 가입 신청 전체 (확인 대기 먼저, 그다음 최근 신청 순) — 관리자만 (Supabase는 RLS) */
  applications(): Promise<AdminApplication[]>;
  /** 승인(확인 코드 + 개설 연도) / 반려(사유). Supabase는 approve_broker 한 트랜잭션 + 처리 기록 */
  decideApplication(id: string, decision: ApplicationDecision, now: Date): Promise<Result<void, ApplicationDecideError>>;
}

export type ContactPurpose = 'OWNER_VIEW' | 'MATCHED_BROKER' | 'ADMIN_REVIEW';
export interface AccessLogRow {
  at: string;
  requestId: string;
  purpose: ContactPurpose;
  reason: string | null;
}
export type RevealError = 'NO_REQUEST' | 'NOT_ALLOWED' | 'REASON_REQUIRED';

/** 동·호수·연락처 (Supabase: vault 스키마 + reveal_contact 함수). 열 때마다 기록 */
export interface ContactVault {
  reveal(requestId: string, purpose: ContactPurpose, now: Date, reason?: string): Promise<Result<{ dongHo: string; contact: OwnerContact | null }, RevealError>>;
  accessLog(): Promise<AccessLogRow[]>;
}

export interface Repos {
  requests: RequestRepo;
  offers: OfferRepo;
  deals: DealRepo;
  visits: VisitRepo;
  credits: CreditRepo;
  applications: ApplicationRepo;
  admin: AdminRepo;
  contacts: ContactVault;
}
