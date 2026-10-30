/**
 * 행동 기록 이벤트 27개(2026-10-29 방문·단지 검색·자주 묻는 질문·문의·크레딧 고른 항목 추가): 이름·보낸 쪽·props 형식 (설계 docs/handover/phase5-broker-matching.md 5-3 "행동 기록").
 * Supabase `events` 한 테이블과 같은 모양: id, at, name, role, actor_id(로그인 전 익명 id), session_id, request_id, offer_id, props, app_version.
 * props에는 개인정보를 넣지 않는다 (동·호수·전화·이름·주소 X, 단지·평형 id와 금액 구간만) → privacy.ts가 막는다
 */
import { findPii } from './privacy';

export type EventRole = 'owner' | 'broker' | 'system' | 'admin';

type PropSpec =
  | { type: 'int'; min?: number; max?: number; optional?: true }
  | { type: 'number'; min?: number; max?: number; optional?: true }
  | { type: 'boolean'; optional?: true }
  | { type: 'enum'; values: readonly string[]; optional?: true }
  /** 짧은 id·코드만 (자유 글 아님, 40자 이하) */
  | { type: 'id'; optional?: true };

interface EventSpec {
  /** 여러 쪽이 보내는 기록(방문·자주 묻는 질문·문의)은 목록, 첫 번째가 기본 */
  role: EventRole | readonly EventRole[];
  props: Record<string, PropSpec>;
}

const STEPS = ['PROVISIONAL', 'CONTRACT', 'BALANCE', 'BROKEN'] as const;
/** 방문한 화면 종류 (주소 속 번호는 빼고, lib/analytics/visit.ts pageOf) */
export const PAGES = ['HOME', 'ANALYSIS', 'MY_REQUESTS', 'MY_INFO', 'LOGIN', 'AGENT', 'AGENT_REGISTER', 'AGENT_TERMS', 'OTHER'] as const;
export const DEVICES = ['PHONE', 'TABLET', 'DESKTOP'] as const;
/** 문의 주제 (lib/support/inquiries.ts INQUIRY_TOPICS와 같음 — 테스트가 대조) */
const INQUIRY_TOPIC_VALUES = ['CORRECTION', 'REQUEST', 'FEE', 'OTHER'] as const;
/** "크레딧 더 받기" 고른 항목 (lib/broker/credits.ts MORE_CREDITS_ANSWERS와 같음 — 테스트가 대조) */
const MORE_CREDITS_VALUES = ['WATCH_AD', 'REFER_OFFICE', 'ENOUGH'] as const;
const BOTH = ['owner', 'broker'] as const;
/** 다른 곳 계약 때 아쉬웠던 점 (siteContent saleSheet.lostReasons 키와 같음) */
export const LOST_REASONS = ['LOWER_FEE', 'KNOWN_BROKER', 'SLOW_CONTACT', 'FEW_VISITS', 'OTHER'] as const;
export type LostReason = (typeof LOST_REASONS)[number];
const PRICE_BANDS =['UNDER_3', '3_TO_6', '6_TO_9', '9_TO_12', 'OVER_12'] as const; // 억 원 구간

export const EVENT_SPECS = {
  // ── 집주인 ──
  analysis_view: { role: 'owner', props: { complexId: { type: 'id' }, pyeong: { type: 'id' }, tradeType: { type: 'enum', values: ['SALE', 'JEONSE'] } } },
  fee_adjust: { role: 'owner', props: { recommendedPct: { type: 'number', min: 0, max: 100 }, chosenPct: { type: 'number', min: 0, max: 100 } } },
  match_step: { role: 'owner', props: { step: { type: 'int', min: 1, max: 6 }, action: { type: 'enum', values: ['NEXT', 'BACK', 'CLOSE'] } } },
  request_submit: { role: 'owner', props: { discountPct: { type: 'number', min: 0, max: 100 }, priceBand: { type: 'enum', values: PRICE_BANDS } } },
  match_confirm: { role: 'owner', props: { count: { type: 'int', min: 1, max: 3 } } },
  deal_answer: { role: 'owner', props: { step: { type: 'enum', values: STEPS }, ok: { type: 'boolean' } } },
  /** savedManwon: 법정 상한 대비 아낀 복비(만 원 단위로 반올림) — "집주인이 아낀 복비 합계" 지표 */
  fee_answer: { role: 'owner', props: { kept: { type: 'boolean' }, reason: { type: 'enum', values: ['AGREED', 'OVERCHARGED', 'OTHER'], optional: true }, savedManwon: { type: 'int', min: 0, optional: true } } },
  review_submit: { role: 'owner', props: { stars: { type: 'int', min: 1, max: 5 }, chipCount: { type: 'int', min: 0, max: 10 } } },
  /** lostReason: 다른 곳에서 계약했을 때 아쉬웠던 점 (2026-10-27, 이탈 이유 지표) */
  sale_change: {
    role: 'owner',
    props: {
      action: { type: 'enum', values: ['PAUSE', 'RESUME', 'WITHDRAW', 'SOLD_ELSEWHERE'] },
      reasonChip: { type: 'id', optional: true },
      lostReason: { type: 'enum', values: LOST_REASONS, optional: true },
    },
  },
  // ── 중개사 ──
  broker_signup: { role: 'broker', props: { step: { type: 'id' }, result: { type: 'enum', values: ['OK', 'FAIL'] } } },
  feed_view: { role: 'broker', props: {} },
  request_send: { role: 'broker', props: { creditsLeft: { type: 'int', min: 0 } } },
  send_blocked: { role: 'broker', props: { reason: { type: 'enum', values: ['ALREADY_SENT', 'CLOSED', 'TODO_FIRST', 'NO_CREDIT'] } } },
  ad_posted: { role: 'broker', props: { hoursAfterMatch: { type: 'number', min: 0 } } },
  ad_removed: { role: 'broker', props: { hoursAfterAsk: { type: 'number', min: 0 } } },
  visit_saved: { role: 'broker', props: {} },
  deal_report: { role: 'broker', props: { step: { type: 'enum', values: STEPS } } },
  more_credits_tap: { role: 'broker', props: {} },
  more_credits_answer: { role: 'broker', props: { answer: { type: 'enum', values: MORE_CREDITS_VALUES } } },
  // ── 방문·검색·문의 (2026-10-29 추가). 검색어·문의 내용 원문은 남기지 않는다 (대표님) ──
  page_visit: { role: BOTH, props: { page: { type: 'enum', values: PAGES }, device: { type: 'enum', values: DEVICES } } },
  /** 단지를 골랐으면 그 단지 번호, 못 찾았으면 found false */
  complex_search: { role: 'owner', props: { found: { type: 'boolean' }, complexId: { type: 'id', optional: true } } },
  faq_view: { role: BOTH, props: { faqId: { type: 'id' } } },
  inquiry_send: { role: BOTH, props: { topic: { type: 'enum', values: INQUIRY_TOPIC_VALUES } } },
  // ── 시스템 ──
  offer_arrived: { role: 'system', props: { minutesAfterRequest: { type: 'number', min: 0 } } },
  ai_explain: { role: 'system', props: { ok: { type: 'boolean' }, ms: { type: 'int', min: 0 }, errorCode: { type: 'id', optional: true } } },
  external_error: { role: 'system', props: { service: { type: 'enum', values: ['GEMINI', 'VWORLD', 'BUILDING', 'MOLIT', 'SOLAPI'] }, status: { type: 'int', min: 0, max: 999 } } },
  // ── 관리자 ──
  admin_action: {
    role: 'admin',
    props: { action: { type: 'enum', values: ['SIGNUP_APPROVED', 'SIGNUP_REJECTED', 'FAKE_CONFIRMED', 'FAKE_REJECTED', 'FEE_CONFIRMED', 'FEE_REJECTED', 'CONTACTED'] } },
  },
} as const satisfies Record<string, EventSpec>;

export type EventName = keyof typeof EVENT_SPECS;
export const EVENT_NAMES = Object.keys(EVENT_SPECS) as EventName[];

/** 이 기록을 보낼 수 있는 쪽 (첫 번째가 기본) */
export function rolesOf(name: EventName): readonly EventRole[] {
  const r = (EVENT_SPECS as Record<string, EventSpec>)[name].role;
  return typeof r === 'string' ? [r] : r;
}

export type EventProps = Record<string, string | number | boolean>;

export interface AnalyticsEvent {
  id: string;
  at: string;
  name: EventName;
  role: EventRole;
  actorId: string;
  sessionId: string;
  requestId: string | null;
  offerId: string | null;
  props: EventProps;
  appVersion: string;
}

const ID_MAX = 40;
const ID_RE = /^[A-Za-z0-9가-힣_.:~-]+$/;

/** 형식 검사: 이름·보낸 쪽·props 키·타입·범위 + 개인정보. 통과하면 빈 배열 */
export function validateEvent(e: AnalyticsEvent): string[] {
  const errors: string[] = [];
  const spec = (EVENT_SPECS as Record<string, EventSpec>)[e.name];
  if (!spec) return [`unknown event: ${String(e.name)}`];
  const roles = rolesOf(e.name);
  if (!roles.includes(e.role)) errors.push(`role: ${e.role} ≠ ${roles.join('|')}`);
  if (!e.id || !e.actorId || !e.sessionId) errors.push('id/actorId/sessionId required');
  if (Number.isNaN(Date.parse(e.at))) errors.push('at: not a date');
  for (const k of Object.keys(e.props)) if (!(k in spec.props)) errors.push(`props.${k}: unknown`);
  for (const [k, p] of Object.entries(spec.props)) {
    const v = e.props[k];
    if (v === undefined) {
      if (!p.optional) errors.push(`props.${k}: required`);
      continue;
    }
    if (p.type === 'int' || p.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v) || (p.type === 'int' && !Number.isInteger(v))) errors.push(`props.${k}: ${p.type}`);
      else if ((p.min !== undefined && v < p.min) || (p.max !== undefined && v > p.max)) errors.push(`props.${k}: out of range`);
    } else if (p.type === 'boolean') {
      if (typeof v !== 'boolean') errors.push(`props.${k}: boolean`);
    } else if (p.type === 'enum') {
      if (typeof v !== 'string' || !p.values.includes(v)) errors.push(`props.${k}: not in enum`);
    } else if (typeof v !== 'string' || v.length > ID_MAX || !ID_RE.test(v)) errors.push(`props.${k}: id`);
  }
  for (const k of findPii(e.props)) errors.push(`props.${k}: personal info`);
  return errors;
}
