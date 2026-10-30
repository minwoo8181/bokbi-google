/**
 * 관리자 "오늘 처리할 일" (결정론·순수 함수, 설계 docs/handover/phase5-broker-matching.md 5-3).
 * 새 판정 규칙을 만들지 않고 기존 규칙 함수만 쓴다: 가입(application) · 허위 매물(fakeReport) · 복비 사유(dealState) ·
 * 광고 내림 기한(removeAdHoursLeft) · 받는 중 시간(effectiveStage·hoursLeft)
 * 목업: 같은 브라우저 저장소 기준. Supabase 연결 시 같은 함수에 전체 목록을 넣는다
 */
import { CALL_DEADLINE_HOURS, hoursSince, type BrokerApplication } from '@/lib/broker/application';
import { REPORT_REVIEW_HOURS, reportOverdue } from '@/lib/broker/fakeReport';
import { dealState, removeAdHoursLeft, removeAdSince, REMOVE_AD_HOURS, type RequestDeals } from '@/lib/deal/deal';
import { effectiveStage, hoursLeft, RECEIVING_HOURS } from '@/lib/requests/stage';
import type { OwnerRequest } from '@/lib/requests/types';
import { maskPhone, type PrivacyRequest } from '@/lib/privacy/myInfo';
import type { Inquiry } from '@/lib/support/inquiries';
import { isResolved, type AdminAction } from './adminLog';

export type TodayKind = 'SIGNUP' | 'FAKE_REPORT' | 'FEE_OVERCHARGED' | 'INQUIRY' | 'WITHDRAW' | 'REMOVE_AD_LATE' | 'NO_OFFERS';

/** 요청 0곳 의뢰를 할 일로 올리는 시각 (받는 48시간의 절반) */
export const NO_OFFER_ALERT_HOURS = 24;

export interface TodayItem {
  /** 화면 key·처리 기록 대상 (같은 일은 같은 key) */
  key: string;
  kind: TodayKind;
  requestId: string | null;
  offerId: string | null;
  /** 단지 이름 또는 사무소 이름 (동·호수·연락처 없음) */
  title: string;
  /** 일이 생긴 시각 */
  since: string;
  /** 생긴 뒤 지난 시간 (시간, 내림) */
  hours: number;
  /** 기한이 지났으면 빨강, 맨 위 */
  overdue: boolean;
  /** 날 단위 기한이 있는 일(탈퇴 요청 10일)만: 남은 날 (기한 지나면 0) */
  daysLeft?: number;
}

export interface TodayInput {
  /** 예전 목업 한 건 (applications가 있으면 그것을 씀) */
  application: BrokerApplication | null;
  /** 가입 신청 전체 (A2'': 관리자 목록, Supabase는 모든 사무소) */
  applications?: Pick<BrokerApplication, 'regNo' | 'office' | 'submittedAt' | 'status'>[];
  requests: OwnerRequest[];
  deals: Record<string, RequestDeals>;
  log: AdminAction[];
  now: Date;
  /** 탈퇴 요청 (내 정보 관리, 처리방침 8조 10일). 없으면 빈 목록 */
  privacy?: PrivacyRequest[];
  /** 문의하기 (답 안 한 것만 할 일로, 10일 기한) */
  inquiries?: Inquiry[];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const sinceHours = (iso: string, now: Date) => hoursSince(iso, now);

export function todayItems({ application, applications, requests, deals, log, now, privacy = [], inquiries = [] }: TodayInput): TodayItem[] {
  const out: TodayItem[] = [];

  // 문의: 10일 안에 답변. 휴대폰은 가려서
  for (const q of inquiries) {
    if (q.answer) continue;
    const left = Date.parse(q.dueAt) - now.getTime();
    out.push({ key: `inquiry:${q.id}`, kind: 'INQUIRY', requestId: q.requestId, offerId: null, title: maskPhone(q.phone), since: q.at, hours: sinceHours(q.at, now), overdue: left <= 0, daysLeft: Math.max(0, Math.ceil(left / DAY)) });
  }

  // 탈퇴 요청: 본인 확인 뒤 10일 안에 처리. 휴대폰은 가려서 (010-12**-5678)
  for (const p of privacy) {
    const left = Date.parse(p.dueAt) - now.getTime();
    out.push({ key: `withdraw:${p.id}`, kind: 'WITHDRAW', requestId: null, offerId: null, title: maskPhone(p.phone), since: p.at, hours: sinceHours(p.at, now), overdue: left <= 0, daysLeft: Math.max(0, Math.ceil(left / DAY)) });
  }

  // 가입 확인 대기: 신청자에게 "48시간 안에 확인 전화"라고 안내함
  for (const a of applications ?? (application ? [application] : [])) {
    if (a.status !== 'PENDING') continue;
    const hours = sinceHours(a.submittedAt, now);
    out.push({ key: `signup:${a.regNo}`, kind: 'SIGNUP', requestId: null, offerId: null, title: a.office, since: a.submittedAt, hours, overdue: hours >= CALL_DEADLINE_HOURS });
  }

  for (const r of requests) {
    const byOffer = deals[r.id] ?? {};

    // 허위 매물 신고: 판정 전, 24시간 넘으면 빨강 (그동안 그 중개사 광고 시간은 멈춰 있음)
    for (const o of r.offers) {
      if (o.fakeReport?.status !== 'PENDING') continue;
      out.push({ key: `fake:${r.id}:${o.id}`, kind: 'FAKE_REPORT', requestId: r.id, offerId: o.id, title: r.complexName, since: o.fakeReport.at, hours: sinceHours(o.fakeReport.at, now), overdue: reportOverdue(o.fakeReport, now) });
    }

    // 복비 "중개사가 더 요구": 집주인이 고른 사유, 관리자가 확인·반려로 끝내기 전까지
    for (const [offerId, evs] of Object.entries(byOffer)) {
      if (dealState(evs).feeReason !== 'OVERCHARGED' || isResolved(log, 'FEE_OVERCHARGED', r.id, offerId)) continue;
      const at = evs.find((e) => e.kind === 'FEE_ANSWER')?.at ?? now.toISOString();
      const hours = sinceHours(at, now);
      out.push({ key: `fee:${r.id}:${offerId}`, kind: 'FEE_OVERCHARGED', requestId: r.id, offerId, title: r.complexName, since: at, hours, overdue: hours >= REPORT_REVIEW_HOURS });
    }

    // 광고 내림 기한 지남: 중개사 화면 빨강(새 요청 잠금)과 같은 판정
    for (const o of r.offers) {
      const ctx = { request: r, deals: byOffer, offerId: o.id };
      if (removeAdHoursLeft(ctx, now) !== 0) continue;
      const asked = removeAdSince(ctx) ?? now.toISOString();
      const due = new Date(new Date(asked).getTime() + REMOVE_AD_HOURS * HOUR).toISOString();
      out.push({ key: `removeAd:${r.id}:${o.id}`, kind: 'REMOVE_AD_LATE', requestId: r.id, offerId: o.id, title: r.complexName, since: due, hours: sinceHours(due, now), overdue: true });
    }

    // 24시간째 요청 0곳: 받는 중인 의뢰만 (끝난 의뢰·요청이 온 의뢰 제외)
    if (r.offers.length === 0 && effectiveStage(r, now.getTime()).stage === 'RECEIVING') {
      const elapsed = RECEIVING_HOURS - hoursLeft(r.createdAt, now.getTime());
      if (elapsed >= NO_OFFER_ALERT_HOURS)
        out.push({ key: `noOffers:${r.id}`, kind: 'NO_OFFERS', requestId: r.id, offerId: null, title: r.complexName, since: r.createdAt, hours: sinceHours(r.createdAt, now), overdue: false });
    }
  }

  // 기한 지난 것 → 오래된 것 순
  return out.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.since.localeCompare(b.since));
}

/** 시간 단위 기한이 있는 일: 신청 48시간 안 확인 전화, 신고·복비 사유 24시간 안 판정 */
const DEADLINE_HOURS: Partial<Record<TodayKind, number>> = { SIGNUP: CALL_DEADLINE_HOURS, FAKE_REPORT: REPORT_REVIEW_HOURS, FEE_OVERCHARGED: REPORT_REVIEW_HOURS };

/** "곧 할 일" 오른쪽 칩: 남은 시간 또는 남은 날. 기한이 없는 일은 null */
export function deadlineLeft(item: TodayItem): { unit: 'HOURS' | 'DAYS'; n: number } | null {
  if (item.daysLeft !== undefined) return { unit: 'DAYS', n: item.daysLeft };
  const limit = DEADLINE_HOURS[item.kind];
  return limit === undefined ? null : { unit: 'HOURS', n: Math.max(0, limit - item.hours) };
}

/** 탭 배지·요약: 종류별 개수와 빨강 개수 */
export function todayCounts(items: TodayItem[]): { total: number; overdue: number; byKind: Record<TodayKind, number> } {
  const byKind: Record<TodayKind, number> = { SIGNUP: 0, FAKE_REPORT: 0, FEE_OVERCHARGED: 0, INQUIRY: 0, WITHDRAW: 0, REMOVE_AD_LATE: 0, NO_OFFERS: 0 };
  for (const i of items) byKind[i.kind] += 1;
  return { total: items.length, overdue: items.filter((i) => i.overdue).length, byKind };
}
