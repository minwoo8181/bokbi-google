/**
 * 관리자 관문 판정에 필요한 사실을 서버에서 모은다 (A5). 판정 규칙은 lib/admin/gate.ts.
 * getUser로 토큰을 Supabase에 확인하고, 인증 단계(aal)는 그 세션 토큰에서 읽는다
 */
import { adminGate, type AdminGate } from '@/lib/admin/gate';
import { serverSupabase } from '@/lib/supabase/server';

export async function currentAdminGate(): Promise<AdminGate> {
  const production = process.env.NODE_ENV === 'production';
  const client = await serverSupabase();
  if (!client) return adminGate({ backend: 'local', production, userId: null, role: null, verifiedTotp: 0, aal: null });

  const { data } = await client.auth.getUser();
  const user = data.user;
  if (!user) return adminGate({ backend: 'supabase', production, userId: null, role: null, verifiedTotp: 0, aal: null });

  const [profile, factors, level] = await Promise.all([
    client.from('profiles').select('role').eq('id', user.id).single(),
    client.auth.mfa.listFactors(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  return adminGate({
    backend: 'supabase',
    production,
    userId: user.id,
    role: (profile.data?.role as string | undefined) ?? null,
    verifiedTotp: factors.data?.totp.filter((f) => f.status === 'verified').length ?? 0,
    aal: level.data?.currentLevel ?? null,
  });
}
