/**
 * 서버 Supabase 클라이언트 (서버 액션·라우트): 요청의 세션 쿠키로 접속 → RLS가 "누구인지"로 판단. 서비스 키는 쓰지 않음
 */
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

export async function serverSupabase(): Promise<SupabaseClient | null> {
  const env = supabaseEnv();
  if (!env) return null;
  const jar = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        // 서버 컴포넌트에서 부르면 쿠키를 쓸 수 없다 — 세션 갱신은 미들웨어가 맡으므로 무시
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {}
      },
    },
  });
}
