import { describe, expect, it } from 'vitest';
import type { DealEvent, DealEventBody } from '../deal';
import { promiseStats } from '../settle';

const t0 = Date.parse('2026-11-02T03:00:00Z');
let seq = 0;
const ev = (h: number, body: DealEventBody): DealEvent => ({ id: `e${seq++}`, at: new Date(t0 + h * 3_600_000).toISOString(), ...body }) as DealEvent;

/** 중개사가 계약을 알리고 날짜를 직접 넣은 거래. fee = 집주인 복비 답 */
const contracted = (fee: boolean | null, extra: DealEvent[] = []): DealEvent[] => [
  ev(0, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }),
  ev(0, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }),
  ev(1, { kind: 'REPORT', step: 'CONTRACT' }),
  ev(2, { kind: 'ANSWER', step: 'CONTRACT', ok: true }),
  ...(fee === null ? [] : [ev(3, { kind: 'FEE_ANSWER', kept: fee })]),
  ...extra,
];

describe('사무소 실적 (A10)', () => {
  it('약속 이행 = 합의 복비 그대로 + 중개사가 계약·날짜를 직접. 계약까지 간 거래는 모두 total', () => {
    const stats = promiseStats([
      contracted(true), // 이행
      contracted(false), // 복비 다름: 계약은 맞지만 이행 아님
      contracted(null), // 복비 답 전
      [ev(0, { kind: 'OWNER_DECLARED', step: 'CONTRACT' }), ev(1, { kind: 'FEE_ANSWER', kept: true })], // 집주인이 직접 알림
      [ev(0, { kind: 'REPORT', step: 'PROVISIONAL' })], // 가계약 확인 전: 계약 아님
      [], // 매칭만
    ]);
    expect(stats).toEqual({ kept: 1, total: 4 });
  });

  it('잔금까지 끝나도 이행 그대로, 기록이 없으면 0/0 (가짜 숫자 없음)', () => {
    const done = contracted(true, [ev(4, { kind: 'REPORT', step: 'BALANCE' }), ev(5, { kind: 'ANSWER', step: 'BALANCE', ok: true })]);
    expect(promiseStats([done])).toEqual({ kept: 1, total: 1 });
    expect(promiseStats([])).toEqual({ kept: 0, total: 0 });
  });
});
