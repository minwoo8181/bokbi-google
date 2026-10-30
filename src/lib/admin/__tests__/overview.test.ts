import { describe, expect, it } from 'vitest';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { OwnerRequest } from '@/lib/requests/types';
import { complexRanking, matchesQuery, nowOverview, penetration, serviceIssues } from '../overview';
import { deadlineLeft, todayCounts, todayItems, type TodayItem } from '../today';
import type { FreshnessRow } from '../dataFreshness';

const H = 3_600_000;
const now = new Date('2026-11-02T03:00:00Z');
const ago = (h: number) => new Date(now.getTime() - h * H).toISOString();

const req = (id: string, name: string, stage: OwnerRequest['stage'], over: Partial<OwnerRequest> = {}): OwnerRequest => ({
  ...demoRequest(now),
  id,
  aptId: name,
  complexName: name,
  stage,
  createdAt: ago(2),
  matchedOfferIds: stage === 'RECEIVING' || stage === 'ENDED' ? [] : ['offer-1'],
  ...over,
});

describe('지금 현황', () => {
  it('받는 중·진행 중·계약을 따로 센다 (48시간 지난 받는 중은 끝남)', () => {
    const list = [req('a', 'A', 'RECEIVING'), req('b', 'A', 'RECEIVING', { createdAt: ago(49) }), req('c', 'B', 'IN_PROGRESS'), req('d', 'B', 'CONTRACTED'), req('e', 'C', 'ENDED')];
    expect(nowOverview(list, now)).toEqual({ waiting: 1, inDeal: 1, contracted: 1 });
  });
  it('의뢰가 없으면 0', () => expect(nowOverview([], now)).toEqual({ waiting: 0, inDeal: 0, contracted: 0 }));
});

describe('다산동에 얼마나 퍼졌나', () => {
  it('가입 중개사 비율과 의뢰가 들어온 단지 수 (같은 단지는 한 번)', () => {
    const p = penetration({ joinedOffices: 12, totalOffices: 336, requests: [req('a', 'A', 'RECEIVING'), req('b', 'A', 'ENDED'), req('c', 'B', 'IN_PROGRESS')], totalComplexes: 58 });
    expect(p).toMatchObject({ joinedOffices: 12, complexesWithRequests: 2, totalComplexes: 58 });
    expect(p.officeRate).toBeCloseTo(12 / 336);
    expect(p.complexRate).toBeCloseTo(2 / 58);
  });
  it('전체가 0이면 비율 null, 1을 넘지 않음', () => {
    expect(penetration({ joinedOffices: 3, totalOffices: 0, requests: [], totalComplexes: 0 })).toMatchObject({ officeRate: null, complexRate: null });
    expect(penetration({ joinedOffices: 5, totalOffices: 2, requests: [], totalComplexes: 1 }).officeRate).toBe(1);
  });
  it('단지 id가 없으면 이름으로 묶는다', () => {
    const list = [req('a', 'A', 'RECEIVING', { aptId: null }), req('b', 'A', 'RECEIVING', { aptId: null })];
    expect(penetration({ joinedOffices: 0, totalOffices: 336, requests: list, totalComplexes: 58 }).complexesWithRequests).toBe(1);
  });
});

describe('단지 순위', () => {
  const list = [
    req('a1', '가단지', 'RECEIVING'),
    req('a2', '가단지', 'IN_PROGRESS'),
    req('a3', '가단지', 'ENDED'),
    req('b1', '나단지', 'CONTRACTED'),
    req('b2', '나단지', 'IN_PROGRESS'),
    req('c1', '다단지', 'RECEIVING'),
  ];
  it('의뢰 많은 순 + 매칭 비율', () => {
    expect(complexRanking(list, 'requests')).toEqual([
      { name: '가단지', requests: 3, matched: 1, matchRate: 1 / 3 },
      { name: '나단지', requests: 2, matched: 2, matchRate: 1 },
      { name: '다단지', requests: 1, matched: 0, matchRate: 0 },
    ]);
  });
  it('매칭 많은 순, 매칭 0 단지는 빠짐, 개수 제한', () => {
    expect(complexRanking(list, 'matched').map((r) => r.name)).toEqual(['나단지', '가단지']);
    expect(complexRanking(list, 'requests', 1)).toHaveLength(1);
  });
  it('같은 수면 이름 순', () => {
    expect(complexRanking([req('x', '하단지', 'RECEIVING'), req('y', '가단지', 'RECEIVING')], 'requests').map((r) => r.name)).toEqual(['가단지', '하단지']);
  });
});

describe('서비스 상태: 문제만', () => {
  const row = (id: FreshnessRow['id'], stale: boolean, pending?: boolean): FreshnessRow => ({ id, date: '2026-10-24', days: stale ? 9 : 2, stale, pending });
  it('키 없음 → 데이터 지남 → 반영 전', () => {
    expect(
      serviceIssues(
        [{ id: 'AI', set: true }, { id: 'SOLAPI', set: false }],
        [row('SCREEN', false), row('LISTINGS', false, true), row('TRADES', true)],
      ),
    ).toEqual([{ kind: 'KEY_MISSING', id: 'SOLAPI' }, { kind: 'DATA_STALE', id: 'TRADES', days: 9 }, { kind: 'DATA_PENDING', id: 'LISTINGS' }]);
  });
  it('문제 없으면 빈 목록', () => expect(serviceIssues([{ id: 'AI', set: true }], [row('SCREEN', false)])).toEqual([]));
});

describe('탈퇴 요청 → 오늘 할 일', () => {
  const p = (atHoursAgo: number) => {
    const at = ago(atHoursAgo);
    return { id: `W-${atHoursAgo}`, kind: 'WITHDRAW' as const, phone: '01012345678', at, dueAt: new Date(Date.parse(at) + 10 * 24 * H).toISOString() };
  };
  const base = { application: null, requests: [], deals: {}, log: [], now };
  it('가린 번호와 남은 날', () => {
    expect(todayItems({ ...base, privacy: [p(24)] })).toEqual([
      expect.objectContaining({ kind: 'WITHDRAW', title: '010-12**-5678', overdue: false, daysLeft: 9, hours: 24 }),
    ]);
  });
  it('10일이 지나면 빨강, 남은 날 0', () => {
    expect(todayItems({ ...base, privacy: [p(240)] })[0]).toMatchObject({ overdue: true, daysLeft: 0 });
    expect(todayCounts(todayItems({ ...base, privacy: [p(240), p(1)] }))).toMatchObject({ total: 2, overdue: 1, byKind: { WITHDRAW: 2 } });
  });
  it('없으면 그대로', () => expect(todayItems(base)).toEqual([]));
});

describe('가입 확인 대기 → 오늘 할 일 (여러 건)', () => {
  const a = (regNo: string, hoursAgo: number, status: 'PENDING' | 'APPROVED' = 'PENDING') => ({ regNo, office: `사무소${regNo}`, submittedAt: ago(hoursAgo), status });
  it('대기만, 48시간 지나면 빨강, 목록이 있으면 예전 한 건은 무시', () => {
    const items = todayItems({ application: null, applications: [a('1', 50), a('2', 3), a('3', 10, 'APPROVED')], requests: [], deals: {}, log: [], now });
    expect(items.map((i) => [i.key, i.overdue])).toEqual([
      ['signup:1', true],
      ['signup:2', false],
    ]);
  });
});

describe('의뢰 찾기', () => {
  const r = { id: 'BK-0012', complexName: '다산자이 아이비플레이스' };
  it('단지 이름·번호, 띄어쓰기·대소문자 무시', () => {
    expect(matchesQuery(r, '아이비')).toBe(true);
    expect(matchesQuery(r, '자이아이비')).toBe(true);
    expect(matchesQuery(r, 'bk-0012')).toBe(true);
    expect(matchesQuery(r, '힐스테이트')).toBe(false);
    expect(matchesQuery(r, '  ')).toBe(true);
  });
});

describe('곧 할 일 남은 기한', () => {
  const item = (kind: TodayItem['kind'], hours: number, daysLeft?: number): TodayItem => ({ key: 'k', kind, requestId: null, offerId: null, title: 't', since: ago(hours), hours, overdue: false, daysLeft });
  it('가입 48시간, 신고·복비 24시간, 탈퇴는 날', () => {
    expect(deadlineLeft(item('SIGNUP', 6))).toEqual({ unit: 'HOURS', n: 42 });
    expect(deadlineLeft(item('FAKE_REPORT', 20))).toEqual({ unit: 'HOURS', n: 4 });
    expect(deadlineLeft(item('FEE_OVERCHARGED', 30))).toEqual({ unit: 'HOURS', n: 0 });
    expect(deadlineLeft(item('WITHDRAW', 24, 9))).toEqual({ unit: 'DAYS', n: 9 });
  });
  it('기한 없는 일은 null', () => expect(deadlineLeft(item('NO_OFFERS', 30))).toBeNull());
});
