import { describe, it, expect } from 'vitest';
import { heroVisit, ownerTodoItems } from '../ownerTodo';
import type { CardStrip } from '../deal';
import type { VisitBooking } from '@/lib/requests/showing';

// 2026-10-27 12:00 KST
const now = new Date('2026-10-27T03:00:00Z');
const strip = (tone: CardStrip['tone'], key: CardStrip['key'], vars: CardStrip['vars'] = {}): CardStrip => ({ tone, key, vars });
const visit = (id: string, offerId: string, date: string, hour: number, extra: Partial<VisitBooking> = {}): VisitBooking => ({ id, offerId, date, hour, ...extra });

describe('ownerTodoItems: 지금 확인할 일', () => {
  it('집주인이 답해야 하는 띠(ACTION)는 빨강, 중개사 쪽 기한(광고 등)은 넣지 않는다', () => {
    const items = ownerTodoItems(
      [
        { offerId: 'a', strip: strip('ACTION', 'CONFIRM', { step: 'PROVISIONAL' }) },
        { offerId: 'b', strip: strip('RISK', 'AD_OVERDUE') },
        { offerId: 'c', strip: strip('GOOD', 'AD_LIVE', { day: 1 }) },
      ],
      [],
      now,
    );
    expect(items.map((i) => [i.offerId, i.level, i.strip.key])).toEqual([['a', 'NOW', 'CONFIRM']]);
  });

  it('방문: 24시간 안이면 빨강, 그보다 멀면 노랑. 지난 방문·취소·매칭 안 된 곳은 빼기', () => {
    const items = ownerTodoItems(
      [{ offerId: 'a', strip: strip('GOOD', 'AD_LIVE') }, { offerId: 'b', strip: strip('GOOD', 'AD_LEFT') }],
      [
        visit('v1', 'a', '2026-10-29', 18),
        visit('v2', 'b', '2026-10-28', 10),
        visit('v3', 'a', '2026-10-27', 9),
        visit('v4', 'a', '2026-10-30', 15, { canceledAt: '2026-10-26T00:00:00Z', canceledBy: 'OWNER' }),
        visit('v5', 'zzz', '2026-10-28', 11),
      ],
      now,
    );
    expect(items.map((i) => [i.offerId, i.level, i.strip.key, i.strip.vars.date])).toEqual([
      ['b', 'NOW', 'VISIT_SOON', '2026-10-28'],
      ['a', 'SOON', 'VISIT_ON', '2026-10-29'],
    ]);
  });

  it('계약일·잔금일이 다가오면 노랑, 빨강이 항상 먼저', () => {
    const items = ownerTodoItems(
      [
        { offerId: 'a', strip: strip('CAUTION', 'CONTRACT_DAY', { date: '2026-10-29', dday: 2 }) },
        { offerId: 'b', strip: strip('ACTION', 'FEE_CHECK') },
      ],
      [],
      now,
    );
    expect(items.map((i) => [i.offerId, i.level])).toEqual([['b', 'NOW'], ['a', 'SOON']]);
  });

  it('바뀐 희망가를 안 알린 곳은 빨강 (매칭된 곳만)', () => {
    const items = ownerTodoItems(
      [{ offerId: 'a', strip: strip('GOOD', 'AD_LIVE') }],
      [],
      now,
      [{ offerId: 'a', price: '13억 5,000만 원' }, { offerId: 'gone', price: '13억 5,000만 원' }],
    );
    expect(items.map((i) => [i.offerId, i.level, i.strip.key, i.strip.vars.price])).toEqual([['a', 'NOW', 'PRICE_NOTIFY', '13억 5,000만 원']]);
  });

  it('할 일이 없으면 빈 목록 (섹션을 숨김)', () => {
    expect(ownerTodoItems([{ offerId: 'a', strip: strip('GOOD', 'IN_PROGRESS') }], [], now)).toEqual([]);
  });
});

describe('heroVisit: 현황판 방문 칩', () => {
  it('지난 방문·취소는 빼고 개수 + 가장 가까운 방문', () => {
    const v = heroVisit(
      [
        visit('v1', 'a', '2026-10-29', 18),
        visit('v2', 'b', '2026-10-27', 9),
        visit('v3', 'a', '2026-10-30', 15, { canceledAt: '2026-10-26T00:00:00Z', canceledBy: 'OWNER' }),
        visit('v4', 'b', '2026-10-31', 11),
      ],
      now,
    );
    expect(v).toEqual({ n: 2, date: '2026-10-29', hour: 18, soon: false });
  });

  it('경계: 정확히 24시간 뒤는 soon, 25시간 뒤는 아님 (곧 확인할 일과 같은 기준)', () => {
    expect(heroVisit([visit('v', 'a', '2026-10-28', 12)], now)?.soon).toBe(true);
    expect(heroVisit([visit('v', 'a', '2026-10-28', 13)], now)?.soon).toBe(false);
  });

  it('다가오는 방문이 없으면 null (칩 숨김)', () => {
    expect(heroVisit([], now)).toBeNull();
    expect(heroVisit([visit('v', 'a', '2026-10-27', 11)], now)).toBeNull();
  });
});
