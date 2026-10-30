/**
 * 방문 가능 시간 (대표님 합의 2026-10-24~25)
 * - 집주인: 매주 방문 시간(요일별 오전·오후·저녁, 최소 1칸) + 안 되는 날(기간, 최대 7일)
 *   전체 끄기 스위치는 없다: 끄면 "언제 볼 수 있는지"가 사라지기 때문. 오래 쉬려면 판매 상태 → 잠시 멈추기
 * - 중개사: 열린 시간대 안에서 1시간 단위로 방문 예약 → 바로 확정 (집주인은 취소 가능)
 * - 매칭된 중개사가 여러 곳이어도 같은 시간은 한 곳만. 다른 중개사가 잡은 시간은 누가 잡았는지 모르게 "예약된 시간"으로만
 * - 세입자 거주 집은 이 기능을 쓰지 않는다 (중개사가 세입자에게 직접 연락)
 * 순수 함수: 날짜는 'YYYY-MM-DD' 문자열, 시각은 0~23 정수
 */

export type DayPart = 'MORNING' | 'AFTERNOON' | 'EVENING';

export const DAY_PARTS: DayPart[] = ['MORNING', 'AFTERNOON', 'EVENING'];

/** 각 시간대에 예약 가능한 시작 시각 (1시간 단위) */
export const DAY_PART_HOURS: Record<DayPart, number[]> = {
  MORNING: [10, 11],
  AFTERNOON: [13, 14, 15, 16, 17],
  EVENING: [18, 19, 20],
};

/** 안 되는 날 한 번에 뺄 수 있는 최대 일수 (매칭 후 7일 보호 기간과 맞춤) */
export const MAX_BLOCK_DAYS = 7;

/** 0=일 … 6=토 (Date.getDay 와 같음) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface BlockedRange {
  start: string;
  end: string;
}

export interface ShowingAvailability {
  weekly: Record<Weekday, Record<DayPart, boolean>>;
  blocked: BlockedRange[];
}

/** 방문 일정을 본 사람: 집주인 또는 중개사(요청 id) */
export type VisitViewer = 'OWNER' | { offerId: string };

export interface VisitBooking {
  id: string;
  offerId: string;
  date: string;
  hour: number;
  /** 아래는 예전 저장분에 없을 수 있다 */
  createdAt?: string;
  /** 취소는 전화로 알리면서 한다. 기록은 지우지 않는다 (대표님 2026-10-25) */
  canceledAt?: string;
  /** SYSTEM: 집주인이 다른 중개사와의 가계약·계약을 확인해 자동 취소 (양쪽 모두 안내) */
  canceledBy?: 'OWNER' | 'BROKER' | 'SYSTEM';
  /** 시스템 취소 이유: ELSEWHERE = 다른 곳과 진행(복비 안 다른 중개사·밖에서 팔림, 중개사는 구별 못 함), WITHDRAWN = 집주인이 거둬들임, PAUSED = 집주인이 잠시 멈춤 */
  cancelReason?: 'ELSEWHERE' | 'WITHDRAWN' | 'PAUSED';
  /** "휴대폰 캘린더에서도 지워 주세요" 안내를 확인한 쪽 ('OWNER' 또는 offerId) */
  ackedBy?: string[];
}

export type BookingRejectReason = 'PAST' | 'BLOCKED_DATE' | 'CLOSED_SLOT' | 'TAKEN';
export type BlockRejectReason = 'EMPTY' | 'PAST' | 'END_BEFORE_START' | 'TOO_LONG';

const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_MS = 86_400_000;

export function defaultAvailability(): ShowingAvailability {
  const weekly = {} as ShowingAvailability['weekly'];
  for (const d of WEEKDAYS) {
    const weekend = d === 0 || d === 6;
    // 기본값: 평일 저녁 + 주말 오전·오후 (직장인 집주인 기준)
    weekly[d] = { MORNING: weekend, AFTERNOON: weekend, EVENING: !weekend };
  }
  return { weekly, blocked: [] };
}

const utc = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function weekdayOf(date: string): Weekday {
  return new Date(utc(date)).getUTCDay() as Weekday;
}

/** 시작~끝 포함 일수 */
export function daysInclusive(start: string, end: string): number {
  return Math.round((utc(end) - utc(start)) / DAY_MS) + 1;
}

export function dayPartOf(hour: number): DayPart | null {
  for (const p of DAY_PARTS) if (DAY_PART_HOURS[p].includes(hour)) return p;
  return null;
}

export function isDateBlocked(a: ShowingAvailability, date: string): boolean {
  return a.blocked.some((r) => r.start <= date && date <= r.end);
}

/** 이 날 이 시각에 방문을 받을 수 있는가 (예약 여부는 보지 않음) */
export function isSlotOpen(a: ShowingAvailability, date: string, hour: number): boolean {
  if (isDateBlocked(a, date)) return false;
  const part = dayPartOf(hour);
  return part !== null && a.weekly[weekdayOf(date)][part];
}

/** 이 날 아직 예약 가능한 시각 목록 */
export function openHoursOn(a: ShowingAvailability, date: string, bookings: VisitBooking[]): number[] {
  const taken = new Set(bookings.filter((b) => b.date === date && !b.canceledAt).map((b) => b.hour));
  return DAY_PARTS.flatMap((p) => DAY_PART_HOURS[p]).filter((h) => isSlotOpen(a, date, h) && !taken.has(h));
}

export function checkBooking(
  a: ShowingAvailability,
  bookings: VisitBooking[],
  req: { date: string; hour: number },
  today: string,
): BookingRejectReason | null {
  if (req.date < today) return 'PAST';
  if (isDateBlocked(a, req.date)) return 'BLOCKED_DATE';
  if (!isSlotOpen(a, req.date, req.hour)) return 'CLOSED_SLOT';
  if (bookings.some((b) => b.date === req.date && b.hour === req.hour && !b.canceledAt)) return 'TAKEN';
  return null;
}

/** 빼려는 기간에 이미 잡힌 예약 (빼기 전 안내용) */
export function bookingsInRange(bookings: VisitBooking[], r: BlockedRange): VisitBooking[] {
  return bookings.filter((b) => r.start <= b.date && b.date <= r.end && !b.canceledAt);
}

/**
 * 요일 표를 한 줄 요약용으로 묶는다: 평일(월~금)이 같으면 "평일", 주말(토·일)이 같으면 "주말", 아니면 요일별.
 * 열린 시간대가 없는 묶음은 뺀다. 문구는 화면에서 붙인다.
 */
export type WeeklyGroup = { days: 'WEEKDAYS' | 'WEEKEND' | Weekday; parts: DayPart[] };

export function summarizeWeekly(a: ShowingAvailability): WeeklyGroup[] {
  const partsOf = (d: Weekday) => DAY_PARTS.filter((p) => a.weekly[d][p]);
  const same = (ds: Weekday[]) => ds.every((d) => partsOf(d).join() === partsOf(ds[0]).join());
  const groups: WeeklyGroup[] = [];
  const weekdays: Weekday[] = [1, 2, 3, 4, 5];
  const weekend: Weekday[] = [6, 0];
  if (same(weekdays)) groups.push({ days: 'WEEKDAYS', parts: partsOf(1) });
  else for (const d of weekdays) groups.push({ days: d, parts: partsOf(d) });
  if (same(weekend)) groups.push({ days: 'WEEKEND', parts: partsOf(6) });
  else for (const d of weekend) groups.push({ days: d, parts: partsOf(d) });
  return groups.filter((g) => g.parts.length > 0);
}

/**
 * 열린 시간대를 시각 범위로 (방문 가능 시간 칩, 2026-10-27): 붙어 있는 시간대는 하나로 합친다.
 * 예: 오전+오후 → [10, 18], 저녁 → [18, 21], 오전+저녁 → [10, 12], [18, 21]. 끝은 마지막 예약 시각 + 1시간
 */
export function partHourRanges(parts: DayPart[]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of DAY_PARTS) {
    if (!parts.includes(p)) continue;
    const hs = DAY_PART_HOURS[p];
    const start = hs[0];
    const end = hs[hs.length - 1] + 1;
    const last = out[out.length - 1];
    // 오전 끝 12시 ~ 오후 시작 13시처럼 점심 1시간 틈은 붙은 것으로 본다
    if (last && start - last[1] <= 1) last[1] = end;
    else out.push([start, end]);
  }
  return out;
}

export function openSlotCount(a: ShowingAvailability): number {
  return WEEKDAYS.reduce<number>((n, d) => n + DAY_PARTS.filter((p) => a.weekly[d][p]).length, 0);
}

/** 마지막 남은 1칸은 끌 수 없다 (중개사가 언제 볼 수 있는지 항상 남게) */
export function canToggleOff(a: ShowingAvailability, day: Weekday, part: DayPart): boolean {
  return !a.weekly[day][part] || openSlotCount(a) > 1;
}

export function toggleWeekly(a: ShowingAvailability, day: Weekday, part: DayPart): ShowingAvailability {
  if (!canToggleOff(a, day, part)) return a;
  return { ...a, weekly: { ...a.weekly, [day]: { ...a.weekly[day], [part]: !a.weekly[day][part] } } };
}

export function checkBlockedRange(r: Partial<BlockedRange>, today: string): BlockRejectReason | null {
  if (!r.start || !r.end) return 'EMPTY';
  if (r.start < today) return 'PAST';
  if (r.end < r.start) return 'END_BEFORE_START';
  if (daysInclusive(r.start, r.end) > MAX_BLOCK_DAYS) return 'TOO_LONG';
  return null;
}

/** 기간 추가 (검사는 checkBlockedRange로 먼저). 같은 기간 중복은 무시, 시작일 순 정렬 */
export function addBlockedRange(a: ShowingAvailability, r: BlockedRange): ShowingAvailability {
  if (a.blocked.some((b) => b.start === r.start && b.end === r.end)) return a;
  return { ...a, blocked: [...a.blocked, r].sort((x, y) => x.start.localeCompare(y.start)) };
}

export function removeBlockedRange(a: ShowingAvailability, r: BlockedRange): ShowingAvailability {
  return { ...a, blocked: a.blocked.filter((b) => !(b.start === r.start && b.end === r.end)) };
}

/** 지난 기간은 목록에서 뺀다 (끝나면 저절로 다시 열림) */
export function activeBlocked(a: ShowingAvailability, today: string): BlockedRange[] {
  return a.blocked.filter((r) => r.end >= today);
}

// ── 방문 일정 (⑤, 대표님 2026-10-25) ─────────────────────────────
// 중개사가 집주인과 전화로 정한 시간을 저장 → 집주인 화면에 보이고 양쪽 다 휴대폰 캘린더에 저장.
// 푸시·문자가 없어서 화면에서 바로 확정하는 예약은 두지 않는다. 취소도 전화로 알리면서 한다

/** 오늘부터 며칠 안의 날짜만 저장 */
export const BOOKING_DAYS = 7;
/** 한 중개사가 한 매물에 앞으로 잡아 둘 수 있는 방문 수 (좋은 시간을 한 곳이 다 잡지 않게) */
export const MAX_UPCOMING_PER_OFFER = 2;
/** 저장할 수 있는 시각 (방문 가능 시간 밖이어도 전화로 정했으면 저장 가능) */
export const VISIT_HOURS: number[] = DAY_PARTS.flatMap((p) => DAY_PART_HOURS[p]);

export type VisitRejectReason = 'PAST' | 'TOO_FAR' | 'CLOSED_HOUR' | 'TAKEN' | 'LIMIT';

const addDays = (date: string, n: number) => new Date(utc(date) + n * DAY_MS).toISOString().slice(0, 10);

/** 한국 시간 기준 오늘 날짜와 지금 시각 (UTC+9, 서머타임 없음) */
export function kstNow(now: Date): { date: string; hour: number } {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  return { date: k.toISOString().slice(0, 10), hour: k.getUTCHours() };
}

/** 이미 시작했거나 지난 시각 (오늘이면 지금 시각까지) */
const isPastSlot = (date: string, hour: number, now: Date) => {
  const k = kstNow(now);
  return date < k.date || (date === k.date && hour <= k.hour);
};

/** 오늘 포함 days일 */
export function bookableDates(today: string, days = BOOKING_DAYS): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, i));
}

const isLive = (v: VisitBooking) => !v.canceledAt;

/** 취소 안 됐고 오늘 이후인 일정, 시간 순 */
export function upcomingVisits(bookings: VisitBooking[], today: string): VisitBooking[] {
  return bookings
    .filter((v) => isLive(v) && v.date >= today)
    .sort((x, y) => x.date.localeCompare(y.date) || x.hour - y.hour);
}

/** 다가오는 일정 / 지난·취소된 일정(최근 순) */
export function splitVisits(bookings: VisitBooking[], today: string): { upcoming: VisitBooking[]; history: VisitBooking[] } {
  const upcoming = upcomingVisits(bookings, today);
  const history = bookings
    .filter((v) => !upcoming.includes(v))
    .sort((x, y) => y.date.localeCompare(x.date) || y.hour - x.hour);
  return { upcoming, history };
}

export function checkBrokerVisit(
  bookings: VisitBooking[],
  req: { offerId: string; date: string; hour: number },
  now: Date,
): VisitRejectReason | null {
  const today = kstNow(now).date;
  if (isPastSlot(req.date, req.hour, now)) return 'PAST';
  if (req.date > addDays(today, BOOKING_DAYS - 1)) return 'TOO_FAR';
  if (!VISIT_HOURS.includes(req.hour)) return 'CLOSED_HOUR';
  const live = upcomingVisits(bookings, today);
  if (live.some((b) => b.date === req.date && b.hour === req.hour)) return 'TAKEN';
  if (live.filter((b) => b.offerId === req.offerId).length >= MAX_UPCOMING_PER_OFFER) return 'LIMIT';
  return null;
}

/** 검사는 checkBrokerVisit로 먼저 */
export function addVisit(
  bookings: VisitBooking[],
  req: { offerId: string; date: string; hour: number },
  id: string,
  now: Date,
): VisitBooking[] {
  return [...bookings, { id, offerId: req.offerId, date: req.date, hour: req.hour, createdAt: now.toISOString() }];
}

/**
 * 취소 (전화를 거는 순간 함께). 중개사는 자기 일정만, 집주인은 자기 집 일정 모두.
 * 이미 취소됐거나 권한이 없으면 그대로 돌려준다. 취소한 쪽은 안내를 본 것으로 친다
 */
export function cancelVisit(bookings: VisitBooking[], id: string, by: VisitViewer, now: Date): VisitBooking[] {
  const target = bookings.find((v) => v.id === id);
  if (!target || target.canceledAt) return bookings;
  if (by !== 'OWNER' && target.offerId !== by.offerId) return bookings;
  const viewerKey = by === 'OWNER' ? 'OWNER' : by.offerId;
  return bookings.map((v) =>
    v.id === id
      ? { ...v, canceledAt: now.toISOString(), canceledBy: by === 'OWNER' ? 'OWNER' : 'BROKER', ackedBy: [viewerKey] }
      : v,
  );
}

/**
 * 자동 취소 (집주인이 다른 중개사와의 가계약·계약을 확인했을 때). 기록은 남기고, 아무도 확인하지 않은 상태라
 * 집주인·그 중개사 모두 "휴대폰 캘린더에서도 지워 주세요" 안내를 본다
 */
export function systemCancelVisits(bookings: VisitBooking[], ids: string[], reason: NonNullable<VisitBooking['cancelReason']>, now: Date): VisitBooking[] {
  const set = new Set(ids);
  return bookings.map((v) =>
    set.has(v.id) && !v.canceledAt ? { ...v, canceledAt: now.toISOString(), canceledBy: 'SYSTEM', cancelReason: reason, ackedBy: [] } : v,
  );
}

const keyOf = (viewer: VisitViewer) => (viewer === 'OWNER' ? 'OWNER' : viewer.offerId);

/** 이 사람이 볼 수 있는 일정: 집주인은 전부, 중개사는 자기 것만 */
export function visibleVisits(bookings: VisitBooking[], viewer: VisitViewer): VisitBooking[] {
  return viewer === 'OWNER' ? bookings : bookings.filter((v) => v.offerId === viewer.offerId);
}

/** 상대가 취소했는데 아직 "캘린더에서도 지워 주세요"를 확인하지 않은 일정 (기록은 그대로 남는다) */
export function canceledNotices(bookings: VisitBooking[], viewer: VisitViewer): VisitBooking[] {
  const key = keyOf(viewer);
  return visibleVisits(bookings, viewer).filter((v) => v.canceledAt && !(v.ackedBy ?? []).includes(key));
}

export function ackCanceled(bookings: VisitBooking[], id: string, viewer: VisitViewer): VisitBooking[] {
  const key = keyOf(viewer);
  return bookings.map((v) => (v.id === id && v.canceledAt && !(v.ackedBy ?? []).includes(key) ? { ...v, ackedBy: [...(v.ackedBy ?? []), key] } : v));
}

/** 중개사 시간 버튼 상태: 다른 중개사 일정은 누구인지 없이 TAKEN만 (블라인드), 오늘 지난 시각은 PAST */
export type BrokerSlotState = 'OPEN' | 'MINE' | 'TAKEN' | 'PAST';

export function brokerSlots(
  a: ShowingAvailability,
  bookings: VisitBooking[],
  date: string,
  offerId: string,
  now: Date,
): Array<{ hour: number; state: BrokerSlotState; ownerOpen: boolean }> {
  const live = upcomingVisits(bookings, kstNow(now).date).filter((v) => v.date === date);
  return VISIT_HOURS.map((hour) => {
    const hit = live.find((v) => v.hour === hour);
    const state: BrokerSlotState = hit ? (hit.offerId === offerId ? 'MINE' : 'TAKEN') : isPastSlot(date, hour, now) ? 'PAST' : 'OPEN';
    return { hour, state, ownerOpen: isSlotOpen(a, date, hour) };
  });
}
