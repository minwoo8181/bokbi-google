/**
 * 알림 문자 서버 연결 (B2, 서버 전용). 서버 키 + Solapi 키가 둘 다 있을 때만 보낸다 — 없으면 null (보내지 않고 화면 동작은 그대로).
 * 키는 배포 직전에 꽂는다 (대표님 원칙: 유료는 배포 직전)
 */
import { supabaseJsDb, type SupabaseLike } from '@/lib/data/supabase/supabaseJs';
import { sendSolapiSms, solapiConfig } from '@/lib/sms/solapi';
import { serviceSupabase, type ServerEnv } from '@/lib/supabase/serviceClient';
import type { NotifyDeps } from './deliver';

export function notifyDeps(env: ServerEnv = process.env): NotifyDeps | null {
  const client = serviceSupabase(env);
  const cfg = solapiConfig(env);
  if (!client || !cfg) return null;
  return {
    db: supabaseJsDb(client as unknown as SupabaseLike),
    async phoneOf(userId) {
      const { data } = await client.auth.admin.getUserById(userId);
      return data.user?.phone || null;
    },
    async sms(to, text) {
      const r = await sendSolapiSms(cfg, to, text);
      if (!r.ok) console.error('[notify] sms', r.error, r.detail);
      return r.ok;
    },
  };
}
