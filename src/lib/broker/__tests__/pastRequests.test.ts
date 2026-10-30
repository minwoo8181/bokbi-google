import { describe, expect, it } from 'vitest';
import { listingBucket, PAST_VISIBLE_DAYS } from '../pastRequests';

const sentAt = '2026-10-01T00:00:00Z';
const at = (ms: number) => Date.parse(sentAt) + ms;
const DAY = 86_400_000;

describe('listingBucket (내 매물 / 지난 요청 나누기)', () => {
  it('선택됨은 늘 진행 중, 끝났어도 할 일이 남은 거래(광고 내림 등)는 진행 중', () => {
    expect(listingBucket('SELECTED', null, sentAt, at(100 * DAY))).toBe('PROGRESS');
    expect(listingBucket('SELECTED', 'DONE', sentAt, at(100 * DAY))).toBe('PROGRESS');
    expect(listingBucket('STOPPED', 'ACTION', sentAt, at(1 * DAY))).toBe('PROGRESS');
    expect(listingBucket('RELEASED', 'RISK', sentAt, at(1 * DAY))).toBe('PROGRESS');
  });

  it('집주인이 고르는 중은 결과 기다리는 요청', () => {
    expect(listingBucket('WAITING', null, sentAt, at(1 * DAY))).toBe('WAITING');
  });

  it('끝난 요청은 지난 요청, 경계: 보낸 지 정확히 30일은 보이고 그 뒤는 숨김', () => {
    expect(PAST_VISIBLE_DAYS).toBe(30);
    for (const st of ['NOT_SELECTED', 'CLOSED', 'STOPPED', 'RELEASED'] as const) {
      expect(listingBucket(st, null, sentAt, at(0)), st).toBe('PAST');
      expect(listingBucket(st, 'DONE', sentAt, at(30 * DAY)), st).toBe('PAST');
      expect(listingBucket(st, null, sentAt, at(30 * DAY + 1)), st).toBe('HIDDEN');
    }
  });
});
