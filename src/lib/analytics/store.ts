/**
 * 행동 기록 저장: 이 브라우저 저장소 + 서버(/api/events → 가명 해시 → Supabase events, 읽기는 관리자 RLS).
 * track은 형식·개인정보 검사를 통과한 이벤트만 저장하고, 막힌 이유를 돌려준다 (화면 동작은 막지 않음)
 */
import { rolesOf, validateEvent, type AnalyticsEvent, type EventName, type EventProps, type EventRole } from './events';
import { enqueueRemote } from './remote';

export const EVENTS_KEY = 'bokbi_events';
export const ANON_ID_KEY = 'bokbi_anon_id';
export const SESSION_ID_KEY = 'bokbi_session_id';
/** 브라우저 저장소에 남기는 최대 개수 (오래된 것부터 버림) */
export const LOCAL_EVENT_CAP = 2000;
export const APP_VERSION = '0.1.0';

export interface EventSink {
  append(e: AnalyticsEvent): void;
  all(): AnalyticsEvent[];
}

export function parseEvents(raw: string | null): AnalyticsEvent[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as AnalyticsEvent[]).filter((e) => e && typeof e === 'object' && validateEvent(e).length === 0) : [];
  } catch {
    return [];
  }
}

/** 상한을 넘으면 오래된 것부터 버린 새 배열 */
export function appendCapped(list: AnalyticsEvent[], e: AnalyticsEvent, cap = LOCAL_EVENT_CAP): AnalyticsEvent[] {
  const next = [...list, e];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

export const localSink: EventSink = {
  append(e) {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(appendCapped(parseEvents(localStorage.getItem(EVENTS_KEY)), e)));
    } catch {
      // 저장이 막힌 브라우저: 기록만 빠진다
    }
  },
  all() {
    try {
      return parseEvents(localStorage.getItem(EVENTS_KEY));
    } catch {
      return [];
    }
  },
};

const randomId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

function stickyId(storage: () => Storage, key: string): string {
  try {
    const s = storage();
    const v = s.getItem(key);
    if (v) return v;
    const id = randomId();
    s.setItem(key, id);
    return id;
  } catch {
    return 'anonymous';
  }
}

/** 이벤트 만들기 (순수: 시각·id를 받음). role을 안 주면 그 기록의 기본 쪽 */
export function buildEvent(
  name: EventName,
  props: EventProps,
  ctx: { id: string; at: Date; actorId: string; sessionId: string; requestId?: string | null; offerId?: string | null; role?: EventRole },
): AnalyticsEvent {
  return {
    id: ctx.id,
    at: ctx.at.toISOString(),
    name,
    role: ctx.role ?? rolesOf(name)[0],
    actorId: ctx.actorId,
    sessionId: ctx.sessionId,
    requestId: ctx.requestId ?? null,
    offerId: ctx.offerId ?? null,
    props,
    appVersion: APP_VERSION,
  };
}

/** 기본 저장: 이 브라우저 + 서버로 보낼 줄(remote.ts가 보낼지 정함 — 관리자·개발·자동 시험은 안 보냄) */
export const defaultSink: EventSink = {
  append(e) {
    localSink.append(e);
    enqueueRemote(e);
  },
  all: () => localSink.all(),
};

/** 화면에서 부르는 기록 함수. 형식이 틀리거나 개인정보가 섞이면 저장하지 않고 이유를 돌려준다 */
export function track(
  name: EventName,
  props: EventProps = {},
  ids: { requestId?: string | null; offerId?: string | null; role?: EventRole } = {},
  sink: EventSink = defaultSink,
): string[] {
  const e = buildEvent(name, props, {
    id: randomId(),
    at: new Date(),
    actorId: stickyId(() => localStorage, ANON_ID_KEY),
    sessionId: stickyId(() => sessionStorage, SESSION_ID_KEY),
    ...ids,
  });
  const errors = validateEvent(e);
  if (errors.length === 0) sink.append(e);
  return errors;
}
