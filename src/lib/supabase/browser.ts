'use client';

/** 브라우저 Supabase 클라이언트 (로그인·세션 쿠키). 연결 설정이 없으면 null — 화면은 흉내 구현으로 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

let client: SupabaseClient | null | undefined;

export function browserSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = supabaseEnv();
  client = env ? createBrowserClient(env.url, env.key) : null;
  return client;
}
