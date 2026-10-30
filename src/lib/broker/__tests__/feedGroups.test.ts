import { describe, expect, it } from 'vitest';
import { calculateLegalCommission } from '@/lib/commission';
import { dealEarnings, feedFilterCounts, groupFeed, isUrgent, URGENT_HOURS, type FeedItem } from '../feed';

const item = (id: string, hoursLeft: number, tradeType: FeedItem['tradeType'] = '매매'): FeedItem => ({
  requestId: id,
  complexName: id,
  tradeType,
  pyeongLabel: '34평',
  floorLabel: '중층',
  maskedDongHo: '1**동',
  askingPriceManwon: 90_000,
  commissionWon: 2_000_000,
  legalMaxWon: 4_000_000,
  occupancy: 'OWNER',
  details: null,
  createdAt: '2026-11-01T00:00:00Z',
  hoursLeft,
});

describe('피드 섹션 (요청 가능한 매물 / 요청 보낸 매물) + 24시간 미만 빨간 시간', () => {
  it('경계값 전수: 0~48시간, 24시간 미만만 빨강 (24시간은 아님)', () => {
    expect(URGENT_HOURS).toBe(24);
    for (let h = 0; h <= 48; h++) expect(isUrgent(h), `${h}`).toBe(h < 24);
  });

  it('요청 보낸 의뢰는 남은 시간과 상관없이 아래 섹션으로만, 순서는 유지', () => {
    const feed = [item('A', 2), item('B', 5), item('C', 20), item('D', 40)];
    const g = groupFeed(feed, new Set(['A', 'D']));
    expect(g.open.map((f) => f.requestId)).toEqual(['B', 'C']);
    expect(g.sent.map((f) => f.requestId)).toEqual(['A', 'D']);
    // 빠지거나 겹치는 의뢰 없음
    expect([...g.open, ...g.sent].length).toBe(feed.length);
  });

  it('거래 종류 필터: 두 섹션 모두에 적용, 개수는 필터와 무관하게 전체 기준', () => {
    const feed = [item('A', 3, '전세'), item('B', 10, '매매'), item('C', 30, '전세')];
    const g = groupFeed(feed, new Set(['C']), '전세');
    expect(g.open.map((f) => f.requestId)).toEqual(['A']);
    expect(g.sent.map((f) => f.requestId)).toEqual(['C']);
    expect(feedFilterCounts(feed)).toEqual({ ALL: 3, 매매: 1, 전세: 2 });
    expect(feedFilterCounts([])).toEqual({ ALL: 0, 매매: 0, 전세: 0 });
  });
});

describe('계약하면 받는 금액 (집주인 쪽 + 상대방 쪽 최대)', () => {
  it('매매 9억 9,000만: 집주인 쪽 297만 + 매수인 쪽 상한 495만(0.5%) = 최대 792만', () => {
    expect(dealEarnings({ tradeType: '매매', askingPriceManwon: 99_000, commissionWon: 2_970_000 })).toEqual({
      ownerWon: 2_970_000,
      otherMaxWon: 4_950_000,
      totalMaxWon: 7_920_000,
    });
  });

  it('전세 4억 5,000만: 세입자 쪽 상한 135만(0.3%)', () => {
    expect(dealEarnings({ tradeType: '전세', askingPriceManwon: 45_000, commissionWon: 1_200_000 }).otherMaxWon).toBe(1_350_000);
  });

  it('상대방 쪽은 항상 법정 상한 계산(commission.ts)과 같고, 합계 = 두 금액의 합 (가격 구간 전수)', () => {
    for (const tradeType of ['매매', '전세'] as const) {
      for (let manwon = 1_000; manwon <= 200_000; manwon += 1_000) {
        const e = dealEarnings({ tradeType, askingPriceManwon: manwon, commissionWon: 1_000_000 });
        expect(e.otherMaxWon).toBe(calculateLegalCommission(manwon * 10_000, tradeType).maxWon);
        expect(e.totalMaxWon).toBe(e.ownerWon + e.otherMaxWon);
      }
    }
  });
});
