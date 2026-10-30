import { describe, expect, it } from 'vitest';
import type { OwnerRequest } from '@/lib/requests/types';
import { DEFAULT_PUSH_PREFS, isQuietHour, kstParts, planPushes, yesterdayCounts, type PushInput } from '../push';
import type { TodayItem } from '../today';

/** 한국 시각 → Date */
const kst = (s: string) => new Date(`${s}+09:00`);

const item = (key: string, overdue: boolean, kind: TodayItem['kind'] = 'FAKE_REPORT'): TodayItem => ({
  key,
  kind,
  requestId: 'r1',
  offerId: 'o1',
  title: '힐스테이트다산',
  since: '2026-10-28T00:00:00.000Z',
  hours: 30,
  overdue,
});

const base: PushInput = {
  now: kst('2026-10-29T14:00:00'),
  prefs: DEFAULT_PUSH_PREFS,
  items: [],
  issues: [],
  signups: [],
  yesterday: { requests: 3, matched: 2 },
  sent: [],
};

describe('시간', () => {
  it('한국 날짜·시각 (UTC 자정 넘김)', () => {
    expect(kstParts(new Date('2026-10-28T15:30:00.000Z'))).toEqual({ date: '2026-10-29', hour: 0 });
  });
  it('조용한 시간: 22시~8시 (8시 정각은 아님)', () => {
    expect([21, 22, 23, 0, 7, 8].map(isQuietHour)).toEqual([false, true, true, true, true, false]);
  });
});

describe('planPushes', () => {
  it('아침 요약: 9시 이후 하루 한 번, 할 일·기한 지남·어제 숫자', () => {
    const r = planPushes({ ...base, items: [item('a', true), item('b', false)] });
    const morning = r.messages.find((m) => m.kind === 'MORNING')!;
    expect(morning.title).toBe('[복비] 오늘 할 일 2건 (기한 지남 1)');
    expect(morning.body).toBe('어제 새 의뢰 3 · 매칭 2');
    expect(morning.url).toBe('/admin');
    expect(planPushes({ ...base, sent: r.sent }).messages.filter((m) => m.kind === 'MORNING')).toHaveLength(0);
  });

  it('아침 요약: 할 일 0건이어도 보냄, 8시 59분엔 아직', () => {
    expect(planPushes(base).messages.map((m) => m.title)).toEqual(['[복비] 오늘 할 일 0건']);
    expect(planPushes({ ...base, now: kst('2026-10-29T08:59:00') }).messages).toEqual([]);
  });

  it('기한 지남: 일마다 하루 한 번, 해당 탭으로', () => {
    const items = [item('fake:r1:o1', true), item('signup:1', true, 'SIGNUP'), item('c', false)];
    const r = planPushes({ ...base, now: kst('2026-10-29T08:30:00'), items });
    expect(r.messages.map((m) => [m.kind, m.url])).toEqual([
      ['OVERDUE', '/admin?tab=requests'],
      ['OVERDUE', '/admin?tab=brokers'],
    ]);
    expect(r.messages[0].title).toBe('[복비 긴급] 허위 매물 신고');
    expect(r.messages[0].body).toBe('힐스테이트다산 · 기한이 지났어요');
    expect(planPushes({ ...base, now: kst('2026-10-29T08:40:00'), items, sent: r.sent }).messages).toEqual([]);
  });

  it('다음 날엔 같은 일도 다시 (보낸 기록은 오늘 것만 남김)', () => {
    const items = [item('a', true)];
    const day1 = planPushes({ ...base, items });
    const day2 = planPushes({ ...base, now: kst('2026-10-30T14:00:00'), items, sent: day1.sent });
    expect(day2.messages.map((m) => m.kind)).toEqual(['OVERDUE', 'MORNING']);
    expect(day2.sent.every((s) => s.startsWith('2026-10-30:'))).toBe(true);
  });

  it('밤 10시~아침 8시: 긴급만, 나머지는 미뤘다가 8시 뒤에', () => {
    const input = {
      ...base,
      now: kst('2026-10-29T23:00:00'),
      items: [item('a', true)],
      issues: [{ kind: 'KEY_MISSING', id: 'AI' } as const],
      signups: [{ regNo: '1', office: '다산공인' }],
      prefs: { ...DEFAULT_PUSH_PREFS, SIGNUP: true },
    };
    const night = planPushes(input);
    expect(night.messages.map((m) => m.kind)).toEqual(['OVERDUE']);
    const morning = planPushes({ ...input, now: kst('2026-10-30T08:10:00'), sent: night.sent });
    // 날짜가 바뀌어 긴급도 다시, 서비스·가입은 미뤘던 것, 아침 요약은 9시부터
    expect(morning.messages.map((m) => m.kind)).toEqual(['OVERDUE', 'SERVICE', 'SIGNUP']);
  });

  it('서비스: 키 없음·데이터 지남을 하루 한 번 묶음, 반영 전은 안 보냄', () => {
    const r = planPushes({
      ...base,
      issues: [
        { kind: 'KEY_MISSING', id: 'AI' },
        { kind: 'DATA_STALE', id: 'TRADES', days: 9 },
        { kind: 'DATA_PENDING', id: 'LISTINGS' },
      ],
    });
    const s = r.messages.find((m) => m.kind === 'SERVICE')!;
    expect(s.title).toBe('[복비] 서비스 확인 필요 2건');
    expect(s.body).toBe('AI 설명 (Gemini) 키 없음 · 국토부 실거래 9일 지남');
    expect(s.url).toBe('/admin?tab=system');
    expect(planPushes({ ...base, issues: [{ kind: 'DATA_PENDING', id: 'LISTINGS' }] }).messages.some((m) => m.kind === 'SERVICE')).toBe(false);
  });

  it('새 가입 신청: 기본 꺼짐, 켜면 신청마다 한 번', () => {
    const signups = [{ regNo: '41360-1', office: '다산공인' }];
    expect(planPushes({ ...base, signups }).messages.some((m) => m.kind === 'SIGNUP')).toBe(false);
    const on = planPushes({ ...base, signups, prefs: { ...DEFAULT_PUSH_PREFS, SIGNUP: true } });
    expect(on.messages.find((m) => m.kind === 'SIGNUP')).toMatchObject({ title: '[복비] 새 가입 신청', body: '다산공인 · 48시간 안에 확인 전화', url: '/admin?tab=brokers' });
  });

  it('끈 종류는 보내지 않고, 보낸 것으로도 남기지 않음 (켜면 그날 바로)', () => {
    const prefs = { MORNING: false, OVERDUE: false, SERVICE: false, SIGNUP: false };
    const off = planPushes({ ...base, prefs, items: [item('a', true)] });
    expect(off).toEqual({ messages: [], sent: [] });
  });
});

describe('yesterdayCounts', () => {
  it('어제(한국 날짜) 생긴 의뢰·매칭', () => {
    const r = (createdAt: string, matchedAt: string | null) => ({ createdAt, matchedAt }) as OwnerRequest;
    const list = [
      r('2026-10-28T00:00:00+09:00', '2026-10-28T23:59:00+09:00'),
      r('2026-10-28T23:59:00+09:00', null),
      r('2026-10-29T00:00:00+09:00', '2026-10-29T01:00:00+09:00'),
      r('2026-10-27T23:00:00+09:00', '2026-10-28T09:00:00+09:00'),
    ];
    expect(yesterdayCounts(list, kst('2026-10-29T09:00:00'))).toEqual({ requests: 2, matched: 2 });
  });
});
