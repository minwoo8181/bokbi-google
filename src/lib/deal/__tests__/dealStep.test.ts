import { describe, expect, it } from 'vitest';
import { DEAL_STEPS, dealStep } from '../dealStep';

const none = { pending: null, review: null };
const pending = { pending: { step: 'CONTRACT' as const, at: '2026-10-27T00:00:00Z' }, review: null };
const reviewed = { pending: null, review: { stars: 5, chips: [], at: '2026-12-20T00:00:00Z' } };

describe('dealStep', () => {
  it('매칭 직후 광고 전 = 광고 단계(2)', () => expect(dealStep('MATCHED', none, false)).toBe(2));
  it('광고를 올리면 계약 단계(3)', () => expect(dealStep('MATCHED', none, true)).toBe(3));
  it('광고 전이라도 계약을 알렸으면 계약 단계(3)', () => expect(dealStep('MATCHED', pending, false)).toBe(3));
  it('가계약 = 계약 단계(3)', () => expect(dealStep('PROVISIONAL', none, true)).toBe(3));
  it('계약 확정 = 잔금 단계(4)', () => expect(dealStep('CONTRACTED', none, true)).toBe(4));
  it('잔금 끝, 후기 전 = 후기 단계(5)', () => expect(dealStep('DONE', none, true)).toBe(5));
  it('후기까지 = 전부 끝(6)', () => expect(dealStep('DONE', reviewed, true)).toBe(DEAL_STEPS + 1));
  it.each(['BROKEN', 'CLOSED_ELSEWHERE', 'RELEASED'] as const)('%s = 숨김(0)', (phase) => expect(dealStep(phase, reviewed, true)).toBe(0));
});
