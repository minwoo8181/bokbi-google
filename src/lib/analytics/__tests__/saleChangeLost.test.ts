import { describe, it, expect } from 'vitest';
import { validateEvent, LOST_REASONS, type AnalyticsEvent } from '../events';
import { SITE_CONTENT } from '@/config/siteContent';

const base: AnalyticsEvent = {
  id: 'e1',
  at: '2026-10-27T03:00:00Z',
  name: 'sale_change',
  role: 'owner',
  actorId: 'a1',
  sessionId: 's1',
  requestId: 'r1',
  offerId: null,
  props: { action: 'SOLD_ELSEWHERE' },
  appVersion: 'test',
};

describe('sale_change: 다른 곳 계약 때 아쉬웠던 점', () => {
  it('정해진 이유만 기록된다 (건너뛰면 없음)', () => {
    expect(validateEvent(base)).toEqual([]);
    expect(validateEvent({ ...base, props: { action: 'SOLD_ELSEWHERE', reasonChip: 'ELSEWHERE', lostReason: 'SLOW_CONTACT' } })).toEqual([]);
    expect(validateEvent({ ...base, props: { action: 'SOLD_ELSEWHERE', lostReason: '연락이 늦었어요' } })).not.toEqual([]);
  });
  it('화면 칩 문구와 기록 이유 목록이 같다', () => {
    expect(Object.keys(SITE_CONTENT.myRequests.inProgress.saleSheet.lostReasons)).toEqual([...LOST_REASONS]);
  });
});
