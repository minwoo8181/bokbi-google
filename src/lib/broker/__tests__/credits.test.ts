import { describe, expect, it } from 'vitest';
import {
  EMPTY_WALLET,
  WEEKLY_CREDITS,
  answerMoreCredits,
  kstDateKey,
  kstWeekKey,
  nextRefillDate,
  recordMoreCreditsTap,
  refillWeekly,
  refundCredit,
  spendCredit,
} from '../credits';

// 2026-10-26은 월요일
const at = (iso: string) => new Date(iso);

describe('한국 날짜·주', () => {
  it('UTC 15시 이후는 한국 다음 날', () => {
    expect(kstDateKey(at('2026-10-25T14:59:00Z'))).toBe('2026-10-25');
    expect(kstDateKey(at('2026-10-25T15:00:00Z'))).toBe('2026-10-26');
  });

  it('주는 한국 월요일 기준 (일요일 밤은 지난주, 월요일 0시는 새 주)', () => {
    expect(kstWeekKey(at('2026-10-25T14:00:00Z'))).toBe('2026-10-19'); // 일 23시
    expect(kstWeekKey(at('2026-10-25T15:00:00Z'))).toBe('2026-10-26'); // 월 0시
    expect(kstWeekKey(at('2026-11-01T14:59:00Z'))).toBe('2026-10-26'); // 다음 일 23:59
    expect(nextRefillDate(at('2026-10-28T03:00:00Z'))).toBe('2026-11-02');
  });
});

describe('매주 채움', () => {
  it('처음이면 3개, 같은 주에 다시 불러도 그대로', () => {
    const w = refillWeekly(EMPTY_WALLET, at('2026-10-27T01:00:00Z'));
    expect(w.balance).toBe(WEEKLY_CREDITS);
    expect(w.events).toHaveLength(1);
    expect(refillWeekly(w, at('2026-10-29T01:00:00Z'))).toBe(w);
  });

  it('남은 개수에 더하지 않고 3개로 맞춘다 (쌓이지 않음)', () => {
    const w = { balance: 1, refilledWeek: '2026-10-19', events: [] };
    expect(refillWeekly(w, at('2026-10-27T01:00:00Z')).balance).toBe(3);
    const full = { balance: 4, refilledWeek: '2026-10-19', events: [] };
    const r = refillWeekly(full, at('2026-10-27T01:00:00Z'));
    expect(r.balance).toBe(4);
    expect(r.events).toHaveLength(0);
    expect(r.refilledWeek).toBe('2026-10-26');
  });
});

describe('사용·환불', () => {
  const now = at('2026-10-27T01:00:00Z');
  const w = refillWeekly(EMPTY_WALLET, now);

  it('요청 1번에 1개, 0개면 못 쓴다', () => {
    let cur = w;
    for (let i = 0; i < 3; i++) {
      const r = spendCredit(cur, `req-${i}`, now);
      expect(r.ok).toBe(true);
      if (r.ok) cur = r.wallet;
    }
    expect(cur.balance).toBe(0);
    expect(spendCredit(cur, 'req-x', now)).toEqual({ ok: false, error: 'NO_CREDIT' });
  });

  it('환불은 쓴 의뢰만, 한 번만', () => {
    const r = spendCredit(w, 'req-1', now);
    if (!r.ok) throw new Error('spend failed');
    const once = refundCredit(r.wallet, 'req-1', now);
    expect(once.balance).toBe(3);
    expect(refundCredit(once, 'req-1', now)).toBe(once);
    expect(refundCredit(r.wallet, 'req-other', now)).toBe(r.wallet);
  });
});

describe('크레딧 더 받기 (페이크 도어)', () => {
  it('누른 기록에 남은 크레딧·위치를 남기고, 답은 마지막 기록에 붙는다', () => {
    let taps = recordMoreCreditsTap([], { at: '2026-10-27T01:00:00Z', balance: 0, from: 'FEED_EMPTY' });
    taps = answerMoreCredits(taps, 'WATCH_AD');
    taps = recordMoreCreditsTap(taps, { at: '2026-10-28T01:00:00Z', balance: 2, from: 'OFFICE' });
    taps = answerMoreCredits(taps, 'ENOUGH');
    expect(taps.map((t) => [t.from, t.balance, t.answer])).toEqual([
      ['FEED_EMPTY', 0, 'WATCH_AD'],
      ['OFFICE', 2, 'ENOUGH'],
    ]);
    expect(answerMoreCredits([], 'ENOUGH')).toEqual([]);
  });
});
