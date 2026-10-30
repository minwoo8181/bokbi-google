import { describe, expect, it } from 'vitest';
import type { DealEvent } from '@/lib/deal/deal';
import { applicationSchema, DATE_FIELD_ENUM, DEAL_LISTS, dealEventSchema, FEE_REASON_ENUM, listOf, offerSchema, recordOf, REPORT_STEP_ENUM, matchedSchema, parseJson } from '../schema';

const ok = (v: unknown) => dealEventSchema.safeParse(v).success;
const e = (kind: string, extra: Record<string, unknown> = {}) => ({ id: 'e1', at: '2026-11-02T03:00:00Z', kind, ...extra });

describe('목록이 규칙 파일과 같다 (한쪽만 바뀌면 실패)', () => {
  it('보고 단계·날짜 칸·복비 사유', () => {
    expect(REPORT_STEP_ENUM.options).toEqual(DEAL_LISTS.REPORT_STEPS);
    expect(DATE_FIELD_ENUM.options).toEqual(DEAL_LISTS.DATE_FIELDS);
    expect(FEE_REASON_ENUM.options).toEqual(DEAL_LISTS.FEE_REASONS);
  });
});

describe('거래 기록 이벤트: 종류별 칸까지', () => {
  it('맞는 예시 8종 통과', () => {
    const good: DealEvent[] = [
      e('OWNER_CHECKED', { how: 'CONFIRMED' }),
      e('REPORT', { step: 'CONTRACT', priceManwon: 82000 }),
      e('ANSWER', { step: 'PROVISIONAL', ok: false }),
      e('DATE', { field: 'BALANCE', date: '2026-12-01', by: 'OWNER' }),
      e('AD_REMOVED', { ad: { url: 'u', postedAt: 'p' } }),
      e('OWNER_DECLARED', { step: 'PROVISIONAL' }),
      e('FEE_ANSWER', { kept: false, reason: 'OVERCHARGED', note: '추가 요구' }),
      e('REVIEW', { stars: 5, chips: ['친절'] }),
    ] as DealEvent[];
    expect(good.filter((x) => !ok(x))).toEqual([]);
  });

  it('틀린 예시 거절: 모르는 종류·빠진 칸·범위·형식', () => {
    const bad = [
      e('NOPE'),
      { kind: 'REPORT', step: 'CONTRACT' },
      e('REPORT', { step: 'MIDDLE' }),
      e('REPORT', { step: 'CONTRACT', priceManwon: 1.5 }),
      e('REPORT', { step: 'CONTRACT', priceManwon: -1 }),
      e('DATE', { field: 'CONTRACT', date: '12/01' }),
      e('DATE', { field: 'CONTRACT', date: null, by: 'BROKER' }),
      e('OWNER_DECLARED', { step: 'BALANCE' }),
      e('FEE_ANSWER', { kept: 'no' }),
      e('FEE_ANSWER', { kept: false, note: 'x'.repeat(81) }),
      e('REVIEW', { stars: 6, chips: [] }),
      e('REVIEW', { stars: 4, chips: [1] }),
      null,
    ];
    expect(bad.filter(ok)).toEqual([]);
  });
});

describe('요청 카드: 깨진 부가 칸은 그 칸만 비우고 카드는 살림', () => {
  const card = { id: 'o1', order: 1, arrivedAt: 't', strengths: [], disclosure: { officeName: 'A', phone: '010' }, ad: null, promise: { kept: 0, total: 0 } };
  it('필수 칸이 없으면 버림, 모르는 칸은 그대로', () => {
    expect(offerSchema.safeParse({ ...card, id: 3 }).success).toBe(false);
    const r = offerSchema.safeParse(card);
    expect(r.success && (r.data as unknown as typeof card).promise).toEqual({ kept: 0, total: 0 });
  });
  it('신고·광고·늦은 이유가 깨졌으면 null', () => {
    const r = offerSchema.safeParse({ ...card, ad: { url: 1 }, fakeReport: { status: 'MAYBE' }, delayNote: { reason: 'X' } });
    expect(r.success && [r.data.ad, r.data.fakeReport, r.data.delayNote]).toEqual([null, null, null]);
  });
});

describe('가입 신청: 예전 저장분은 기본값으로', () => {
  it('상태 없으면 대기 중, 필수 칸 없으면 거절', () => {
    const r = applicationSchema.safeParse({ regNo: 'r', office: 'o', code: '1' });
    expect(r.success && r.data).toMatchObject({ status: 'PENDING', strengths: [], openYear: null, reviewedAt: null });
    expect(applicationSchema.safeParse({ regNo: '', office: 'o', code: '1' }).success).toBe(false);
  });
});

describe('도우미', () => {
  it('목록·객체에서 깨진 것만 버림, 깨진 JSON은 undefined', () => {
    expect(listOf(matchedSchema, [{ offerIds: ['a'], at: 't' }, { offerIds: 'a' }, 3])).toHaveLength(1);
    expect(Object.keys(recordOf(matchedSchema, { a: { offerIds: [], at: 't' }, b: ['x'] }))).toEqual(['a']);
    expect(listOf(matchedSchema, 'x')).toEqual([]);
    expect(parseJson('{oops')).toBeUndefined();
    expect(parseJson(null)).toBeUndefined();
  });
});
