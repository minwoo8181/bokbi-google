import { describe, expect, it } from 'vitest';
import type { OwnerRequest } from '@/lib/requests/types';
import { accessLines, actionLines } from '../accessLog';

const requests = [{ id: 'r1', complexName: '힐스테이트다산' }] as OwnerRequest[];

describe('accessLines', () => {
  it('최신 순, 단지 이름, 목록에 없는 의뢰는 null, 같은 시각·의뢰도 key가 겹치지 않음', () => {
    const rows = accessLines(
      [
        { at: '2026-10-28T12:00:00.000Z', requestId: 'r1', purpose: 'OWNER_VIEW', reason: null },
        { at: '2026-10-29T05:00:00.000Z', requestId: 'gone', purpose: 'ADMIN_REVIEW', reason: '신고 확인' },
        { at: '2026-10-28T12:00:00.000Z', requestId: 'r1', purpose: 'OWNER_VIEW', reason: null },
      ],
      requests,
    );
    expect(rows.map((r) => [r.purpose, r.complexName])).toEqual([
      ['ADMIN_REVIEW', null],
      ['OWNER_VIEW', '힐스테이트다산'],
      ['OWNER_VIEW', '힐스테이트다산'],
    ]);
    expect(rows[0].reason).toBe('신고 확인');
    expect(new Set(rows.map((r) => r.key)).size).toBe(3);
  });

  it('빈 기록', () => {
    expect(accessLines([], requests)).toEqual([]);
  });
});

describe('actionLines', () => {
  it('최신 순, 단지 이름', () => {
    const rows = actionLines(
      [
        { id: 'a', at: '2026-10-28T00:00:00.000Z', target: 'FAKE_REPORT', requestId: 'r1', offerId: 'o', result: 'CONTACTED' },
        { id: 'b', at: '2026-10-29T00:00:00.000Z', target: 'FEE_OVERCHARGED', requestId: 'x', offerId: 'o', result: 'CONFIRMED' },
      ],
      requests,
    );
    expect(rows.map((r) => [r.key, r.complexName])).toEqual([
      ['b', null],
      ['a', '힐스테이트다산'],
    ]);
  });
});
