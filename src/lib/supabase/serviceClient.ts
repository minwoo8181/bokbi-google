/**
 * 서버 키(SUPABASE_SECRET_KEY) Supabase 클라이언트 — 서버 전용. 복비에서 서버 키를 읽는 곳은 이 파일과 웹 푸시 발송 경로 두 곳뿐 (테스트가 막음).
 * 쓰는 곳: 행동 기록 저장(lib/analytics/serverStore.ts), 중개사 가입 신청·잠금(app/agent/register/actions.ts) — 둘 다 로그인 전·RLS 밖에서 서버만 해야 하는 일
 * 스위치가 local이거나 주소·키가 없으면 null
 */
import { createHmac } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ServerEnv = Record<string, string | undefined>;

export function serviceSupabase(env: ServerEnv = process.env): SupabaseClient | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (env.NEXT_PUBLIC_DATA_BACKEND !== 'supabase' || !url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 원문을 남기면 안 되는 값(접속 주소 등)의 가명 — 서버 키로 HMAC. 키가 없으면 null */
export function serverPseudonym(purpose: string, value: string, env: ServerEnv = process.env): string | null {
  const key = env.SUPABASE_SECRET_KEY;
  return key ? createHmac('sha256', key).update(`${purpose}:${value}`).digest('hex') : null;
}
