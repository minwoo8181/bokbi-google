/**
 * 데이터 계약 (zod). 저장소에서 읽은 값은 모두 여기를 거친다 — 지금은 브라우저 저장소, Supabase 때는 DB 행.
 * 규칙: 목록·기록은 깨진 항목만 버리고 나머지는 살린다 (한 줄 때문에 전체를 잃지 않게). 설계 docs/handover/supabase-schema.md §6
 * 앱 타입은 기존 그대로 두고, 스키마가 그 타입을 만족하는지 `z.ZodType<…>`로 컴파일 때 대조한다
 */
import { z } from 'zod';
import type { BrokerApplication } from '@/lib/broker/application';
import type { CreditWallet } from '@/lib/broker/credits';
import type { SentRequest } from '@/lib/broker/feed';
import { DATE_FIELDS, FEE_NOTE_MAX, FEE_REASONS, REPORT_STEPS, type DealEvent } from '@/lib/deal/deal';
import type { ShowingAvailability, VisitBooking } from '@/lib/requests/showing';
import type { BrokerOffer, FakeReport } from '@/lib/requests/types';

const isoTime = z.string().min(1);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const priceManwon = z.number().int().positive().optional();

// ── 거래 기록 이벤트 (종류별 칸까지) ─────────────────────────────

/** deal.ts 목록과 같은지는 schema.test.ts가 대조 */
export const REPORT_STEP_ENUM = z.enum(['PROVISIONAL', 'CONTRACT', 'BALANCE', 'BROKEN']);
export const DATE_FIELD_ENUM = z.enum(['CONTRACT', 'MIDDLE', 'BALANCE']);
export const FEE_REASON_ENUM = z.enum(['AGREED', 'OVERCHARGED', 'OTHER']);
export const DEAL_LISTS = { REPORT_STEPS, DATE_FIELDS, FEE_REASONS };

const base = { id: z.string(), at: z.string() };
export const dealEventSchema: z.ZodType<DealEvent> = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('OWNER_CHECKED'), how: z.enum(['CONFIRMED', 'CALL_CONFIRMED']) }),
  z.object({ ...base, kind: z.literal('REPORT'), step: REPORT_STEP_ENUM, priceManwon }),
  z.object({ ...base, kind: z.literal('ANSWER'), step: REPORT_STEP_ENUM, ok: z.boolean() }),
  z.object({ ...base, kind: z.literal('DATE'), field: DATE_FIELD_ENUM, date: dateKey.nullable(), by: z.literal('OWNER').optional() }),
  z.object({ ...base, kind: z.literal('AD_REMOVED'), ad: z.object({ url: z.string(), postedAt: z.string() }).optional() }),
  z.object({ ...base, kind: z.literal('OWNER_DECLARED'), step: z.enum(['PROVISIONAL', 'CONTRACT']), priceManwon }),
  z.object({ ...base, kind: z.literal('FEE_ANSWER'), kept: z.boolean(), reason: FEE_REASON_ENUM.optional(), note: z.string().max(FEE_NOTE_MAX).optional() }),
  z.object({ ...base, kind: z.literal('REVIEW'), stars: z.number().int().min(1).max(5), chips: z.array(z.string()) }),
  z.object({ ...base, kind: z.literal('PRICE_CHANGED'), priceManwon: z.number().int().positive(), fromManwon: z.number().int().positive(), feeWon: z.number().int().nonnegative() }),
  z.object({ ...base, kind: z.literal('PRICE_NOTIFIED'), priceManwon: z.number().int().positive() }),
]);

// ── 방문 ─────────────────────────────────────────────────────

export const visitSchema: z.ZodType<VisitBooking> = z
  .object({
    id: z.string(),
    offerId: z.string(),
    date: z.string(),
    hour: z.number(),
    createdAt: z.string().optional(),
    canceledAt: z.string().optional(),
    canceledBy: z.enum(['OWNER', 'BROKER', 'SYSTEM']).optional(),
    cancelReason: z.enum(['ELSEWHERE', 'WITHDRAWN', 'PAUSED']).optional(),
    ackedBy: z.array(z.string()).optional(),
  })
  .passthrough();

/** 방문 가능 시간: 모양만 본다 (요일·시간대 값 검사는 showing.ts 규칙이 맡음) */
export const showingSchema = z.object({ weekly: z.record(z.unknown()), blocked: z.array(z.unknown()) }).passthrough() as unknown as z.ZodType<ShowingAvailability>;

// ── 요청 카드 ────────────────────────────────────────────────

export const fakeReportSchema: z.ZodType<FakeReport> = z.object({
  at: isoTime,
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED']),
  decidedAt: z.string().nullable(),
});

/**
 * 요청 카드: 화면이 꼭 쓰는 칸만 검사하고 나머지는 그대로 (예전 저장분 호환).
 * 신고·광고·늦은 이유가 깨졌으면 카드는 살리고 그 칸만 비운다
 */
export const offerSchema = z
  .object({
    id: z.string(),
    order: z.number(),
    arrivedAt: z.string(),
    strengths: z.array(z.string()),
    disclosure: z.object({ officeName: z.string() }).passthrough(),
    ad: z.object({ url: z.string(), postedAt: z.string() }).nullable().catch(null),
    delayNote: z.object({ reason: z.enum(['PHOTO', 'TODAY', 'OWNER_CHECK']), at: z.string() }).nullable().optional().catch(null),
    fakeReport: fakeReportSchema.nullable().optional().catch(null),
    /** 거리 구간 이름만 (좌표·거리 숫자는 저장하지 않음). 이상한 값이면 칩 없음 */
    distanceBand: z.enum(['M500', 'KM1', 'KM2', 'FAR']).nullable().optional().catch(null),
  })
  .passthrough() as unknown as z.ZodType<BrokerOffer>;

// ── 공유 저장소 칸 ───────────────────────────────────────────

export const matchedSchema = z.object({ offerIds: z.array(z.string()), at: z.string() });
export const priceSchema = z.object({
  askingPriceManwon: z.number().int().positive(),
  commissionWon: z.number().int().nonnegative(),
  legalMaxWon: z.number().int().nonnegative(),
});
export const endedSchema =z.object({ reason: z.enum(['SOLD_ELSEWHERE', 'WITHDRAWN']), at: z.string() });
export const pauseSchema = z
  .object({ pausedAt: z.string().nullable().catch(null), reason: z.string().catch(''), resumedAt: z.string().nullable().catch(null) })
  .refine((p) => !!p.pausedAt || !!p.resumedAt);

// ── 중개사 작업 공간 ─────────────────────────────────────────

export const walletSchema = z
  .object({
    balance: z.number(),
    refilledWeek: z.string().nullable().catch(null),
    events: z.array(z.unknown()).catch([]),
  })
  .passthrough() as unknown as z.ZodType<CreditWallet>;

export const sentSchema = z
  .object({
    requestId: z.string(),
    offerId: z.string(),
    sentAt: z.string(),
    strengths: z.array(z.string()),
    snapshot: z.object({}).passthrough(),
  })
  .passthrough() as unknown as z.ZodType<SentRequest>;

// ── 중개사 가입 신청 (예전 저장분은 상태 없음 → 대기 중) ──────────

export const applicationSchema: z.ZodType<BrokerApplication, z.ZodTypeDef, unknown> = z
  .object({
    regNo: z.string().min(1),
    office: z.string().min(1),
    code: z.string().min(1),
    ceo: z.string().optional().default(''),
    strengths: z.array(z.string()).optional().default([]),
    conditions: z.array(z.string()).optional().default([]),
    phone: z.string().optional().default(''),
    submittedAt: z.string().optional().default(''),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional().default('PENDING'),
    reviewedAt: z.string().nullable().optional().default(null),
    rejectReason: z.string().nullable().optional().default(null),
    openYear: z.number().nullable().optional().default(null),
  });

// ── 도우미: 깨진 항목만 버리기 ─────────────────────────────────

/** JSON 문자열 → 값 (깨졌으면 undefined) */
export function parseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** 배열에서 스키마를 통과한 항목만 (배열이 아니면 빈 배열) */
export function listOf<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, v: unknown): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** 객체의 값마다 스키마를 통과한 것만 (객체가 아니면 빈 객체) */
export function recordOf<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, v: unknown): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(v)) return out;
  for (const [k, item] of Object.entries(v)) {
    const r = schema.safeParse(item);
    if (r.success) out[k] = r.data;
  }
  return out;
}
