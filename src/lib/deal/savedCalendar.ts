/**
 * 거래 날짜를 "이 휴대폰"에서 캘린더에 저장한 시각 (nextAction·cardStrip의 calendarSavedAt).
 * 서버에 올리지 않는다: 캘린더는 휴대폰마다 따로라서. 날짜가 바뀌면(datesChangedAt이 더 나중) 다시 안내된다
 */
export const DEAL_CALENDAR_KEY = 'bokbi_deal_calendar_saved';

export type SavedCalendarMap = Record<string, string>;

export const savedKey = (requestId: string, offerId: string) => `${requestId}:${offerId}`;

export function parseSavedCalendar(raw: string | null): SavedCalendarMap {
  try {
    const v = JSON.parse(raw ?? '{}') as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, at]) => typeof at === 'string')) as SavedCalendarMap;
  } catch {
    return {};
  }
}

export function loadSavedCalendar(): SavedCalendarMap {
  try {
    return parseSavedCalendar(localStorage.getItem(DEAL_CALENDAR_KEY));
  } catch {
    return {};
  }
}

export function markCalendarSaved(map: SavedCalendarMap, requestId: string, offerId: string, now: Date): SavedCalendarMap {
  const next = { ...map, [savedKey(requestId, offerId)]: now.toISOString() };
  try {
    localStorage.setItem(DEAL_CALENDAR_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저: 화면 안에서만 기억
  }
  return next;
}
