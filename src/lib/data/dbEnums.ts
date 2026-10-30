/**
 * DB check 목록 ↔ 앱 상태 목록 대조표 (supabase/migrations, 대조는 __tests__/db.test.ts).
 * 앱 유니온 타입에서 값이 하나라도 빠지면 컴파일 오류 → 앱에 상태를 추가하면 마이그레이션도 같이 고치게 된다.
 */
import type { ConsentKey } from '@/components/analysis/ConsentGroup';
import { ADMIN_RESULTS, type AdminTargetKind } from '@/lib/admin/adminLog';
import { EVENT_NAMES, type EventRole } from '@/lib/analytics/events';
import type { ApplicationStatus } from '@/lib/broker/application';
import type { CreditEvent, CreditEventKind } from '@/lib/broker/credits';
import { DATE_FIELDS, FEE_REASONS, REPORT_STEPS, type DealEvent } from '@/lib/deal/deal';
import { VISIT_HOURS, type VisitBooking } from '@/lib/requests/showing';
import type { DelayReason, EndedReason, FakeReportStatus, Occupancy, OwnerRequest, RequestStage } from '@/lib/requests/types';
import type { ContactPurpose } from './repo';

type Missing<T, A extends readonly unknown[]> = Exclude<T, A[number]>;

/** T의 값을 빠짐없이 나열한 배열 (빠지면 { missing: 빠진 값 } 타입 오류) */
const allOf =
  <T extends string>() =>
  <const A extends readonly T[]>(values: A & ([Missing<T, A>] extends [never] ? unknown : { missing: Missing<T, A> })): readonly T[] =>
    values;

type DealKind = DealEvent['kind'];
type OwnerCheckHow = Extract<DealEvent, { kind: 'OWNER_CHECKED' }>['how'];

export interface DbCheck {
  /** 마이그레이션의 constraint 이름 */
  constraint: string;
  values: readonly (string | number)[];
}

export const DB_CHECKS: DbCheck[] = [
  { constraint: 'requests_stage_check', values: allOf<RequestStage>()(['RECEIVING', 'IN_PROGRESS', 'CONTRACTED', 'ENDED']) },
  {
    constraint: 'requests_ended_reason_check',
    values: allOf<EndedReason>()(['EXPIRED', 'CANCELLED', 'WITHDRAWN', 'SOLD_ELSEWHERE', 'RELEASED', 'DEAL_BROKEN', 'FAKE_CONFIRMED']),
  },
  { constraint: 'requests_occupancy_check', values: allOf<Occupancy>()(['VACANT', 'OWNER', 'TENANT']) },
  { constraint: 'requests_trade_type_check', values: allOf<OwnerRequest['tradeType']>()(['매매', '전세']) },
  { constraint: 'broker_offices_status_check', values: allOf<ApplicationStatus>()(['PENDING', 'APPROVED', 'REJECTED']) },
  { constraint: 'offers_delay_reason_check', values: allOf<DelayReason>()(['PHOTO', 'TODAY', 'OWNER_CHECK']) },
  { constraint: 'offers_fake_report_status_check', values: allOf<FakeReportStatus>()(['PENDING', 'CONFIRMED', 'REJECTED']) },
  {
    constraint: 'deal_events_kind_check',
    values: allOf<DealKind>()(['OWNER_CHECKED', 'REPORT', 'ANSWER', 'DATE', 'AD_REMOVED', 'OWNER_DECLARED', 'FEE_ANSWER', 'REVIEW', 'PRICE_CHANGED', 'PRICE_NOTIFIED']),
  },
  { constraint: 'deal_events_how_check', values: allOf<OwnerCheckHow>()(['CONFIRMED', 'CALL_CONFIRMED']) },
  { constraint: 'deal_events_step_check', values: REPORT_STEPS },
  { constraint: 'deal_events_declared_step_check', values: allOf<Extract<DealEvent, { kind: 'OWNER_DECLARED' }>['step']>()(['PROVISIONAL', 'CONTRACT']) },
  { constraint: 'deal_events_date_field_check', values: DATE_FIELDS },
  { constraint: 'deal_events_fee_reason_check', values: FEE_REASONS },
  { constraint: 'visits_hour_check', values: VISIT_HOURS },
  { constraint: 'visits_canceled_by_check', values: allOf<NonNullable<VisitBooking['canceledBy']>>()(['OWNER', 'BROKER', 'SYSTEM']) },
  { constraint: 'visits_cancel_reason_check', values: allOf<NonNullable<VisitBooking['cancelReason']>>()(['ELSEWHERE', 'WITHDRAWN', 'PAUSED']) },
  { constraint: 'credit_ledger_kind_check', values: allOf<CreditEventKind>()(['WEEKLY', 'SPEND', 'REFUND']) },
  { constraint: 'credit_ledger_reason_check', values: allOf<NonNullable<CreditEvent['reason']>>()(['FAKE', 'DEAL']) },
  { constraint: 'consents_key_check', values: allOf<ConsentKey>()(['TERMS', 'COLLECT', 'PROVIDE']) },
  { constraint: 'events_name_check', values: EVENT_NAMES },
  { constraint: 'events_role_check', values: allOf<EventRole>()(['owner', 'broker', 'system', 'admin']) },
  { constraint: 'access_log_purpose_check', values: allOf<ContactPurpose>()(['OWNER_VIEW', 'MATCHED_BROKER', 'ADMIN_REVIEW']) },
  // 가입 승인·반려는 DB 처리 기록에만 (앱 AdminTargetKind 2개 + BROKER_SIGNUP)
  { constraint: 'admin_actions_target_check', values: [...allOf<AdminTargetKind>()(['FAKE_REPORT', 'FEE_OVERCHARGED']), 'BROKER_SIGNUP'] },
  { constraint: 'admin_actions_result_check', values: ADMIN_RESULTS },
];
