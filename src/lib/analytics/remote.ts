/**
 * 행동 기록을 서버(/api/events)로 모아 보내기 (브라우저 전용). 보낼지 말지는 serverSendAllowed (대표님 2026-10-29):
 * 배포 빌드 + Supabase 스위치 + 실제 주소일 때만, 관리자 관문을 통과한 브라우저·자동 시험(webdriver)은 안 보냄.
 * 10개 모이거나 3초 지나면 보내고, 화면을 떠날 때 남은 것을 sendBeacon으로 보낸다. 실패하면 버린다 (화면 동작은 막지 않음)
 */
import type { AnalyticsEvent } from './events';

export const EVENTS_ENDPOINT = '/api/events';
/** 이 브라우저는 서버로 기록을 보내지 않음 (관리자 관문 통과 때 남김) */
export const NO_TRACK_KEY = 'bokbi_no_track';
/** 한 번에 보내는 최대 개수 (서버도 같은 상한) */
export const BATCH_MAX = 20;
const FLUSH_AT = 10;
const FLUSH_MS = 3000;

export interface SendEnv {
  production: boolean;
  backend: string | undefined;
  hostname: string;
  webdriver: boolean;
  noTrack: boolean;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/;

/** 서버로 보낼지 (순수) */
export function serverSendAllowed(env: SendEnv): boolean {
  return env.production && env.backend === 'supabase' && !LOCAL_HOST.test(env.hostname) && !env.webdriver && !env.noTrack;
}

function currentEnv(): SendEnv | null {
  if (typeof window === 'undefined') return null;
  let noTrack = false;
  try {
    noTrack = localStorage.getItem(NO_TRACK_KEY) === '1';
  } catch {
    // 저장소가 막힌 브라우저: 표시도 못 읽음
  }
  return {
    production: process.env.NODE_ENV === 'production',
    backend: process.env.NEXT_PUBLIC_DATA_BACKEND,
    hostname: window.location.hostname,
    webdriver: !!navigator.webdriver,
    noTrack,
  };
}

/** 관리자 화면에서 부름: 이 브라우저의 기록은 앞으로 서버로 보내지 않는다 */
export function markNoTrack(): void {
  try {
    localStorage.setItem(NO_TRACK_KEY, '1');
  } catch {
    // 저장이 막힌 브라우저: 관리자 화면 자체는 기록하지 않으니 그대로
  }
}

const queue: AnalyticsEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

function flush(beacon: boolean): void {
  if (timer) clearTimeout(timer);
  timer = null;
  while (queue.length > 0) {
    const body = JSON.stringify({ events: queue.splice(0, BATCH_MAX) });
    try {
      if (beacon && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(EVENTS_ENDPOINT, new Blob([body], { type: 'application/json' }))) continue;
      void fetch(EVENTS_ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    } catch {
      // 네트워크 막힘: 버림
    }
  }
}

export function enqueueRemote(e: AnalyticsEvent): void {
  const env = currentEnv();
  if (!env || !serverSendAllowed(env)) return;
  queue.push(e);
  if (!listening) {
    listening = true;
    window.addEventListener('pagehide', () => flush(true));
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true));
  }
  if (queue.length >= FLUSH_AT) flush(false);
  else if (!timer) timer = setTimeout(() => flush(false), FLUSH_MS);
}
