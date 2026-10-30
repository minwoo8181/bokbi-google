/**
 * DB 행 → 앱 타입 (Supabase 저장소). 화면은 지금 타입 그대로 쓰고, 다른 점은 여기서만 맞춘다.
 * - 시각은 어댑터마다 모양이 달라(PostgREST 문자열 / PGlite) 모두 ISO 문자열로
 * - 집주인 카드의 개설 연도·인원은 DB가 구간만 준다(사무소 특정 방지) → 같은 구간이 나오는 대표값으로 (officeAgeBand·agentCountBand)
 * - 동·호수·연락처는 의뢰에 없다 (dongHo '' · contact 없음) — contacts.reveal로만
 */
import type { CreditEvent, CreditWallet } from '@/lib/broker/credits';
import type { SentRequest } from '@/lib/broker/feed';
import type { BrokerApplication } from '@/lib/broker/application';
import type { DealEvent, RequestDeals } from '@/lib/deal/deal';
import type { AgentCountBand, OfficeAgeBand } from '@/lib/requests/stage';
import type { ShowingAvailability, VisitBooking } from '@/lib/requests/showing';
import type { BrokerDisclosure, BrokerOffer, DelayReason, EndedReason, HouseDetails, OwnerRequest, RequestStage } from '@/lib/requests/types';
import { dealEventSchema, isRecord, listOf, showingSchema } from '../schema';

// ── 기본 변환 ────────────────────────────────────────────────

export const iso = (v: unknown): string => new Date(v as string).toISOString();
export const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : iso(v));
/** date 칸 → YYYY-MM-DD */
export const dateKey = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 10) : iso(v).slice(0, 10));
const num = (v: unknown, fallback = 0): number => (v === null || v === undefined ? fallback : Number(v));

const EMPTY_SHOWING = { weekly: {}, blocked: [] } as unknown as ShowingAvailability;
export const EMPTY_DISCLOSURE: BrokerDisclosure = { officeName: '', ceoName: '', phone: '', address: '', regNo: '' };

// ── 구간 → 대표값 ───────────────────────────────────────────

/** officeAgeBand(대표값, 올해)가 같은 구간이 되는 연도 */
export function yearForBand(band: OfficeAgeBand | null, currentYear: number): number | null {
  if (band === 'UNDER_3') return currentYear - 1;
  if (band === 'FROM_3_TO_10') return currentYear - 5;
  if (band === 'OVER_10') return currentYear - 15;
  return null;
}

export function countForBand(band: AgentCountBand | null): number | null {
  return band === 'ONE' ? 1 : band === 'TWO_PLUS' ? 2 : null;
}

// ── 행 모양 ─────────────────────────────────────────────────

export interface RequestRow {
  id: string;
  owner_id: string | null;
  apt_id: string | null;
  complex_name: string;
  trade_type: '매매' | '전세';
  pyeong_label: string;
  floor_label: string;
  masked_dong_ho: string;
  asking_price_manwon: number;
  commission_won: number | string;
  legal_max_won: number | string;
  occupancy: OwnerRequest['occupancy'];
  details: unknown;
  showing: unknown;
  stage: RequestStage;
  ended_reason: EndedReason | null;
  created_at: unknown;
  matched_at: unknown;
  ad_window_started_at: unknown;
  paused_at: unknown;
  pause_reason: string | null;
  resumed_at: unknown;
  ended_at: unknown;
}

export interface OfferRow {
  id: string;
  request_id: string;
  office_id: string;
  card_order: number;
  arrived_at: unknown;
  strengths: string[];
  matched_at: unknown;
  released_at: unknown;
  ad_url: string | null;
  ad_posted_at: unknown;
  delay_reason: DelayReason | null;
  delay_at: unknown;
  fake_report_status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | null;
  fake_report_at: unknown;
  fake_decided_at: unknown;
}

/** owner_offer_cards 결과 한 줄 (사무소 id 없음) */
export interface OwnerCardRow extends Omit<OfferRow, 'id' | 'request_id' | 'office_id'> {
  offer_id: string;
  conditions: string[];
  office_age_band: OfficeAgeBand | null;
  agent_count_band: AgentCountBand | null;
  promise_kept: number;
  promise_total: number;
  review_count: number;
  review_average: number | string | null;
  review_chips: Record<string, number> | null;
}

export interface OfficeRow {
  id: string;
  user_id: string;
  reg_no: string;
  office_name: string;
  ceo_name: string;
  office_phone: string;
  address: string;
  open_year: number | null;
  agent_count: number | null;
  strengths: string[];
  conditions: string[];
  status: BrokerApplication['status'];
  submitted_at: unknown;
  reviewed_at: unknown;
  reject_reason: string | null;
  promise_kept: number;
  promise_total: number;
}

export interface DisclosureRow {
  offer_id: string;
  office_name: string;
  ceo_name: string;
  office_phone: string;
  address: string;
  reg_no: string;
}

export interface VisitRow {
  id: string;
  request_id: string;
  offer_id: string;
  visit_date: unknown;
  visit_hour: number;
  created_at: unknown;
  canceled_at: unknown;
  canceled_by: VisitBooking['canceledBy'] | null;
  cancel_reason: VisitBooking['cancelReason'] | null;
  acked_by: string[] | null;
}

export interface DealEventRow {
  id: string;
  request_id: string;
  offer_id: string;
  kind: DealEvent['kind'];
  body: unknown;
  at: unknown;
}

export interface LedgerRow {
  kind: CreditEvent['kind'];
  amount: number;
  request_id: string | null;
  reason: CreditEvent['reason'] | null;
  week: unknown;
  at: unknown;
}

// ── 변환 ─────────────────────────────────────────────────────

/** 카드 공통 칸 (광고·늦은 이유·허위 매물 신고) */
function offerState(r: Pick<OfferRow, 'ad_url' | 'ad_posted_at' | 'delay_reason' | 'delay_at' | 'fake_report_status' | 'fake_report_at' | 'fake_decided_at'>) {
  return {
    ad: r.ad_url ? { url: r.ad_url, postedAt: iso(r.ad_posted_at) } : null,
    delayNote: r.delay_reason ? { reason: r.delay_reason, at: iso(r.delay_at) } : null,
    fakeReport: r.fake_report_status ? { at: iso(r.fake_report_at), status: r.fake_report_status, decidedAt: isoOrNull(r.fake_decided_at) } : null,
  };
}

/** 집주인이 보는 요청 카드 (owner_offer_cards + 매칭된 곳만 사무소 정보) */
export function offerFromOwnerCard(r: OwnerCardRow, disclosure: BrokerDisclosure | undefined, currentYear: number): BrokerOffer {
  return {
    id: r.offer_id,
    order: r.card_order,
    arrivedAt: iso(r.arrived_at),
    officeOpenYear: yearForBand(r.office_age_band, currentYear),
    agentCount: countForBand(r.agent_count_band),
    promise: { kept: r.promise_kept, total: r.promise_total },
    review: { count: r.review_count, average: num(r.review_average), chipCounts: r.review_chips ?? {} },
    strengths: r.strengths ?? [],
    conditions: r.conditions ?? [],
    disclosure: disclosure ?? EMPTY_DISCLOSURE,
    ...offerState(r),
  };
}

/** 중개사(내 카드)·관리자가 보는 요청 카드 — 사무소 행을 볼 수 있는 쪽 */
export function offerFromRow(r: OfferRow, office: OfficeRow | undefined): BrokerOffer {
  return {
    id: r.id,
    order: r.card_order,
    arrivedAt: iso(r.arrived_at),
    officeOpenYear: office?.open_year ?? null,
    agentCount: office?.agent_count ?? null,
    promise: { kept: office?.promise_kept ?? 0, total: office?.promise_total ?? 0 },
    review: { count: 0, average: 0, chipCounts: {} },
    strengths: r.strengths ?? [],
    conditions: office?.conditions ?? [],
    disclosure: office
      ? { officeName: office.office_name, ceoName: office.ceo_name, phone: office.office_phone, address: office.address, regNo: office.reg_no }
      : EMPTY_DISCLOSURE,
    ...offerState(r),
  };
}

export const disclosureFromRow = (d: DisclosureRow): BrokerDisclosure => ({
  officeName: d.office_name,
  ceoName: d.ceo_name,
  phone: d.office_phone,
  address: d.address,
  regNo: d.reg_no,
});

export function visitFromRow(v: VisitRow): VisitBooking {
  return {
    id: v.id,
    offerId: v.offer_id,
    date: dateKey(v.visit_date),
    hour: v.visit_hour,
    createdAt: iso(v.created_at),
    ...(v.canceled_at ? { canceledAt: iso(v.canceled_at) } : {}),
    ...(v.canceled_by ? { canceledBy: v.canceled_by } : {}),
    ...(v.cancel_reason ? { cancelReason: v.cancel_reason } : {}),
    ackedBy: v.acked_by ?? [],
  };
}

/** 의뢰 행 + 카드·방문 → 화면 의뢰. 매칭·해제는 카드에서 (해제된 곳은 매칭 목록에서 빠짐 — stage.releaseOffer와 같은 뜻) */
export function requestFromRow(
  r: RequestRow,
  parts: { offers: BrokerOffer[]; matched: { id: string; matchedAt: unknown; releasedAt: unknown }[]; visits: VisitBooking[] },
): OwnerRequest {
  const showing = showingSchema.safeParse(r.showing);
  return {
    id: r.id,
    aptId: r.apt_id,
    complexName: r.complex_name,
    tradeType: r.trade_type,
    pyeongLabel: r.pyeong_label,
    floorLabel: r.floor_label,
    maskedDongHo: r.masked_dong_ho,
    dongHo: '',
    askingPriceManwon: r.asking_price_manwon,
    commissionWon: num(r.commission_won),
    legalMaxWon: num(r.legal_max_won),
    occupancy: r.occupancy,
    ...(isRecord(r.details) ? { details: r.details as unknown as HouseDetails } : {}),
    createdAt: iso(r.created_at),
    stage: r.stage,
    endedReason: r.ended_reason,
    endedAt: isoOrNull(r.ended_at),
    offers: [...parts.offers].sort((a, b) => a.order - b.order),
    matchedOfferIds: parts.matched.filter((m) => m.matchedAt && !m.releasedAt).map((m) => m.id),
    releasedOfferIds: parts.matched.filter((m) => m.releasedAt).map((m) => m.id),
    matchedAt: isoOrNull(r.matched_at),
    adWindowStartedAt: isoOrNull(r.ad_window_started_at),
    paused: r.paused_at ? { pausedAt: iso(r.paused_at), reason: r.pause_reason ?? '' } : null,
    resumedAt: isoOrNull(r.resumed_at),
    showing: showing.success ? showing.data : EMPTY_SHOWING,
    visits: parts.visits,
    contract: null,
  };
}

/** 거래 기록 행 → 요청 카드별 이벤트 (깨진 줄만 버림) */
export function dealsFromRows(rows: DealEventRow[]): RequestDeals {
  const out: RequestDeals = {};
  const sorted = [...rows].sort((a, b) => iso(a.at).localeCompare(iso(b.at)));
  for (const row of sorted) {
    const body = isRecord(row.body) ? row.body : {};
    const [e] = listOf(dealEventSchema, [{ ...body, id: row.id, at: iso(row.at), kind: row.kind }]);
    if (e) (out[row.offer_id] ??= []).push(e);
  }
  return out;
}

export function walletFromLedger(rows: LedgerRow[]): CreditWallet {
  const sorted = [...rows].sort((a, b) => iso(a.at).localeCompare(iso(b.at)));
  const weeks = sorted.filter((r) => r.kind === 'WEEKLY' && r.week).map((r) => dateKey(r.week));
  return {
    balance: sorted.reduce((s, r) => s + r.amount, 0),
    refilledWeek: weeks.length ? weeks.sort().at(-1)! : null,
    // 지급 0개 줄은 "이번 주 채움" 표시용이라 내역에선 뺀다 (브라우저 구현 refillWeekly와 같음)
    events: sorted
      .filter((r) => !(r.kind === 'WEEKLY' && r.amount === 0))
      .map((r) => ({ kind: r.kind, amount: r.amount, at: iso(r.at), requestId: r.request_id, ...(r.reason ? { reason: r.reason } : {}) })),
  };
}

export function sentFromRow(o: OfferRow, r: RequestRow | undefined, ownerCheck: SentRequest['ownerCheck']): SentRequest {
  return {
    requestId: o.request_id,
    offerId: o.id,
    sentAt: iso(o.arrived_at),
    strengths: o.strengths ?? [],
    snapshot: {
      complexName: r?.complex_name ?? '',
      tradeType: r?.trade_type ?? '매매',
      pyeongLabel: r?.pyeong_label ?? '',
      maskedDongHo: r?.masked_dong_ho ?? '',
      commissionWon: num(r?.commission_won),
    },
    ownerCheck: ownerCheck ?? null,
  };
}

/** 내 사무소 행 → 가입 신청 (확인 코드 원문은 DB에 없음) */
export function applicationFromOffice(o: OfficeRow): BrokerApplication {
  return {
    regNo: o.reg_no,
    office: o.office_name,
    ceo: o.ceo_name,
    code: '',
    strengths: o.strengths ?? [],
    conditions: o.conditions ?? [],
    phone: o.office_phone,
    submittedAt: iso(o.submitted_at),
    status: o.status,
    reviewedAt: isoOrNull(o.reviewed_at),
    rejectReason: o.reject_reason,
    openYear: o.open_year,
  };
}
