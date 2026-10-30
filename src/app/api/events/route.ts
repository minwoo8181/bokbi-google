/**
 * 행동 기록 받기 (A7). 브라우저가 모아 보낸 기록(최대 20개) → 형식·개인정보 다시 검사 → 가명 해시 → Supabase events.
 * 스위치 local·비밀값 없음이면 저장하지 않고 204 (화면은 신경 쓰지 않음). 본문 32KB 넘으면 413
 */
import { NextResponse } from 'next/server';
import { hashSecret, insertEvents, prepareBatch } from '@/lib/analytics/serverStore';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: 'TOO_LARGE' }, { status: 413 });
  const secret = hashSecret();
  if (!secret) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }
  const { rows } = prepareBatch(body, secret, new Date());
  const r = await insertEvents(rows);
  return r === 'FAILED' ? NextResponse.json({ error: 'FAILED' }, { status: 502 }) : new NextResponse(null, { status: 204 });
}
