import { describe, expect, it } from 'vitest';
import type { AnalyticsEvent, EventName, EventProps } from '../events';
import { buildEvent } from '../store';
import {
  adOnTimeRate,
  discountBand,
  fakeDoorRate,
  feeKeptRate,
  firstOfferMedianMinutes,
  funnel,
  kstWeek,
  marketShare,
  matchRateByDiscount,
  median,
  savedFeeTotalManwon,
  weeklyRetention,
} from '../metrics';

let seq = 0;
const ev = (name: EventName, props: EventProps, actorId = 'a1', requestId: string | null = null, at = '2026-11-02T03:00:00Z'): AnalyticsEvent =>
  buildEvent(name, props, { id: `e${seq++}`, at: new Date(at), actorId, sessionId: 's', requestId });

describe('데이터가 없으면 null ("—", 가짜 숫자 금지)', () => {
  it('모든 지표', () => {
    expect(firstOfferMedianMinutes([])).toBeNull();
    expect(feeKeptRate([])).toBeNull();
    expect(adOnTimeRate([])).toBeNull();
    expect(savedFeeTotalManwon([])).toBeNull();
    expect(fakeDoorRate([])).toBeNull();
    expect(marketShare(3, 0)).toBeNull();
    expect(matchRateByDiscount([]).every((b) => b.rate === null && b.requests === 0)).toBe(true);
    expect(funnel([]).map((s) => s.actors)).toEqual([0, 0, 0, 0]);
    expect(weeklyRetention([])).toEqual([]);
  });
});

describe('지표 계산', () => {
  it('중앙값', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('첫 요청까지 시간: 의뢰별 가장 빠른 도착의 중앙값', () => {
    const evs = [ev('offer_arrived', { minutesAfterRequest: 90 }, 'sys', 'R1'), ev('offer_arrived', { minutesAfterRequest: 30 }, 'sys', 'R1'), ev('offer_arrived', { minutesAfterRequest: 120 }, 'sys', 'R2'), ev('offer_arrived', { minutesAfterRequest: 600 }, 'sys', 'R3')];
    expect(firstOfferMedianMinutes(evs)).toBe(120);
  });

  it('할인율 구간: 경계는 아래 포함 (0·10·20·30·40·50)', () => {
    expect([0, 9.9, 10, 29, 30, 55].map(discountBand)).toEqual([0, 0, 10, 20, 30, 50]);
  });

  it('할인율 구간별 매칭률', () => {
    const evs = [
      ev('request_submit', { discountPct: 25, priceBand: '6_TO_9' }, 'o1', 'R1'),
      ev('request_submit', { discountPct: 28, priceBand: '6_TO_9' }, 'o2', 'R2'),
      ev('request_submit', { discountPct: 45, priceBand: '3_TO_6' }, 'o3', 'R3'),
      ev('match_confirm', { count: 2 }, 'o1', 'R1'),
    ];
    const rows = matchRateByDiscount(evs);
    expect(rows.find((r) => r.band === 20)).toEqual({ band: 20, requests: 2, matched: 1, rate: 0.5 });
    expect(rows.find((r) => r.band === 40)).toEqual({ band: 40, requests: 1, matched: 0, rate: 0 });
  });

  it('복비 유지율·광고 48시간 준수율·아낀 복비 합계', () => {
    const evs = [
      ev('fee_answer', { kept: true, savedManwon: 120 }),
      ev('fee_answer', { kept: true, savedManwon: 80 }),
      ev('fee_answer', { kept: false, reason: 'OVERCHARGED' }),
      ev('ad_posted', { hoursAfterMatch: 47.5 }),
      ev('ad_posted', { hoursAfterMatch: 48 }),
      ev('ad_posted', { hoursAfterMatch: 50 }),
    ];
    expect(feeKeptRate(evs)).toBeCloseTo(2 / 3);
    expect(adOnTimeRate(evs)).toBeCloseTo(2 / 3);
    expect(savedFeeTotalManwon(evs)).toBe(200);
  });

  it('이용 흐름: 앞 단계를 한 사람만 다음 단계에 셈', () => {
    const evs = [
      ...['a', 'b', 'c', 'd'].map((a) => ev('analysis_view', { complexId: '16', pyeong: '34', tradeType: 'SALE' }, a)),
      ev('request_submit', { discountPct: 30, priceBand: '6_TO_9' }, 'a'),
      ev('request_submit', { discountPct: 30, priceBand: '6_TO_9' }, 'b'),
      ev('request_submit', { discountPct: 30, priceBand: '6_TO_9' }, 'z'), // 분석을 안 거친 사람은 안 셈
      ev('match_confirm', { count: 1 }, 'a'),
      ev('review_submit', { stars: 5, chipCount: 2 }, 'a'),
    ];
    expect(funnel(evs)).toEqual([
      { step: 'analysis_view', actors: 4, fromPrev: null },
      { step: 'request_submit', actors: 2, fromPrev: 0.5 },
      { step: 'match_confirm', actors: 1, fromPrev: 0.5 },
      { step: 'review_submit', actors: 1, fromPrev: 1 },
    ]);
  });

  it('주차(한국 시간 월요일)와 중개사 주차별 리텐션', () => {
    expect(kstWeek('2026-11-01T16:00:00Z')).toBe('2026-11-02'); // 월요일 01시 KST
    expect(kstWeek('2026-11-01T14:00:00Z')).toBe('2026-10-26'); // 일요일 23시 KST
    const evs = [
      ev('feed_view', {}, 'b1', null, '2026-11-02T03:00:00Z'),
      ev('feed_view', {}, 'b2', null, '2026-11-03T03:00:00Z'),
      ev('feed_view', {}, 'b1', null, '2026-11-10T03:00:00Z'),
      ev('analysis_view', { complexId: '1', pyeong: '1', tradeType: 'SALE' }, 'owner', null, '2026-11-10T03:00:00Z'),
    ];
    expect(weeklyRetention(evs, 2)).toEqual([{ cohort: '2026-11-02', size: 2, rates: [1, 0.5, 0] }]);
  });

  it('점유율·페이크 도어', () => {
    expect(marketShare(3, 120)).toBe(0.025);
    const evs = [ev('feed_view', {}, 'b1'), ev('feed_view', {}, 'b2'), ev('more_credits_tap', {}, 'b1'), ev('more_credits_tap', {}, 'b9')];
    expect(fakeDoorRate(evs)).toBe(0.5);
  });
});
