'use server';

/**
 * 관리자 웹 푸시 서버 동작: 공개 키 주기 · 기기 저장/끄기 · 알림 종류 저장 · 시험 알림 보내기.
 * 모두 관리자 관문(A5)을 통과해야 한다. Supabase가 꺼져 있으면(목업) 기기·설정은 이 브라우저에만 두고 시험 알림만 보낸다.
 * 자동 발송(10분마다 planPushes → 보내기)은 다음 단계: 예약 작업이 서버 키로 기기 목록을 읽는다
 */
import webpush from 'web-push';
import { SITE_CONTENT } from '@/config/siteContent';
import type { PushPrefs } from '@/lib/admin/push';
import { parsePushDevice, parsePushPrefs, vapidFromEnv } from '@/lib/push/webPush';
import { serverSupabase } from '@/lib/supabase/server';
import { currentAdminGate } from '../adminGate';

const TABLE = 'admin_push_subscriptions';
type Fail<E extends string> = { ok: false; error: E };

/** 개발 서버 임시 키 (서버를 다시 켜면 바뀜) */
let devKeys: { publicKey: string; privateKey: string } | null = null;
const vapid = () => vapidFromEnv(process.env, process.env.NODE_ENV === 'production', () => (devKeys ??= webpush.generateVAPIDKeys()));

const allowed = async () => (await currentAdminGate()) === 'OPEN';

export async function pushPublicKey(): Promise<{ ok: true; key: string } | Fail<'NOT_ALLOWED' | 'NO_KEY'>> {
  if (!(await allowed())) return { ok: false, error: 'NOT_ALLOWED' };
  const v = vapid();
  return v ? { ok: true, key: v.publicKey } : { ok: false, error: 'NO_KEY' };
}

/** 기기 켜기 (같은 기기는 다시 켬). Supabase는 insert, 이미 있으면 바꿀 수 있는 칸만 update (주소·주인은 못 바꿈) */
export async function savePushDevice(raw: unknown, rawPrefs: unknown): Promise<{ ok: true } | Fail<'NOT_ALLOWED' | 'INVALID' | 'FAILED'>> {
  if (!(await allowed())) return { ok: false, error: 'NOT_ALLOWED' };
  const device = parsePushDevice(raw);
  if (!device) return { ok: false, error: 'INVALID' };
  const client = await serverSupabase();
  if (!client) return { ok: true };
  const { data } = await client.auth.getUser();
  if (!data.user) return { ok: false, error: 'NOT_ALLOWED' };
  const prefs = parsePushPrefs(rawPrefs);
  const ins = await client.from(TABLE).insert({ endpoint: device.endpoint, user_id: data.user.id, p256dh: device.keys.p256dh, auth: device.keys.auth, prefs });
  if (!ins.error) return { ok: true };
  if (ins.error.code !== '23505') return { ok: false, error: 'FAILED' };
  const upd = await client
    .from(TABLE)
    .update({ p256dh: device.keys.p256dh, auth: device.keys.auth, prefs, active: true, updated_at: new Date().toISOString() })
    .eq('endpoint', device.endpoint);
  return upd.error ? { ok: false, error: 'FAILED' } : { ok: true };
}

/** 기기 끄기 / 알림 종류 바꾸기 (목업은 할 일 없음) */
export async function updatePushDevice(endpoint: string, change: { active?: boolean; prefs?: PushPrefs }): Promise<{ ok: true } | Fail<'NOT_ALLOWED' | 'FAILED'>> {
  if (!(await allowed())) return { ok: false, error: 'NOT_ALLOWED' };
  const client = await serverSupabase();
  if (!client) return { ok: true };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof change.active === 'boolean') patch.active = change.active;
  if (change.prefs) patch.prefs = parsePushPrefs(change.prefs);
  const r = await client.from(TABLE).update(patch).eq('endpoint', String(endpoint ?? ''));
  return r.error ? { ok: false, error: 'FAILED' } : { ok: true };
}

/** 시험 알림: 이 기기로 지금 한 번 */
export async function sendTestPush(raw: unknown): Promise<{ ok: true } | Fail<'NOT_ALLOWED' | 'INVALID' | 'NO_KEY' | 'GONE' | 'FAILED'>> {
  if (!(await allowed())) return { ok: false, error: 'NOT_ALLOWED' };
  const device = parsePushDevice(raw);
  if (!device) return { ok: false, error: 'INVALID' };
  const v = vapid();
  if (!v) return { ok: false, error: 'NO_KEY' };
  const t = SITE_CONTENT.adminConsole.push;
  try {
    await webpush.sendNotification(device, JSON.stringify({ title: t.testTitle, body: t.testBody, url: '/admin?tab=system', tag: 'bokbi-test' }), {
      vapidDetails: { subject: v.subject, publicKey: v.publicKey, privateKey: v.privateKey },
      TTL: 600,
    });
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404·410 = 브라우저가 이 기기 주소를 버림 (다시 켜야 함)
    return { ok: false, error: status === 404 || status === 410 ? 'GONE' : 'FAILED' };
  }
}
