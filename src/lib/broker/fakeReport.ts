/**
 * 허위 매물 신고 (결정론·순수 함수, 대표님 확정 2026-10-26). 설계: docs/handover/phase5-broker-matching.md 5-3
 *
 * 흐름: 중개사가 소유자 확인 단계에서 "허위 매물 같아요" → 그 중개사 거래만 "소유자 확인 중"(광고 48시간도 멈춤) →
 * 관리자 오늘 할 일(24시간 넘으면 빨강) → 관리자가 집주인에게 전화로 확인 →
 * - 허위 맞음(CONFIRMED): 의뢰 전체 종료, 매칭된 중개사 모두 크레딧 1개씩 돌려받음, 광고 올린 곳은 "광고를 내려 주세요"
 * - 허위 아님(REJECTED): 신고한 중개사는 소유자 확인부터 다시, 광고 시간은 기다린 만큼 늘어남(남은 시간 그대로), 크레딧은 그대로
 * 관리자가 정하지 않으면 자동으로 정하지 않는다 (환불·종료는 사람이 판단). 집주인은 막지 않고 안내만, 다른 중개사는 그대로.
 *
 * 기록은 공유 저장소의 요청 카드(offer.fakeReport)에 둔다 → applyMarket으로 집주인·중개사·관리자 화면이 같은 기록을 본다.
 * Supabase에선 fake_reports 테이블 + 판정은 관리자 RPC 한 트랜잭션(판정 + 의뢰 종료 + 크레딧 환불)
 */
import type { BrokerOffer, FakeReport, OwnerRequest } from '@/lib/requests/types';
import { refundCredit } from './credits';
import type { BrokerWorkspace, MockMarket } from './mockMarket';

export type { FakeReport, FakeReportStatus } from '@/lib/requests/types';

/** 관리자가 이 시간 안에 판정하지 않으면 관리자 화면에서 빨강 */
export const REPORT_REVIEW_HOURS = 24;

const HOUR = 3_600_000;
const ms = (iso: string) => new Date(iso).getTime();

export type FileReportError = 'NO_OFFER' | 'AD_POSTED' | 'ALREADY_REPORTED';

/**
 * 신고: 요청 카드 하나에 한 번만 (반려된 뒤 다시 신고 불가 — 같은 이유로 또 멈추지 않게).
 * 광고를 올린 뒤에는 신고하지 않는다 (버튼이 소유자 확인 단계에만 있음)
 */
export function fileFakeReport(
  m: MockMarket,
  requestId: string,
  offerId: string,
  now: Date,
): { ok: true; market: MockMarket } | { ok: false; error: FileReportError } {
  const list = m.offers[requestId] ?? [];
  const offer = list.find((o) => o.id === offerId);
  if (!offer) return { ok: false, error: 'NO_OFFER' };
  if (offer.fakeReport) return { ok: false, error: 'ALREADY_REPORTED' };
  if (offer.ad) return { ok: false, error: 'AD_POSTED' };
  const report: FakeReport = { at: now.toISOString(), status: 'PENDING', decidedAt: null };
  return { ok: true, market: { ...m, offers: { ...m.offers, [requestId]: list.map((o) => (o.id === offerId ? { ...o, fakeReport: report } : o)) } } };
}

export type DecideError = 'NO_REPORT' | 'ALREADY_DECIDED';

/** 관리자 판정 (한 번만). 크레딧 환불은 각 중개사 작업 공간이 settleFakeRefunds로 */
export function decideFakeReport(
  m: MockMarket,
  requestId: string,
  offerId: string,
  verdict: 'CONFIRMED' | 'REJECTED',
  now: Date,
): { ok: true; market: MockMarket } | { ok: false; error: DecideError } {
  const list = m.offers[requestId] ?? [];
  const report = list.find((o) => o.id === offerId)?.fakeReport;
  if (!report) return { ok: false, error: 'NO_REPORT' };
  if (report.status !== 'PENDING') return { ok: false, error: 'ALREADY_DECIDED' };
  const next: FakeReport = { ...report, status: verdict, decidedAt: now.toISOString() };
  return { ok: true, market: { ...m, offers: { ...m.offers, [requestId]: list.map((o) => (o.id === offerId ? { ...o, fakeReport: next } : o)) } } };
}

/** 운영팀 확인 중인 요청 카드 (집주인 화면 맨 위 안내). 매칭 중인 곳만 */
export function pendingOwnerCheck(r: Pick<OwnerRequest, 'offers' | 'matchedOfferIds'>): BrokerOffer | null {
  return r.offers.find((o) => o.fakeReport?.status === 'PENDING' && r.matchedOfferIds.includes(o.id)) ?? null;
}

/** 허위 매물로 확인된 신고 (의뢰 전체 종료). 없으면 null */
export function confirmedFake(offers: BrokerOffer[]): FakeReport | null {
  return offers.find((o) => o.fakeReport?.status === 'CONFIRMED')?.fakeReport ?? null;
}

/**
 * 광고 48시간에서 빼 줄 시간(ms): 확인을 기다린 시간. 기한이 시작되기 전(잠시 멈춤 뒤 다시 시작 등)에 기다린 부분은 빼지 않는다.
 * 확인 중이면 지금까지, 반려되면 판정 시각까지, 허위로 확인되면 0 (의뢰가 끝남)
 */
export function reportHoldMs(report: FakeReport | null | undefined, windowStart: number, now: number): number {
  if (!report || report.status === 'CONFIRMED') return 0;
  const end = report.decidedAt ? ms(report.decidedAt) : now;
  return Math.max(0, end - Math.max(ms(report.at), windowStart));
}

/** 관리자 화면: 판정 대기가 24시간을 넘었는지 */
export function reportOverdue(report: FakeReport, now: Date): boolean {
  return report.status === 'PENDING' && now.getTime() - ms(report.at) >= REPORT_REVIEW_HOURS * HOUR;
}

/**
 * 허위 매물로 확인된 의뢰에 매칭됐던 중개사는 그 의뢰에 쓴 크레딧 1개를 돌려받는다 (자동, 1번만 — refundCredit이 중복을 막음).
 * 매칭 안 된 곳(요청만 보냄)은 돌려받지 않는다. 바뀐 게 없으면 같은 객체
 */
export function settleFakeRefunds(ws: BrokerWorkspace, market: MockMarket, now: Date): BrokerWorkspace {
  let wallet = ws.wallet;
  for (const s of ws.sent) {
    const offers = market.offers[s.requestId] ?? [];
    if (!confirmedFake(offers)) continue;
    const matched = market.matched[s.requestId]?.offerIds ?? [];
    const own = offers.find((o) => o.id === s.offerId);
    if (matched.includes(s.offerId) || own?.fakeReport) wallet = refundCredit(wallet, s.requestId, now, 'FAKE');
  }
  return wallet === ws.wallet ? ws : { ...ws, wallet };
}
