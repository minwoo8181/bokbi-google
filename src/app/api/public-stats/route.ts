/**
 * 홈 숫자 카드용 공개 집계 (lib/home/homeStats.ts). 로그인 없이 Supabase public_stats(합계·개수만)를 읽는다.
 * Supabase 연결 전(스위치 local)이거나 실패하면 매칭 0건 → 카드는 1단계 사실 숫자. 1분 캐시
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EMPTY_LIVE, parseLiveStats, type LiveStats } from '@/lib/home/homeStats';

export const dynamic = 'force-dynamic';

const reply = (body: LiveStats) => NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.NEXT_PUBLIC_DATA_BACKEND !== 'supabase' || !url || !key) return reply(EMPTY_LIVE);
  try {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await client.rpc('public_stats');
    return reply(error ? EMPTY_LIVE : parseLiveStats(data));
  } catch {
    return reply(EMPTY_LIVE);
  }
}
