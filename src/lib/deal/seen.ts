/**
 * 거래 페이지를 이 휴대폰에서 마지막으로 연 시각 ("새 소식" 기준, 대표님 2026-10-26).
 * 서버에 올리지 않는다: 읽음은 기기마다. 목업에선 집주인·중개사가 같은 브라우저라 보는 사람별로 키를 나눈다
 */
import type { Viewer } from './deal';

export const DEAL_SEEN_KEY = 'bokbi_deal_seen';
export type SeenMap = Record<string, string>;

export const seenKey = (requestId: string, offerId: string, viewer: Viewer) => `${requestId}:${offerId}:${viewer}`;

export function parseSeen(raw: string | null): SeenMap {
  try {
    const v = JSON.parse(raw ?? '{}') as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter(([, at]) => typeof at === 'string')) as SeenMap;
  } catch {
    return {};
  }
}

export function loadSeen(): SeenMap {
  try {
    return parseSeen(localStorage.getItem(DEAL_SEEN_KEY));
  } catch {
    return {};
  }
}

export function markSeen(map: SeenMap, requestId: string, offerId: string, viewer: Viewer, now: Date): SeenMap {
  const next = { ...map, [seenKey(requestId, offerId, viewer)]: now.toISOString() };
  try {
    localStorage.setItem(DEAL_SEEN_KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저: 화면 안에서만 기억
  }
  return next;
}
