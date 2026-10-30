/**
 * 행동 기록 서버 저장 (서버 전용, A7 2026-10-29 대표님 "복비 서버가 받아 저장").
 * - 받은 기록은 같은 형식·개인정보 검사(validateEvent)를 다시 통과해야 함 (브라우저 검사는 믿지 않음)
 * - 사람 id(브라우저 익명 id)는 원문을 저장하지 않고 HMAC-SHA256(EVENTS_HASH_SECRET) 가명 해시로만
 * - 쓰기는 서버 키 클라이언트(lib/supabase/serviceClient.ts)로만 — DB events 표는 service_role만 insert (core_tables.sql)
 * - 비밀값·서버 키가 없거나 스위치가 local이면 저장하지 않음 (해시 없이 원문을 남기지 않게)
 */
import { createHmac, randomUUID } from 'node:crypto';
import { serviceSupabase, type ServerEnv } from '@/lib/supabase/serviceClient';
import { validateEvent, type AnalyticsEvent, type EventName, type EventProps } from './events';
import { buildEvent } from './store';

export const SERVER_BATCH_MAX = 20;
/** 브라우저 시계가 이만큼 넘게 어긋나면 서버 시각으로 */
const CLOCK_SKEW_MS = 24 * 3_600_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EventRow {
  at: string;
  name: string;
  role: string;
  actor_hash: string;
  session_id: string;
  request_id: string | null;
  offer_id: string | null;
  props: EventProps;
  app_version: string;
}

export const actorHash = (actorId: string, secret: string): string => createHmac('sha256', secret).update(actorId).digest('hex');

/** 기록 한 줄 → DB 한 줄 (순수). 의뢰·카드 id는 서버 id(uuid)일 때만 */
export function toRow(e: AnalyticsEvent, secret: string, now: Date): EventRow {
  const at = Date.parse(e.at);
  return {
    at: Math.abs(at - now.getTime()) > CLOCK_SKEW_MS ? now.toISOString() : new Date(at).toISOString(),
    name: e.name,
    role: e.role,
    actor_hash: actorHash(e.actorId, secret),
    session_id: e.sessionId.slice(0, 64),
    request_id: e.requestId && UUID.test(e.requestId) ? e.requestId : null,
    offer_id: e.offerId && UUID.test(e.offerId) ? e.offerId : null,
    props: e.props,
    app_version: e.appVersion.slice(0, 40),
  };
}

/**
 * 브라우저가 보낸 묶음 → 저장할 줄 (순수). 최대 20개, 검사 통과한 것만.
 * 관리자 기록(admin_action)은 받지 않음 — 관리자 처리는 audit.admin_actions에 따로 남고, 관리자 브라우저는 보내지도 않는다
 */
export function prepareBatch(body: unknown, secret: string, now: Date): { rows: EventRow[]; dropped: number } {
  const list = body && typeof body === 'object' && Array.isArray((body as { events?: unknown }).events) ? ((body as { events: unknown[] }).events) : [];
  const rows: EventRow[] = [];
  let dropped = Math.max(0, list.length - SERVER_BATCH_MAX);
  for (const raw of list.slice(0, SERVER_BATCH_MAX)) {
    const e = raw as AnalyticsEvent;
    const ok =
      !!e && typeof e === 'object' && e.props && typeof e.props === 'object' && !Array.isArray(e.props) &&
      typeof e.actorId === 'string' && typeof e.sessionId === 'string' && typeof e.appVersion === 'string' &&
      e.role !== 'admin' && validateEvent(e).length === 0;
    if (ok) rows.push(toRow(e, secret, now));
    else dropped += 1;
  }
  return { rows, dropped };
}

export type InsertResult = 'OK' | 'NOT_CONFIGURED' | 'FAILED';

/** 해시 비밀값 (없으면 저장하지 않음) */
export function hashSecret(env: ServerEnv = process.env): string | null {
  const s = (env.EVENTS_HASH_SECRET ?? '').trim();
  return env.NEXT_PUBLIC_DATA_BACKEND === 'supabase' && s.length >= 16 ? s : null;
}

export async function insertEvents(rows: EventRow[], env: ServerEnv = process.env): Promise<InsertResult> {
  const client = serviceSupabase(env);
  if (!client) return 'NOT_CONFIGURED';
  if (rows.length === 0) return 'OK';
  try {
    const { error } = await client.from('events').insert(rows);
    return error ? 'FAILED' : 'OK';
  } catch {
    return 'FAILED';
  }
}

/** 서버에서 생긴 기록 (AI 설명·외부 서비스 오류). 배포 빌드에서만, 실패해도 조용히 */
export async function recordServerEvent(name: EventName, props: EventProps, env: ServerEnv = process.env): Promise<void> {
  const secret = hashSecret(env);
  if (!secret || process.env.NODE_ENV !== 'production') return;
  const now = new Date();
  const e = buildEvent(name, props, { id: randomUUID(), at: now, actorId: 'server', sessionId: 'server' });
  if (validateEvent(e).length > 0) return;
  await insertEvents([toRow(e, secret, now)], env);
}
