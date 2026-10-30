/**
 * 휴대폰 캘린더에 저장 (결정론·순수 함수, 대표님 2026-10-25)
 * 푸시·문자가 없는 MVP에서 알림을 휴대폰 캘린더가 대신한다. ⑤ 방문 일정, ⑥ 계약일·잔금일에 같이 쓴다
 * - .ics (RFC 5545): 휴대폰 안에서 만들어 내려받는다. 메모에 상대 연락처를 넣는다
 * - 구글 캘린더 링크: 내용이 주소창에 실려 구글로 넘어가므로 제목·시간만 (연락처·동호수 없음)
 * 시각은 한국 시간(UTC+9, 서머타임 없음)으로 받아 UTC로 바꿔 쓴다
 */
import { SITE_CONTENT } from '@/config/siteContent';

export interface CalendarEvent {
  uid: string;
  title: string;
  /** 'YYYY-MM-DD' (한국 날짜) */
  date: string;
  /** 0~23 한국 시각. 없으면 하루 종일 일정 */
  hour?: number;
  durationMin?: number;
  description?: string;
  alarmMinutesBefore?: number;
}

const KST_OFFSET_HOURS = 9;
const pad = (n: number) => String(n).padStart(2, '0');

const ymd = (date: string) => date.replace(/-/g, '');

function utcStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function kstToUtcMs(date: string, hour: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour - KST_OFFSET_HOURS);
}

function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** 시작·끝: 시간이 있으면 UTC 시각, 없으면 날짜(끝은 다음 날, RFC 5545 하루 종일 규칙) */
export function eventRange(e: CalendarEvent): { start: string; end: string; allDay: boolean } {
  if (e.hour === undefined) return { start: ymd(e.date), end: ymd(nextDate(e.date)), allDay: true };
  const startMs = kstToUtcMs(e.date, e.hour);
  return { start: utcStamp(startMs), end: utcStamp(startMs + (e.durationMin ?? 60) * 60_000), allDay: false };
}

/** TEXT 값 이스케이프 (\ ; , 줄바꿈) */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 한 줄 75바이트 넘으면 접기 (한글은 3바이트라 글자 중간에서 자르지 않게 글자 단위로 셈) */
export function foldIcsLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // 이어지는 줄은 맨 앞 공백 1바이트
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function veventLines(e: CalendarEvent, now: Date): string[] {
  const r = eventRange(e);
  return [
    'BEGIN:VEVENT',
    `UID:${e.uid}@bokbi`,
    `DTSTAMP:${utcStamp(now.getTime())}`,
    r.allDay ? `DTSTART;VALUE=DATE:${r.start}` : `DTSTART:${r.start}`,
    r.allDay ? `DTEND;VALUE=DATE:${r.end}` : `DTEND:${r.end}`,
    `SUMMARY:${escapeIcsText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeIcsText(e.description)}`] : []),
    ...(e.alarmMinutesBefore !== undefined
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(e.title)}`, `TRIGGER:-PT${e.alarmMinutesBefore}M`, 'END:VALARM']
      : []),
    'END:VEVENT',
  ];
}

/** 일정 여러 개를 파일 하나로 (거래 날짜 "캘린더에 모두 저장") */
export function toIcsMany(events: CalendarEvent[], now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bokbi//Calendar//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((e) => veventLines(e, now)),
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function toIcs(e: CalendarEvent, now: Date): string {
  return toIcsMany([e], now);
}

/** 구글 캘린더 "일정 추가" 링크: 제목·시간만 (메모·연락처는 넣지 않는다) */
export function googleCalendarUrl(e: CalendarEvent): string {
  const r = eventRange(e);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${r.start}/${r.end}`, ctz: 'Asia/Seoul' });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function icsFileName(e: CalendarEvent): string {
  return `bokbi-${ymd(e.date)}${e.hour !== undefined ? `-${pad(e.hour)}` : ''}.ics`;
}

// ── 방문 일정 (⑤) ─────────────────────────────────────────

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

// ── 거래 날짜 (계약일·중도금일·잔금일) ─────────────────────────

/** 하루 종일 일정의 알림: 전날 오전 9시 (자정 기준 15시간 전) */
export const DEAL_DATE_ALARM_MIN = 15 * 60;

/** 정해진 날짜만 하루 종일 일정으로. uid는 의뢰·요청·날짜 종류로 고정 (다시 저장해도 같은 일정으로 인식되게) */
export function dealDateEvents(
  ids: { requestId: string; offerId: string },
  dates: Partial<Record<'CONTRACT' | 'MIDDLE' | 'BALANCE', string | null>>,
  p: { complexName: string; pyeongLabel: string; dongHo: string; phone: string; officeName?: string },
  /** 집주인 캘린더는 어느 부동산인지 보이게 ("계약일 · OO공인중개사 · 복비") */
  viewer: 'BROKER' | 'OWNER' = 'BROKER',
): CalendarEvent[] {
  const c = SITE_CONTENT.brokerDeal;
  const o = SITE_CONTENT.myRequests.deal;
  return (['CONTRACT', 'MIDDLE', 'BALANCE'] as const).flatMap((f) => {
    const date = dates[f];
    if (!date) return [];
    const vars = { complex: p.complexName, pyeong: p.pyeongLabel, field: c.fields[f], office: p.officeName ?? '', dongHo: p.dongHo, phone: p.phone };
    return [
      {
        uid: `deal-${ids.requestId}-${ids.offerId}-${f.toLowerCase()}${viewer === 'OWNER' ? '-owner' : ''}`,
        title: fill(viewer === 'OWNER' ? o.calendarTitle : c.calendar.title, vars).replace(/\s+/g, ' ').trim(),
        date,
        description: fill(viewer === 'OWNER' ? o.calendarMemo : c.calendar.memo, vars),
        alarmMinutesBefore: DEAL_DATE_ALARM_MIN,
      },
    ];
  });
}

const VISIT_MIN = 60;
const VISIT_ALARM_MIN = 60;

/** 집주인 캘린더: 어느 부동산이 오는지 보이게 */
export function ownerVisitEvent(v: { id: string; date: string; hour: number }, p: { officeName: string; officePhone: string; complexName: string }): CalendarEvent {
  const c = SITE_CONTENT.calendar;
  return {
    uid: `visit-${v.id}-owner`,
    title: fill(c.ownerVisitTitle, { office: p.officeName }),
    date: v.date,
    hour: v.hour,
    durationMin: VISIT_MIN,
    description: fill(c.ownerVisitMemo, { complex: p.complexName, phone: p.officePhone }),
    alarmMinutesBefore: VISIT_ALARM_MIN,
  };
}

/** 중개사 캘린더: 어느 집인지 보이게 (동호수·전화는 .ics 메모에만) */
export function brokerVisitEvent(
  v: { id: string; date: string; hour: number },
  p: { complexName: string; pyeongLabel: string; dongHo: string; phone: string },
): CalendarEvent {
  const c = SITE_CONTENT.calendar;
  return {
    uid: `visit-${v.id}-broker`,
    title: fill(c.brokerVisitTitle, { complex: p.complexName, pyeong: p.pyeongLabel }).replace(/\s+/g, ' ').trim(),
    date: v.date,
    hour: v.hour,
    durationMin: VISIT_MIN,
    description: fill(c.brokerVisitMemo, { dongHo: p.dongHo, phone: p.phone }),
    alarmMinutesBefore: VISIT_ALARM_MIN,
  };
}
