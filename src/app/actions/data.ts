'use server';

/**
 * 저장소 서버 액션 (A2): 브라우저 프록시(lib/data/remote.ts)가 부른다. 기능 스위치 NEXT_PUBLIC_DATA_BACKEND=supabase일 때만 쓰임.
 * - 사용자 세션(쿠키)으로 만든 Supabase 클라이언트 → RLS가 권한을 판단. 서버 키는 거래 기록 뒤 사무소 실적 다시 세기(A10)에만
 * - 연락처 암호화 키(CONTACT_ENC_KEY)는 서버 비밀값, 복호화도 여기서만
 * - 부를 수 있는 메서드는 목록(remoteMethods.ts)에 있는 것만. 인자 형식 검사를 서버로 옮기는 일은 A9
 */
import { createSupabaseRepos, type Viewer } from '@/lib/data/supabase';
import { createContactCrypto, parseKeys } from '@/lib/data/supabase/crypto';
import { supabaseJsDb, type SupabaseLike } from '@/lib/data/supabase/supabaseJs';
import { isRemoteMethod } from '@/lib/data/remoteMethods';
import { serverSupabase } from '@/lib/supabase/server';
import { serviceSupabase } from '@/lib/supabase/serviceClient';
import { refreshPromiseForOffer } from '@/lib/broker/officeStats';
import { after } from 'next/server';
import { deliverAll, noticesAfter } from '@/lib/notify/deliver';
import { notifyDeps } from '@/lib/notify/server';

async function serverRepos() {
  const client = await serverSupabase();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data } = await client.auth.getUser();
  if (!data.user) throw new Error('NOT_SIGNED_IN');
  const profile = await client.from('profiles').select('role').eq('id', data.user.id).single();
  const viewer: Viewer = { uid: data.user.id, role: (profile.data?.role as Viewer['role'] | undefined) ?? 'owner' };
  const raw = process.env.CONTACT_ENC_KEY;
  const contacts = raw ? await createContactCrypto(parseKeys(raw).keys, parseKeys(raw).current) : undefined;
  return createSupabaseRepos({ db: supabaseJsDb(client as unknown as SupabaseLike), viewer, contacts });
}

export async function repoCall(group: string, method: string, args: unknown[]): Promise<unknown> {
  if (!isRemoteMethod(group, method) || !Array.isArray(args)) throw new Error('UNKNOWN_METHOD');
  const repos = await serverRepos();
  const target = repos[group] as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const result = await target[method](...args);
  // A10: 거래 기록이 추가되면(위에서 권한 확인·저장 끝) 그 사무소 실적을 서버 키로 다시 셈. 실패해도 저장 결과는 그대로
  if (group === 'deals' && method === 'append' && typeof args[1] === 'string') {
    const service = serviceSupabase();
    if (service) await refreshPromiseForOffer(supabaseJsDb(service as unknown as SupabaseLike), args[1]).catch(() => null);
  }
  // B2: 성공한 동작 뒤 알림 문자 (서버 키·Solapi 키가 있을 때만, 응답을 보낸 뒤에)
  const notify = notifyDeps();
  if (notify) after(async () => void (await deliverAll(notify, await noticesAfter(notify.db, { group, method, args }, result).catch(() => []))));
  return result;
}
