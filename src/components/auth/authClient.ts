'use client';

/**
 * 화면이 쓰는 휴대폰 인증 하나 (A1). 기능 스위치 NEXT_PUBLIC_DATA_BACKEND=supabase이고 연결 설정이 있으면 Supabase Auth, 아니면 흉내
 */
import { createLocalAuth } from '@/lib/auth/local';
import type { AuthPort } from '@/lib/auth/port';
import { createSupabaseAuth, type SupabaseAuthLike } from '@/lib/auth/supabase';
import { browserSupabase } from '@/lib/supabase/browser';

const sb = browserSupabase();

export const AUTH_BACKEND: 'local' | 'supabase' = sb ? 'supabase' : 'local';
export const authClient: AuthPort = sb ? createSupabaseAuth(sb as unknown as SupabaseAuthLike) : createLocalAuth();
