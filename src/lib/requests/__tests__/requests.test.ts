import { describe, it, expect } from 'vitest';
import { buildNaverArticleUrl, normalizeNaverListingInput, parseNaverArticleNo } from '../naverListing';
import { officeOpenYear } from '../officeYear';
import registryJson from '@/data/brokers/dasan-offices.json';
import { geocodeQuery, officeMapSrc, parseGeocodeResponse, parseOfficePoint, vworldGeocodeUrl, vworldStaticMapUrl } from '../officeMap';
import {
  activeBlocked,
  addBlockedRange,
  bookingsInRange,
  canToggleOff,
  checkBlockedRange,
  checkBooking,
  daysInclusive,
  defaultAvailability,
  isSlotOpen,
  openHoursOn,
  openSlotCount,
  removeBlockedRange,
  summarizeWeekly,
  toggleWeekly,
  weekdayOf,
  type VisitBooking,
} from '../showing';
import {
  adDay,
  adState,
  agentCountBand,
  canReview,
  clampFee,
  contractReportHoursLeft,
  effectiveStage,
  hoursLeft,
  isProtected,
  MAX_MATCH,
  officeAgeBand,
  progressStep,
  releaseOffer,
  rerequest,
  toggleSelection,
  topReviewChips,
  ownerEndorsedChips,
  reviewChipSplit,
  trustBadges,
  countsAsKeptPromise,
  promiseTier,
  promiseLevel,
} from '../stage';
import type { BrokerOffer, OwnerRequest } from '../types';
import { SITE_CONTENT } from '@/config/siteContent';

const H = 3_600_000;
const D = 24 * H;

describe('네이버 매물 링크', () => {
  it('번호만 넣어도, 링크를 통째로 넣어도 같은 링크가 된다', () => {
    const expected = buildNaverArticleUrl('2657553153');
    expect(normalizeNaverListingInput('2657553153')).toBe(expected);
    expect(
      normalizeNaverListingInput(
        'https://new.land.naver.com/complexes/127004?ms=2ANV77,3zpm0K,16&a=APT:PRE:ABYG:JGC&e=RETAIL&articleNo=2657553153',
      ),
    ).toBe(expected);
    expect(normalizeNaverListingInput('https://fin.land.naver.com/articles/2657553153')).toBe(expected);
    expect(normalizeNaverListingInput('m.land.naver.com/article/info/2657553153')).toBe(expected);
    expect(normalizeNaverListingInput('  2657553153  ')).toBe(expected);
  });

  it('네이버가 아닌 링크·번호 없는 입력은 받지 않는다', () => {
    expect(parseNaverArticleNo('https://evil.example.com/?articleNo=2657553153')).toBeNull();
    expect(parseNaverArticleNo('https://land.naver.com.evil.com/articles/2657553153')).toBeNull();
    expect(parseNaverArticleNo('https://new.land.naver.com/complexes/127004')).toBeNull();
    expect(parseNaverArticleNo('123')).toBeNull();
    expect(parseNaverArticleNo('')).toBeNull();
    expect(parseNaverArticleNo('광고 올렸어요')).toBeNull();
  });
});

describe('사무소 지도 (서버 경유, 등록번호 → 실시간 좌표 변환, 다산동 좌표만)', () => {
  it('다산동 일대 좌표만 받고, 화면에는 키·좌표 없이 등록번호만 준다', () => {
    expect(parseOfficePoint('127.1654203575257', '37.61182229712534')).toEqual({ x: 127.1654203575257, y: 37.61182229712534 });
    expect(parseOfficePoint('126.9780', '37.5665')).toBeNull(); // 서울시청
    expect(parseOfficePoint('abc', '37.6')).toBeNull();
    expect(parseOfficePoint(null, '37.6')).toBeNull();
    expect(officeMapSrc('41360-2024-60048')).toBe('/api/office-map?office=41360-2024-60048');
    expect(officeMapSrc('가3622-08-04')).toBe(`/api/office-map?office=${encodeURIComponent('가3622-08-04')}`);
    const url = vworldStaticMapUrl({ x: 127.16, y: 37.61 }, 'TESTKEY');
    expect(url).toContain('api.vworld.kr/req/image');
    expect(url).toContain('zoom=17');
  });

  it('주소 → 지오코더 질의: 도로명은 건물번호까지, 호수·괄호 제거', () => {
    expect(geocodeQuery('경기도 남양주시 다산중앙로82번길 13 103호')).toEqual({ type: 'ROAD', address: '경기도 남양주시 다산중앙로82번길 13' });
    expect(geocodeQuery('경기도 남양주시 경춘로 508-4 113(다산동 더리터스타워)')).toEqual({ type: 'ROAD', address: '경기도 남양주시 경춘로 508-4' });
    expect(geocodeQuery('경기도 남양주시 다산중앙로82번안길 74 101호(다산동, 다산신도시자연앤푸르지오 근린생활시설-1)')).toEqual({
      type: 'ROAD',
      address: '경기도 남양주시 다산중앙로82번안길 74',
    });
    expect(geocodeQuery('경기도 남양주시 다산동 6000 101호')).toEqual({ type: 'PARCEL', address: '경기도 남양주시 다산동 6000 101호' });
    expect(geocodeQuery('  ')).toBeNull();
  });

  it('명단 336곳 주소가 모두 지오코더 질의로 바뀐다', () => {
    const queries = (registryJson.offices as { address: string }[]).map((o) => geocodeQuery(o.address));
    expect(queries.every((q) => q !== null)).toBe(true);
  });

  it('지오코더 응답: OK + 다산동 범위만 좌표로', () => {
    const ok = { response: { status: 'OK', result: { point: { x: '127.1654', y: '37.6118' } } } };
    expect(parseGeocodeResponse(ok)).toEqual({ x: 127.1654, y: 37.6118 });
    expect(parseGeocodeResponse({ response: { status: 'NOT_FOUND' } })).toBeNull();
    expect(parseGeocodeResponse({ response: { status: 'OK', result: { point: { x: '126.97', y: '37.56' } } } })).toBeNull();
    expect(parseGeocodeResponse(null)).toBeNull();
    const url = vworldGeocodeUrl({ type: 'ROAD', address: '경기도 남양주시 다산중앙로82번길 13' }, 'TESTKEY');
    expect(url).toContain('request=getcoord');
    expect(url).toContain('type=ROAD');
  });
});

describe('사무소 개설 연도·인원 (구간으로만)', () => {
  it('신형·구형 등록번호를 읽고, 모르는 형식은 null', () => {
    expect(officeOpenYear('41360-2021-60064', 2026)).toBe(2021);
    expect(officeOpenYear('41360-09-00123', 2026)).toBe(2009);
    expect(officeOpenYear('41360-0077-00001', 2026)).toBeNull();
    expect(officeOpenYear('41360-2030-00001', 2026)).toBeNull();
    expect(officeOpenYear('잘못된값', 2026)).toBeNull();
  });

  it('개설 연도 → 3년 미만 / 3~10년 / 10년 이상', () => {
    expect(officeAgeBand(2025, 2026)).toBe('UNDER_3');
    expect(officeAgeBand(2024, 2026)).toBe('UNDER_3');
    expect(officeAgeBand(2023, 2026)).toBe('FROM_3_TO_10');
    expect(officeAgeBand(2017, 2026)).toBe('FROM_3_TO_10');
    expect(officeAgeBand(2016, 2026)).toBe('OVER_10');
    expect(officeAgeBand(null, 2026)).toBeNull();
  });

  it('인원 → 1명 / 2명 이상', () => {
    expect(agentCountBand(1)).toBe('ONE');
    expect(agentCountBand(4)).toBe('TWO_PLUS');
    expect(agentCountBand(null)).toBeNull();
    expect(agentCountBand(0)).toBeNull();
  });
});

describe('방문 가능 시간', () => {
  const a = defaultAvailability(); // 평일 저녁 + 주말 오전·오후
  const sat = '2026-10-31';
  const mon = '2026-11-02';

  it('요일 계산', () => {
    expect(weekdayOf(sat)).toBe(6);
    expect(weekdayOf(mon)).toBe(1);
  });

  it('기본값: 평일 저녁, 주말 오전·오후만 열린다', () => {
    expect(isSlotOpen(a, mon, 19)).toBe(true);
    expect(isSlotOpen(a, mon, 10)).toBe(false);
    expect(isSlotOpen(a, sat, 10)).toBe(true);
    expect(isSlotOpen(a, sat, 19)).toBe(false);
    expect(isSlotOpen(a, mon, 12)).toBe(false);
  });

  it('예약 규칙: 지난 날·뺀 기간·닫힌 시간·이미 잡힌 시간', () => {
    const today = '2026-10-30';
    const booked: VisitBooking[] = [{ id: 'v1', offerId: 'A', date: mon, hour: 19 }];
    expect(checkBooking(a, booked, { date: mon, hour: 18 }, today)).toBeNull();
    expect(checkBooking(a, booked, { date: mon, hour: 19 }, today)).toBe('TAKEN');
    expect(checkBooking(a, booked, { date: mon, hour: 10 }, today)).toBe('CLOSED_SLOT');
    expect(checkBooking(a, booked, { date: '2026-10-29', hour: 19 }, today)).toBe('PAST');
    const blocked = addBlockedRange(a, { start: sat, end: mon });
    expect(checkBooking(blocked, booked, { date: mon, hour: 18 }, today)).toBe('BLOCKED_DATE');
    expect(checkBooking(blocked, booked, { date: '2026-11-03', hour: 18 }, today)).toBeNull(); // 기간 끝나면 다시 열림
  });

  it('열린 시각 목록은 예약된 시각을 뺀다', () => {
    const booked: VisitBooking[] = [{ id: 'v1', offerId: 'A', date: mon, hour: 19 }];
    expect(openHoursOn(a, mon, booked)).toEqual([18, 20]);
    expect(openHoursOn(toggleWeekly(a, 1, 'MORNING'), mon, [])).toEqual([10, 11, 18, 19, 20]);
  });

  it('안 되는 날: 기간은 최대 7일, 지난 날·거꾸로 된 기간은 막고, 중복 없이 정렬', () => {
    const today = '2026-10-30';
    expect(checkBlockedRange({ start: '2026-11-03', end: '2026-11-09' }, today)).toBeNull(); // 7일
    expect(checkBlockedRange({ start: '2026-11-03', end: '2026-11-10' }, today)).toBe('TOO_LONG'); // 8일
    expect(checkBlockedRange({ start: '2026-10-29', end: '2026-10-31' }, today)).toBe('PAST');
    expect(checkBlockedRange({ start: '2026-11-05', end: '2026-11-03' }, today)).toBe('END_BEFORE_START');
    expect(checkBlockedRange({ start: '2026-11-05' }, today)).toBe('EMPTY');
    expect(daysInclusive('2026-11-03', '2026-11-03')).toBe(1);
    const r1 = { start: mon, end: mon };
    const r0 = { start: sat, end: sat };
    const b = addBlockedRange(addBlockedRange(addBlockedRange(a, r1), r0), r1);
    expect(b.blocked).toEqual([r0, r1]);
    expect(removeBlockedRange(b, r0).blocked).toEqual([r1]);
    expect(activeBlocked(b, '2026-11-01')).toEqual([r1]);
    expect(bookingsInRange([{ id: 'v', offerId: 'A', date: mon, hour: 19 }], { start: sat, end: mon })).toHaveLength(1);
  });

  it('매주 방문 시간은 마지막 1칸을 끌 수 없다', () => {
    const only = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { MORNING: false, AFTERNOON: false, EVENING: d === 1 }]));
    const one = { ...a, weekly: only } as typeof a;
    expect(openSlotCount(one)).toBe(1);
    expect(canToggleOff(one, 1, 'EVENING')).toBe(false);
    expect(toggleWeekly(one, 1, 'EVENING')).toBe(one);
    expect(openSlotCount(toggleWeekly(one, 2, 'EVENING'))).toBe(2);
  });

  it('한 줄 요약: 평일·주말로 묶고, 다르면 요일별, 빈 묶음은 뺀다', () => {
    expect(summarizeWeekly(a)).toEqual([
      { days: 'WEEKDAYS', parts: ['EVENING'] },
      { days: 'WEEKEND', parts: ['MORNING', 'AFTERNOON'] },
    ]);
    const b = toggleWeekly(a, 3, 'MORNING'); // 수요일만 오전 추가
    expect(summarizeWeekly(b)[2]).toEqual({ days: 3, parts: ['MORNING', 'EVENING'] });
  });
});

const offer = (over: Partial<BrokerOffer> = {}): BrokerOffer => ({
  id: 'o1',
  order: 1,
  arrivedAt: '2026-10-24T10:00:00+09:00',
  officeOpenYear: 2018,
  agentCount: null,
  promise: { kept: 0, total: 0 },
  review: { count: 0, average: 0, chipCounts: {} },
  strengths: [],
  disclosure: { officeName: '예시', ceoName: '예시', phone: '000', address: '예시', regNo: '예시' },
  ad: null,
  ...over,
});

const baseRequest = (over: Partial<OwnerRequest> = {}): OwnerRequest =>
  ({
    id: 'BK-1',
    aptId: '8',
    commissionWon: 2_970_000,
    legalMaxWon: 4_950_000,
    createdAt: '2026-10-24T10:00:00+09:00',
    stage: 'IN_PROGRESS',
    endedReason: null,
    offers: [offer({ id: 'a' }), offer({ id: 'b' })],
    matchedOfferIds: ['a', 'b'],
    matchedAt: '2026-10-24T12:00:00+09:00',
    adWindowStartedAt: '2026-10-24T12:00:00+09:00',
    paused: null,
    visits: [],
    contract: null,
    ...over,
  }) as OwnerRequest;

describe('요청 받는 중', () => {
  it('48시간이 지나면 종료(만료)', () => {
    const created = '2026-10-24T10:00:00+09:00';
    const t0 = new Date(created).getTime();
    expect(hoursLeft(created, t0)).toBe(48);
    expect(hoursLeft(created, t0 + 47.5 * H)).toBe(1);
    const r = baseRequest({ stage: 'RECEIVING', createdAt: created });
    expect(effectiveStage(r, t0 + 49 * H)).toEqual({ stage: 'ENDED', endedReason: 'EXPIRED' });
    expect(effectiveStage({ ...r, stage: 'IN_PROGRESS' }, t0 + 49 * H).stage).toBe('IN_PROGRESS');
  });

  it(`최대 ${MAX_MATCH}곳까지만 선택`, () => {
    let s: string[] = [];
    for (const id of ['a', 'b', 'c', 'd']) s = toggleSelection(s, id);
    expect(s).toEqual(['a', 'b', 'c']);
    expect(toggleSelection(s, 'b')).toEqual(['a', 'c']);
  });

  it('기록이 없으면 복비 첫 거래, 후기 평균은 3건부터', () => {
    expect(trustBadges(offer(), 2026).firstDeal).toBe(true);
    expect(trustBadges(offer(), 2026).promise).toBeNull();
    const two = trustBadges(offer({ review: { count: 2, average: 5, chipCounts: {} } }), 2026);
    expect(two.firstDeal).toBe(false);
    expect(two.review).toEqual({ count: 2, average: null });
    expect(trustBadges(offer({ review: { count: 9, average: 4.8, chipCounts: {} } }), 2026).review).toEqual({ count: 9, average: 4.8 });
    expect(trustBadges(offer({ promise: { kept: 12, total: 12 } }), 2026).promise).toEqual({ kept: 12, tier: 3 });
  });

  it('약속 이행 방패: 1·5·10건부터 1·2·3개, 그 위는 3개에서 멈춤', () => {
    expect([0, 1, 4, 5, 9, 10, 37].map(promiseTier)).toEqual([0, 1, 1, 2, 2, 3, 3]);
    // 약속 레벨 = 단계 + 1 (대표님 2026-10-29 PromiseLevel A안)
    expect([0, 1, 4, 5, 9, 10, 37].map(promiseLevel)).toEqual([1, 2, 2, 3, 3, 4, 4]);
    // 계약은 있었지만 센 거래가 없으면: 첫 거래도 아니고 약속 배지도 없음
    const b = trustBadges(offer({ promise: { kept: 0, total: 2 } }), 2026);
    expect(b.firstDeal).toBe(false);
    expect(b.promise).toBeNull();
  });

  it('약속 이행 1건 = 합의 복비 확인 + 중개사가 계약일·잔금일 직접 보고', () => {
    const base = { reportedBy: 'BROKER' as const, feeKept: true, contractDate: '2026-11-02', balanceDate: '2026-12-20' };
    expect(countsAsKeptPromise(base)).toBe(true);
    expect(countsAsKeptPromise({ ...base, reportedBy: 'OWNER' })).toBe(false); // 집주인이 대신 입력
    expect(countsAsKeptPromise({ ...base, feeKept: false })).toBe(false);
    expect(countsAsKeptPromise({ ...base, feeKept: null })).toBe(false); // 집주인 확인 전
    expect(countsAsKeptPromise({ ...base, balanceDate: null })).toBe(false);
  });

  it('후기 칩은 많은 순, 0건은 뺀다', () => {
    expect(topReviewChips({ 친절: 3, 빠름: 6, 사진: 0, 시세: 3 })).toEqual([
      ['빠름', 6],
      ['시세', 3],
      ['친절', 3],
    ]);
  });

  it('집주인이 인정한 장점: 위 "잘하는 점"의 짝은 빼고 많이 고른 순 5개 (대표님 2026-10-29)', () => {
    const pairs = { '시세를 잘 알아요': '시세 설명', '연락이 빨라요': '빠른 답장' };
    const counts = { '시세 설명': 7, '빠른 답장': 5, 서류: 6, 친절: 5, 방문: 4, 사진: 3, 편함: 2, 주차: 1, 없음: 0 };
    expect(ownerEndorsedChips(counts, ['시세를 잘 알아요', '연락이 빨라요', '짝 없는 강점'], pairs)).toEqual([
      ['서류', 6],
      ['친절', 5],
      ['방문', 4],
      ['사진', 3],
      ['편함', 2],
    ]);
    expect(ownerEndorsedChips({}, [], pairs)).toEqual([]);
  });

  it('후기 쓰기: 고른 강점의 짝을 위로, 나머지 묶음에서 빼고 빈 묶음은 없앰 (대표님 2026-10-29 ①안)', () => {
    const pairs = { '시세를 잘 알아요': '시세 설명', '연락이 빨라요': '빠른 답장', '짝 없음 강점': '목록에 없는 칩' };
    const groups = [
      { label: '설명', chips: ['시세 설명', '친절'] },
      { label: '소통', chips: ['빠른 답장'] },
      { label: '신뢰', chips: ['정직'] },
    ];
    expect(reviewChipSplit(['시세를 잘 알아요', '연락이 빨라요', '짝 없음 강점', '없는 강점'], pairs, groups)).toEqual({
      claimed: ['시세 설명', '빠른 답장'],
      rest: [
        { label: '설명', chips: ['친절'] },
        { label: '신뢰', chips: ['정직'] },
      ],
    });
    // 실제 문구: 강점 칩 22개 모두 짝 후기 칩이 후기 목록에 있어야 "맞았나요?"에 빠짐없이 나온다
    const real = reviewChipSplit(SITE_CONTENT.brokerStrengths.groups.flatMap((g) => g.chips), SITE_CONTENT.brokerStrengths.endorsedBy, SITE_CONTENT.myRequests.contracted.reviewChipGroups);
    expect(real.claimed).toHaveLength(SITE_CONTENT.brokerStrengths.groups.flatMap((g) => g.chips).length);
  });

  it('다시 요청: 복비는 10만 원~법정 상한, 도착한 요청·매칭은 비운다', () => {
    expect(clampFee(50_000, 4_950_000)).toBe(100_000);
    expect(clampFee(6_000_000, 4_950_000)).toBe(4_950_000);
    const r = rerequest(baseRequest({ stage: 'ENDED', endedReason: 'EXPIRED' }), 3_070_000, new Date('2026-10-26T09:00:00+09:00'));
    expect(r.stage).toBe('RECEIVING');
    expect(r.commissionWon).toBe(3_070_000);
    expect(r.offers).toEqual([]);
    expect(r.matchedOfferIds).toEqual([]);
    expect(r.id).not.toBe('BK-1');
    expect(rerequest(r, 3_170_000, new Date()).id.split('~')[0]).toBe('BK-1');
  });
});

describe('진행중', () => {
  const r = baseRequest();
  const matched = new Date(r.matchedAt!).getTime();

  it('광고: 48시간 안이면 남은 시간, 지나면 기한 초과, 올리면 n일째, 멈추면 멈춤', () => {
    expect(adState(offer(), r, matched + 17 * H)).toEqual({ kind: 'PENDING', hoursLeft: 31 });
    expect(adState(offer(), r, matched + 49 * H)).toEqual({ kind: 'OVERDUE' });
    const posted = offer({ ad: { url: 'x', postedAt: r.matchedAt! } });
    expect(adState(posted, r, matched + 6 * D + 1000)).toEqual({ kind: 'LIVE', day: 7 });
    expect(adState(posted, { ...r, paused: { pausedAt: '', reason: '' } }, matched)).toEqual({ kind: 'PAUSED' });
    expect(adDay(r.matchedAt!, matched)).toBe(1);
  });

  it('확정 후 7일은 보호 (멈추기·거둬들이기 불가)', () => {
    expect(isProtected(r.matchedAt, matched + 6 * D)).toBe(true);
    expect(isProtected(r.matchedAt, matched + 7 * D)).toBe(false);
    expect(isProtected(null, matched)).toBe(false);
  });

  it('한 곳 해제, 모두 해제되면 종료', () => {
    const one = releaseOffer(r, 'a');
    expect(one.matchedOfferIds).toEqual(['b']);
    expect(one.stage).toBe('IN_PROGRESS');
    const none = releaseOffer(one, 'b');
    expect(none.stage).toBe('ENDED');
    expect(none.endedReason).toBe('RELEASED');
  });
});

describe('계약·진행 막대', () => {
  it('중개사 계약일 보고 기한 48시간, 후기는 잔금 다음 날부터', () => {
    const at = '2026-11-02T10:00:00+09:00';
    const t = new Date(at).getTime();
    expect(contractReportHoursLeft(at, t + 10 * H)).toBe(38);
    expect(contractReportHoursLeft(at, t + 48 * H)).toBe(0);
    expect(canReview('2026-12-20', '2026-12-20')).toBe(false);
    expect(canReview('2026-12-20', '2026-12-21')).toBe(true);
    expect(canReview(null, '2026-12-21')).toBe(false);
  });

  it('진행 막대 단계', () => {
    expect(progressStep('RECEIVING', false)).toBe(1);
    expect(progressStep('IN_PROGRESS', false)).toBe(3);
    expect(progressStep('CONTRACTED', false)).toBe(4);
    expect(progressStep('CONTRACTED', true)).toBe(5);
    expect(progressStep('ENDED', false)).toBe(0);
  });
});
