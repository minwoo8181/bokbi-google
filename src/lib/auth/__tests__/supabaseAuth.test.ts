/**
 * 휴대폰 인증 Supabase 구현 (lib/auth/supabase.ts) — 실제 서버 없이 호출 기록만 보는 가짜 클라이언트
 */
import { describe, expect, it } from 'vitest';
import { createSupabaseAuth, type SupabaseAuthLike } from '../supabase';

function fake(over: Partial<{ sendError: object | null; verifyError: object | null; user: { id: string; phone: string } | null }> = {}) {
  const calls: unknown[] = [];
  const user = over.user === undefined ? { id: 'u1', phone: '821012345678' } : over.user;
  const client: SupabaseAuthLike = {
    auth: {
      signInWithOtp: async (a) => (calls.push(['send', a]), { error: (over.sendError ?? null) as never }),
      verifyOtp: async (a) => (calls.push(['verify', a]), { data: { user: over.verifyError ? null : user }, error: (over.verifyError ?? null) as never }),
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => (calls.push(['signOut']), { error: null }),
    },
  };
  return { auth: createSupabaseAuth(client), calls };
}

describe('휴대폰 인증 Supabase 구현', () => {
  it('국제 형식 번호로 보냄, 로그인 화면은 새 계정을 만들지 않음', async () => {
    const { auth, calls } = fake();
    expect(await auth.sendCode('010-1234-5678')).toEqual({ ok: true, value: undefined });
    expect(await auth.sendCode('010-1234-5678', { existingOnly: true })).toEqual({ ok: true, value: undefined });
    expect(calls).toEqual([
      ['send', { phone: '+821012345678', options: { shouldCreateUser: true } }],
      ['send', { phone: '+821012345678', options: { shouldCreateUser: false } }],
    ]);
  });

  it('휴대폰이 아니면 서버에 보내지 않고 BAD_PHONE', async () => {
    const { auth, calls } = fake();
    expect(await auth.sendCode('02-123-4567')).toEqual({ ok: false, error: 'BAD_PHONE' });
    expect(calls).toEqual([]);
  });

  it('Supabase 오류 → 앱 오류 (요청 한도·계정 없음·틀린 번호)', async () => {
    expect(await fake({ sendError: { code: 'over_sms_send_rate_limit' } }).auth.sendCode('01012345678')).toEqual({ ok: false, error: 'RATE_LIMITED' });
    expect(await fake({ sendError: { code: 'otp_disabled' } }).auth.sendCode('01012345678', { existingOnly: true })).toEqual({ ok: false, error: 'NO_ACCOUNT' });
    expect(await fake({ verifyError: { code: 'otp_expired' } }).auth.verifyCode('01012345678', '000000')).toEqual({ ok: false, error: 'WRONG_CODE' });
  });

  it('확인 성공: 사용자 id와 + 붙은 번호', async () => {
    const { auth, calls } = fake();
    expect(await auth.verifyCode('010-1234-5678', ' 123456 ')).toEqual({ ok: true, value: { id: 'u1', phone: '+821012345678' } });
    expect(calls).toEqual([['verify', { phone: '+821012345678', token: '123456', type: 'sms' }]]);
    expect(await auth.currentUser()).toEqual({ id: 'u1', phone: '+821012345678' });
  });

  it('로그인 안 됨 → currentUser null', async () => {
    expect(await fake({ user: null }).auth.currentUser()).toBeNull();
  });
});
