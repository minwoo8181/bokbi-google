import { describe, expect, it } from 'vitest';
import { SITE_CONTENT } from '@/config/siteContent';
import { demoRequest, requestFromSummary } from '@/components/my-requests/mock-requests';
import { demoFeedRequests } from '@/components/agent/mock-feed';
import { endorsementCount } from '@/lib/requests/stage';
import type { BrokerApplication } from '../application';
import { EMPTY_WALLET, refillWeekly } from '../credits';
import {
  buildOffer,
  gapManwon,
  legalRatioPct,
  recommendedStrengths,
  sendBlock,
  sentStatus,
  toFeed,
  type SentRequest,
} from '../feed';
import { EMPTY_MARKET, addOffer, applyMarket, parseMarket, parseWorkspace, setMatched } from '../mockMarket';

const now = new Date('2026-10-27T03:00:00Z');
const base = demoRequest(now);
const wallet = refillWeekly(EMPTY_WALLET, now);
const sent = (requestId: string, sentAt = now.toISOString()): SentRequest => ({
  requestId,
  offerId: `offer-x-${requestId}`,
  sentAt,
  strengths: [],
  snapshot: { complexName: '', tradeType: '매매', pyeongLabel: '', maskedDongHo: '', commissionWon: 0 },
});
const app: BrokerApplication = {
  regNo: '41360-2024-60048',
  office: '예시공인중개사사무소',
  code: '1234',
  strengths: ['주말 안내 가능'],
  phone: '010-0000-0000',
  submittedAt: now.toISOString(),
  status: 'APPROVED',
  reviewedAt: now.toISOString(),
  rejectReason: null,
  openYear: 2024,
};

describe('피드 (블라인드)', () => {
  it('받는 중인 의뢰만, 남은 시간 짧은 순', () => {
    const expired = { ...base, id: 'old', createdAt: new Date(now.getTime() - 49 * 3_600_000).toISOString() };
    const soon = { ...base, id: 'soon', createdAt: new Date(now.getTime() - 46 * 3_600_000).toISOString() };
    const feed = toFeed([base, expired, soon], now.getTime());
    expect(feed.map((f) => f.requestId)).toEqual(['soon', base.id]);
  });

  it('실제 동·호수·집주인 정보·다른 중개사 요청이 들어가지 않는다', () => {
    const json = JSON.stringify(toFeed(demoFeedRequests(now, null), now.getTime()));
    for (const r of demoFeedRequests(now, null)) {
      expect(json).not.toContain(r.dongHo);
      for (const o of r.offers) {
        expect(json).not.toContain(o.disclosure.officeName);
        expect(json).not.toContain(o.disclosure.phone);
      }
    }
    expect(json).not.toMatch(/ownerName|ownerPhone|dongHo"|disclosure|offers/);
  });
});

describe('법정 상한 대비·갭', () => {
  it('받는 금액은 법정 상한의 몇 %, 상한을 모르면 null', () => {
    expect(legalRatioPct(2_460_000, 4_100_000)).toBe(60);
    expect(legalRatioPct(5_000_000, 4_100_000)).toBe(100);
    expect(legalRatioPct(1_000_000, 0)).toBeNull();
  });

  it('갭은 세입자 낀 매매에서만 희망가 − 보증금', () => {
    const lease = { kind: 'JEONSE' as const, depositManwon: 70_000, monthlyRentManwon: 0, leaseEndDate: '2027-08-31', renewal: 'NOT_USED' as const };
    const details = { moveIn: { type: 'NEGOTIABLE' as const, date: '' }, aircon: null, midDoor: false, closet: false, mortgage: null, lease };
    expect(gapManwon({ tradeType: '매매', askingPriceManwon: 120_000, details })).toBe(50_000);
    expect(gapManwon({ tradeType: '전세', askingPriceManwon: 120_000, details })).toBeNull();
    expect(gapManwon({ tradeType: '매매', askingPriceManwon: 120_000, details: { ...details, lease: null } })).toBeNull();
    expect(gapManwon({ tradeType: '매매', askingPriceManwon: 60_000, details })).toBeNull();
  });

  it('집 정보에 자유 메모·채권최고액이 들어가지 않는다 (매칭 모달 저장값에서)', () => {
    const saved = {
      aptName: '예시단지',
      customOptionMemo: '010-1111-2222 연락주세요',
      visitNoticeMemo: '104동 1802호 비번 1234',
      mortgage: { status: 'EXISTS', maxClaimManwon: 24_000, plan: 'KEEP' },
      hasAircon: true,
      airconCount: '3대',
    };
    const r = requestFromSummary(saved, now)!;
    const json = JSON.stringify(toFeed([r], now.getTime()));
    expect(json).not.toContain('010-1111-2222');
    expect(json).not.toContain('비번');
    expect(json).not.toContain('24000');
    expect(r.details?.mortgage).toEqual({ status: 'EXISTS', plan: 'KEEP' });
  });
});

describe('요청 보내기 막힘', () => {
  it('이미 보냄 → 마감 → 크레딧 순으로 검사', () => {
    expect(sendBlock({ request: base, sent: [], wallet, now })).toBeNull();
    expect(sendBlock({ request: base, sent: [sent(base.id)], wallet, now })).toBe('ALREADY_SENT');
    const closed = { ...base, stage: 'IN_PROGRESS' as const };
    expect(sendBlock({ request: closed, sent: [], wallet, now })).toBe('CLOSED');
    expect(sendBlock({ request: base, sent: [], wallet: { ...wallet, balance: 0 }, now })).toBe('NO_CREDIT');
  });

  it('하루 제한은 없다: 오늘 이미 여러 번 보냈어도 크레딧이 있으면 보낼 수 있다 (대표님 2026-10-29)', () => {
    const today = Array.from({ length: 5 }, (_, i) => sent(`r${i}`));
    expect(sendBlock({ request: base, sent: today, wallet: { ...wallet, balance: 1 }, now })).toBeNull();
  });
});

describe('보낸 요청 상태', () => {
  const s = sent(base.id);
  it('기다리는 중 / 선택됨 / 선택되지 않음 / 마감', () => {
    expect(sentStatus(s, base, now.getTime())).toBe('WAITING');
    expect(sentStatus(s, { ...base, matchedOfferIds: [s.offerId] }, now.getTime())).toBe('SELECTED');
    expect(sentStatus(s, { ...base, matchedOfferIds: ['offer-1'] }, now.getTime())).toBe('NOT_SELECTED');
    expect(sentStatus(s, { ...base, stage: 'ENDED', endedReason: 'CANCELLED' }, now.getTime())).toBe('CLOSED');
    expect(sentStatus(s, null, now.getTime())).toBe('CLOSED');
    const expired = { ...base, createdAt: new Date(now.getTime() - 49 * 3_600_000).toISOString() };
    expect(sentStatus(s, expired, now.getTime())).toBe('CLOSED');
  });
});

describe('추천 강점 칩', () => {
  const all: readonly string[] = SITE_CONTENT.brokerStrengths.groups.flatMap((g) => g.chips);
  it('추천 칩은 모두 강점 칩 목록 안에 있고 3~5개', () => {
    for (const tradeType of ['매매', '전세'] as const) {
      for (const occupancy of ['OWNER', 'TENANT', 'VACANT'] as const) {
        const rec = recommendedStrengths({ tradeType, occupancy });
        expect(rec.length).toBeGreaterThanOrEqual(3);
        expect(rec.length).toBeLessThanOrEqual(5);
        for (const c of rec) expect(all, c).toContain(c);
      }
    }
  });

  it('매물에 맞춘 칩이 먼저 온다', () => {
    expect(recommendedStrengths({ tradeType: '매매', occupancy: 'TENANT' }).slice(0, 2)).toEqual(['세입자와 잘 조율해요', '세입자 낀 매매 잘해요']);
    expect(recommendedStrengths({ tradeType: '전세', occupancy: 'OWNER' })).toContain('전세 계약 꼼꼼해요');
    expect(recommendedStrengths({ tradeType: '매매', occupancy: 'VACANT' })[0]).toBe('사진을 잘 찍어요');
  });
});

describe('강점 인정 수', () => {
  it('짝이 되는 후기 칩을 고른 횟수, 짝이 없으면 0', () => {
    const pairs = SITE_CONTENT.brokerStrengths.endorsedBy;
    expect(endorsementCount('집주인 편에서 협상해요', { '내 입장에서 협상해요': 4 }, pairs)).toBe(4);
    expect(endorsementCount('시세를 잘 알아요', {}, pairs)).toBe(0);
    expect(endorsementCount('없는 칩', { '없는 칩': 3 }, pairs)).toBe(0);
  });
});

describe('공유 저장소', () => {
  it('보낸 요청이 집주인 의뢰 카드로 붙고 순번이 이어진다, 같은 카드는 한 번만', () => {
    const offer = buildOffer(app, { requestId: base.id, existing: base.offers, strengths: ['주말 안내 가능'], now });
    const m = addOffer(addOffer(EMPTY_MARKET, base.id, offer), base.id, offer);
    const merged = applyMarket(base, m);
    expect(merged.offers).toHaveLength(base.offers.length + 1);
    expect(merged.offers.at(-1)?.order).toBe(base.offers.length + 1);
    expect(merged.offers.at(-1)?.officeOpenYear).toBe(2024);
  });

  it('집주인이 확정하면 중개사 쪽에서 선택됨, 의뢰는 진행중(광고 기한은 확정 시각부터)', () => {
    const offer = buildOffer(app, { requestId: base.id, existing: base.offers, strengths: [], now });
    const m = setMatched(addOffer(EMPTY_MARKET, base.id, offer), base.id, [offer.id], now);
    const s: SentRequest = { ...sent(base.id), offerId: offer.id };
    const merged = applyMarket(base, m);
    expect(sentStatus(s, merged, now.getTime())).toBe('SELECTED');
    expect(merged.stage).toBe('IN_PROGRESS');
    expect(merged.adWindowStartedAt).toBe(now.toISOString());
    expect(toFeed([merged], now.getTime())).toEqual([]);
  });

  it('다른 곳을 고르면 선택되지 않음', () => {
    const s: SentRequest = { ...sent(base.id), offerId: 'mine' };
    const merged = applyMarket(base, setMatched(EMPTY_MARKET, base.id, ['offer-1'], now));
    expect(sentStatus(s, merged, now.getTime())).toBe('NOT_SELECTED');
  });

  it('깨진 저장값은 빈 값으로 읽는다', () => {
    expect(parseMarket('{')).toEqual(EMPTY_MARKET);
    expect(parseMarket('[]')).toEqual(EMPTY_MARKET);
    expect(parseMarket('{"matched":{"a":["x"],"b":{"offerIds":["y"],"at":"2026-10-27T00:00:00Z"}}}').matched).toEqual({
      b: { offerIds: ['y'], at: '2026-10-27T00:00:00Z' },
    });
    expect(parseWorkspace('{"wallet":3}').wallet.balance).toBe(0);
    expect(parseWorkspace(null).sent).toEqual([]);
  });
});
