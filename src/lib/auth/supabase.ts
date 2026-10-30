/**
 * 휴대폰 인증 Supabase 구현 (A1): signInWithOtp → verifyOtp → 세션 쿠키. 문자 발송은 Supabase가 Send SMS Hook으로
 * 우리 서버(/api/auth/sms-hook → Solapi)에 맡김. 요청 한도·만료·재시도 잠금은 Supabase Auth가 처리
 */
import type { AuthPort, AuthUser } from './port';
import { authErrorFromSupabase, toE164Kr } from './phone';

type AuthErrorLike = { code?: string; status?: number; message?: string } | null;
type UserLike = { id: string; phone?: string | null } | null;

/** supabase-js auth에서 쓰는 부분만 (버전마다 바뀌는 제네릭 타입에 묶이지 않게) */
export interface SupabaseAuthLike {
  auth: {
    signInWithOtp(args: { phone: string; options?: { shouldCreateUser?: boolean } }): PromiseLike<{ error: AuthErrorLike }>;
    verifyOtp(args: { phone: string; token: string; type: 'sms' }): PromiseLike<{ data: { user: UserLike }; error: AuthErrorLike }>;
    getUser(): PromiseLike<{ data: { user: UserLike }; error: AuthErrorLike }>;
    signOut(): PromiseLike<{ error: AuthErrorLike }>;
  };
}

/** Supabase는 번호를 + 없이 저장 (821012345678) */
const userOf = (u: NonNullable<UserLike>, fallback: string): AuthUser => ({
  id: u.id,
  phone: u.phone ? `+${u.phone.replace(/^\+/, '')}` : fallback,
});

export function createSupabaseAuth(client: SupabaseAuthLike): AuthPort {
  return {
    async sendCode(phone, opts) {
      const e164 = toE164Kr(phone);
      if (!e164) return { ok: false, error: 'BAD_PHONE' };
      const { error } = await client.auth.signInWithOtp({ phone: e164, options: { shouldCreateUser: !opts?.existingOnly } });
      return error ? { ok: false, error: authErrorFromSupabase(error) } : { ok: true, value: undefined };
    },
    async verifyCode(phone, code) {
      const e164 = toE164Kr(phone);
      if (!e164) return { ok: false, error: 'BAD_PHONE' };
      const { data, error } = await client.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'sms' });
      if (error || !data.user) return { ok: false, error: authErrorFromSupabase(error) };
      return { ok: true, value: userOf(data.user, e164) };
    },
    async currentUser() {
      const { data } = await client.auth.getUser();
      return data.user ? userOf(data.user, '') : null;
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}
