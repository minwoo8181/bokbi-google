import { describe, it, expect } from 'vitest';
import {
  ackCanceled,
  addVisit,
  bookableDates,
  brokerSlots,
  cancelVisit,
  canceledNotices,
  checkBrokerVisit,
  defaultAvailability,
  kstNow,
  MAX_UPCOMING_PER_OFFER,
  openHoursOn,
  splitVisits,
  upcomingVisits,
  visibleVisits,
  type VisitBooking,
} from '../showing';
import { brokerVisitEvent, eventRange, foldIcsLine, googleCalendarUrl, ownerVisitEvent, toIcs, type CalendarEvent } from '@/lib/calendar';

// 2026-10-26 월요일
const today = '2026-10-26';
const now = new Date('2026-10-26T01:00:00Z');
const v = (id: string, offerId: string, date: string, hour: number, extra: Partial<VisitBooking> = {}): VisitBooking => ({ id, offerId, date, hour, ...extra });

describe('방문 일정 (⑤ 전화로 정해 저장)', () => {
  it('저장할 수 있는 날짜는 오늘부터 7일, 월이 바뀌어도 이어진다', () => {
    expect(bookableDates(today)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(bookableDates('2026-12-30', 3)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
  });

  it('거부 사유: 지난 날·7일 밖·시간 밖·다른 방문·2개 제한', () => {
    const list = [v('1', 'A', '2026-10-27', 19)];
    expect(checkBrokerVisit(list, { offerId: 'B', date: '2026-10-25', hour: 19 }, now)).toBe('PAST');
    expect(checkBrokerVisit(list, { offerId: 'B', date: '2026-11-02', hour: 19 }, now)).toBe('TOO_FAR');
    expect(checkBrokerVisit(list, { offerId: 'B', date: '2026-11-01', hour: 19 }, now)).toBeNull(); // 7일째는 됨
    expect(checkBrokerVisit(list, { offerId: 'B', date: '2026-10-27', hour: 12 }, now)).toBe('CLOSED_HOUR');
    expect(checkBrokerVisit(list, { offerId: 'B', date: '2026-10-27', hour: 19 }, now)).toBe('TAKEN');
    const two = [v('1', 'A', '2026-10-27', 19), v('2', 'A', '2026-10-28', 19)];
    expect(MAX_UPCOMING_PER_OFFER).toBe(2);
    expect(checkBrokerVisit(two, { offerId: 'A', date: '2026-10-29', hour: 19 }, now)).toBe('LIMIT');
    expect(checkBrokerVisit(two, { offerId: 'B', date: '2026-10-29', hour: 19 }, now)).toBeNull(); // 다른 중개사는 별도
  });

  it('오늘은 지금 시각까지 지난 것으로 본다 (한국 시간, now = 오늘 10시)', () => {
    expect(kstNow(now)).toEqual({ date: today, hour: 10 });
    expect(checkBrokerVisit([], { offerId: 'A', date: today, hour: 10 }, now)).toBe('PAST');
    expect(checkBrokerVisit([], { offerId: 'A', date: today, hour: 11 }, now)).toBeNull();
    // UTC로는 전날 밤이어도 한국 날짜 기준
    expect(kstNow(new Date('2026-10-25T16:30:00Z'))).toEqual({ date: today, hour: 1 });
    const slots = brokerSlots(defaultAvailability(), [], today, 'A', now);
    expect(slots.find((s) => s.hour === 10)?.state).toBe('PAST');
    expect(slots.find((s) => s.hour === 11)?.state).toBe('OPEN');
  });

  it('방문 가능 시간 밖이어도 전화로 정했으면 저장된다 (평일 오전)', () => {
    expect(checkBrokerVisit([], { offerId: 'A', date: '2026-10-27', hour: 10 }, now)).toBeNull();
  });

  it('지난 방문은 2개 제한에 세지 않는다', () => {
    const list = [v('1', 'A', '2026-10-20', 19), v('2', 'A', '2026-10-21', 19), v('3', 'A', '2026-10-27', 19)];
    expect(checkBrokerVisit(list, { offerId: 'A', date: '2026-10-28', hour: 19 }, now)).toBeNull();
  });

  it('취소: 중개사는 자기 것만, 집주인은 전부. 취소하면 칸이 비고 기록은 남는다', () => {
    const list = addVisit(addVisit([], { offerId: 'A', date: '2026-10-27', hour: 19 }, '1', now), { offerId: 'A', date: '2026-10-28', hour: 19 }, '2', now);
    expect(list[0].createdAt).toBe(now.toISOString());
    expect(cancelVisit(list, '1', { offerId: 'B' }, now)).toBe(list); // 남의 일정
    const c = cancelVisit(list, '1', { offerId: 'A' }, now);
    expect(c).toHaveLength(2); // 지우지 않음
    expect(c[0]).toMatchObject({ canceledBy: 'BROKER', ackedBy: ['A'] });
    expect(cancelVisit(c, '1', 'OWNER', now)).toBe(c); // 이미 취소됨
    expect(checkBrokerVisit(c, { offerId: 'A', date: '2026-10-29', hour: 19 }, now)).toBeNull(); // 2개 제한에서 빠짐
    expect(checkBrokerVisit(c, { offerId: 'B', date: '2026-10-27', hour: 19 }, now)).toBeNull(); // 그 시간도 다시 열림
    expect(openHoursOn(defaultAvailability(), '2026-10-27', c)).toContain(19);
    const byOwner = cancelVisit(list, '2', 'OWNER', now);
    expect(byOwner[1]).toMatchObject({ canceledBy: 'OWNER', ackedBy: ['OWNER'] });
  });

  it('취소 안내는 상대에게만, 확인하면 안내만 사라지고 기록은 남는다', () => {
    const c = cancelVisit([v('1', 'A', '2026-10-27', 19)], '1', { offerId: 'A' }, now);
    expect(canceledNotices(c, { offerId: 'A' })).toHaveLength(0); // 취소한 쪽
    expect(canceledNotices(c, 'OWNER')).toHaveLength(1);
    const acked = ackCanceled(c, '1', 'OWNER');
    expect(canceledNotices(acked, 'OWNER')).toHaveLength(0);
    expect(acked).toHaveLength(1);
    expect(splitVisits(acked, today).history).toHaveLength(1);
  });

  it('다가오는 일정 / 지난·취소된 일정 나누기', () => {
    const list = [
      v('past', 'A', '2026-10-20', 19),
      v('b', 'A', '2026-10-28', 18),
      v('a', 'B', '2026-10-27', 20),
      v('x', 'B', '2026-10-29', 19, { canceledAt: now.toISOString(), canceledBy: 'OWNER' }),
    ];
    expect(upcomingVisits(list, today).map((x) => x.id)).toEqual(['a', 'b']);
    expect(splitVisits(list, today).history.map((x) => x.id)).toEqual(['x', 'past']);
  });

  it('블라인드: 중개사는 자기 일정만 보고, 다른 중개사 시간은 TAKEN으로만', () => {
    const list = [v('1', 'A', '2026-10-27', 19), v('2', 'B', '2026-10-27', 20)];
    expect(visibleVisits(list, { offerId: 'A' }).map((x) => x.id)).toEqual(['1']);
    const slots = brokerSlots(defaultAvailability(), list, '2026-10-27', 'A', now);
    expect(slots.find((s) => s.hour === 19)).toMatchObject({ state: 'MINE', ownerOpen: true });
    expect(slots.find((s) => s.hour === 20)).toEqual({ hour: 20, state: 'TAKEN', ownerOpen: true });
    expect(slots.find((s) => s.hour === 10)).toMatchObject({ state: 'OPEN', ownerOpen: false }); // 평일 오전은 닫혀 있음
    expect(JSON.stringify(slots)).not.toContain('"B"');
  });
});

describe('캘린더 저장', () => {
  const visit = { id: 'v1', date: '2026-10-26', hour: 19 };

  it('한국 19시 → UTC 10시, 1시간짜리', () => {
    const e = ownerVisitEvent(visit, { officeName: '다산공인중개사', officePhone: '010-1234-5678', complexName: 'e편한세상다산' });
    expect(e.title).toBe('다산공인중개사 방문 · 복비');
    expect(eventRange(e)).toEqual({ start: '20261026T100000Z', end: '20261026T110000Z', allDay: false });
  });

  it('새벽 시각은 전날 UTC로 넘어간다', () => {
    expect(eventRange({ uid: 'x', title: 't', date: '2026-11-01', hour: 8 }).start).toBe('20261031T230000Z');
  });

  it('하루 종일 일정은 날짜만, 끝은 다음 날 (⑥ 잔금일)', () => {
    const e: CalendarEvent = { uid: 'bal', title: '잔금일', date: '2026-12-31' };
    expect(eventRange(e)).toEqual({ start: '20261231', end: '20270101', allDay: true });
    expect(toIcs(e, now)).toContain('DTSTART;VALUE=DATE:20261231\r\n');
  });

  it('.ics: 필수 줄, 알림, CRLF, 이스케이프, 메모에 연락처', () => {
    const e = ownerVisitEvent(visit, { officeName: '가나, 다라; 공인중개사', officePhone: '010-1234-5678', complexName: 'e편한세상다산' });
    const ics = toIcs(e, now);
    for (const k of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:visit-v1-owner@bokbi', 'DTSTAMP:20261026T010000Z', 'DTSTART:20261026T100000Z', 'TRIGGER:-PT60M', 'END:VCALENDAR'])
      expect(ics).toContain(k);
    expect(ics).toContain('SUMMARY:가나\\, 다라\\; 공인중개사 방문 · 복비');
    expect(ics).toContain('010-1234-5678');
    expect(ics).toContain('\\n중개사');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/); // 모든 줄바꿈이 CRLF
  });

  it('긴 줄은 75바이트로 접고 한글을 자르지 않는다', () => {
    const line = `SUMMARY:${'가'.repeat(40)}`;
    const folded = foldIcsLine(line);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('구글 링크: 제목·시간만, 연락처·동호수 없음', () => {
    const e = brokerVisitEvent(visit, { complexName: 'e편한세상다산', pyeongLabel: '34평', dongHo: '101동 1203호', phone: '010-9876-5432' });
    expect(e.title).toBe('e편한세상다산 34평 방문 · 복비');
    const url = googleCalendarUrl(e);
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get('text')).toBe(e.title);
    expect(q.get('dates')).toBe('20261026T100000Z/20261026T110000Z');
    expect(decodeURIComponent(url)).not.toContain('010-9876-5432');
    expect(decodeURIComponent(url)).not.toContain('1203');
    expect(toIcs(e, now)).toContain('101동 1203호'); // .ics 메모에만
  });
});
