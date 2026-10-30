/**
 * 관리자 웹 푸시 자동 발송 경로 (대표님 2026-10-29 A안). Supabase 예약 작업(pg_cron + pg_net)이 15분마다 POST로 부른다.
 * - 비밀값(PUSH_TICK_SECRET)이 맞아야만. 서버 키(SUPABASE_SECRET_KEY)는 복비에서 이 경로 한 곳만 쓴다 — 읽기 + 보낸 기록·기기 끄기만
 * - 오늘 할 일은 관리자 화면과 같은 규칙(todayItems)으로 센다. 문의·탈퇴 요청은 서버로 옮긴 뒤 포함
 * - 데이터 날짜(파일)는 배포 서버에 없어 서비스 확인은 키 없음만
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { keyStatus } from '@/lib/admin/keys';
import { serviceIssues } from '@/lib/admin/overview';
import { yesterdayCounts } from '@/lib/admin/push';
import { runPushTick, type PushDeviceRow, type SendResult } from '@/lib/admin/pushTick';
import { todayItems } from '@/lib/admin/today';
import { createSupabaseRepos } from '@/lib/data/supabase';
import { supabaseJsDb, type SupabaseLike } from '@/lib/data/supabase/supabaseJs';
import { parsePushPrefs, vapidFromEnv } from '@/lib/push/webPush';
import { deliverAll } from '@/lib/notify/deliver';
import { tickNotices } from '@/lib/notify/notices';
import { notifyDeps } from '@/lib/notify/server';

export const dynamic = 'force-dynamic';

/** 서버 키로 읽을 때 쓰는 자리 표시 id (어느 사용자와도 겹치지 않음) */
const SYSTEM_UID = '00000000-0000-0000-0000-000000000000';

const digest = (s: string) => createHash('sha256').update(s).digest();

/** "Bearer <비밀값>"과 같은지 (길이와 무관하게 같은 시간) */
export function bearerMatches(header: string | null, secret: string): boolean {
  return timingSafeEqual(digest(header ?? ''), digest(`Bearer ${secret}`));
}

export async function POST(request: Request) {
  const secret = (process.env.PUSH_TICK_SECRET ?? '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY;
  const vapid = vapidFromEnv(process.env, true, () => ({ publicKey: '', privateKey: '' }));
  if (!secret) return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
  if (!bearerMatches(request.headers.get('authorization'), secret)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!url || !serverKey || !vapid) return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });

  const client = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const repos = createSupabaseRepos({ db: supabaseJsDb(client as unknown as SupabaseLike), viewer: { uid: SYSTEM_UID, role: 'admin' } });
  const now = new Date();

  try {
    const result = await runPushTick({
      now,
      async devices() {
        const { data, error } = await client.from('admin_push_subscriptions').select('endpoint, p256dh, auth, prefs').eq('active', true);
        if (error) throw new Error(error.message);
        return (data ?? []).map((r): PushDeviceRow => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, prefs: parsePushPrefs(r.prefs) }));
      },
      async load() {
        const [requests, applications, log] = await Promise.all([repos.requests.list(now), repos.admin.applications(), repos.admin.actions()]);
        const deals = Object.fromEntries(await Promise.all(requests.map(async (r) => [r.id, await repos.deals.events(r.id)] as const)));
        return {
          items: todayItems({ application: null, applications, requests, deals, log, now }),
          issues: serviceIssues(keyStatus(process.env), []),
          signups: applications.filter((a) => a.status === 'PENDING').map((a) => ({ regNo: a.regNo, office: a.office })),
          yesterday: yesterdayCounts(requests, now),
        };
      },
      async sentToday(day) {
        const { data, error } = await client.from('admin_push_sent').select('key').eq('day', day);
        if (error) throw new Error(error.message);
        return (data ?? []).map((r) => r.key as string);
      },
      async send(device, m): Promise<SendResult> {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.key }),
            { vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey }, TTL: 3600, urgency: m.kind === 'OVERDUE' ? 'high' : 'normal' },
          );
          return 'OK';
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          return status === 404 || status === 410 ? 'GONE' : 'FAILED';
        }
      },
      async markSent(day, keys) {
        await client.from('admin_push_sent').upsert(keys.map((key) => ({ day, key })), { onConflict: 'day,key', ignoreDuplicates: true });
      },
      async deactivate(endpoint) {
        await client.from('admin_push_subscriptions').update({ active: false, updated_at: now.toISOString() }).eq('endpoint', endpoint);
      },
    });
    // B2: 같은 15분 예약 작업으로 시간이 된 알림 문자 (요청 받는 시간 끝·광고 기한 6시간 전). Solapi 키가 없으면 건너뜀, 실패해도 웹 푸시 결과는 그대로
    const notify = notifyDeps();
    const sms = notify ? await repos.requests.list(now).then((list) => deliverAll(notify, tickNotices(list, now))).catch(() => null) : null;
    return NextResponse.json({ ...result, sms });
  } catch {
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
