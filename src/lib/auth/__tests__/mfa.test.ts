import { describe, expect, it } from 'vitest';
import { supabaseMfa, type MfaClientLike } from '../mfa';

type Factor = { id: string; factor_type: string; status: string };

function fakeClient(factors: Factor[], over: { listError?: boolean; enrollError?: boolean; verifyCode?: string } = {}) {
  const calls: string[] = [];
  const client: MfaClientLike = {
    auth: {
      mfa: {
        listFactors: async () =>
          over.listError
            ? { data: null, error: { message: 'x' } }
            : { data: { all: factors, totp: factors.filter((f) => f.factor_type === 'totp' && f.status === 'verified') }, error: null },
        unenroll: async ({ factorId }) => (calls.push(`unenroll:${factorId}`), { error: null }),
        enroll: async () => {
          calls.push('enroll');
          return over.enrollError ? { data: null, error: { message: 'x' } } : { data: { id: 'new', totp: { qr_code: 'data:qr', secret: 'SECRET', uri: 'otpauth://totp/x' } }, error: null };
        },
        challengeAndVerify: async ({ code }) =>
          code === over.verifyCode ? { error: null } : code === '999999' ? { error: { code: 'unexpected_failure' } } : { error: { code: 'mfa_verification_failed' } },
      },
    },
  };
  return { client, calls };
}

describe('supabaseMfa', () => {
  it('등록 시작: 마치지 못한 TOTP만 지우고 새로 등록', async () => {
    const { client, calls } = fakeClient([
      { id: 'old', factor_type: 'totp', status: 'unverified' },
      { id: 'phone', factor_type: 'phone', status: 'unverified' },
    ]);
    const r = await supabaseMfa(client).startEnroll();
    expect(calls).toEqual(['unenroll:old', 'enroll']);
    expect(r).toEqual({ ok: true, value: { factorId: 'new', qr: 'data:qr', secret: 'SECRET', uri: 'otpauth://totp/x' } });
  });

  it('등록 실패 · 목록 실패 → FAILED', async () => {
    expect(await supabaseMfa(fakeClient([], { enrollError: true }).client).startEnroll()).toEqual({ ok: false, error: 'FAILED' });
    expect(await supabaseMfa(fakeClient([], { listError: true }).client).startEnroll()).toEqual({ ok: false, error: 'FAILED' });
  });

  it('등록 마친 인증 앱 찾기', async () => {
    expect(await supabaseMfa(fakeClient([{ id: 'f1', factor_type: 'totp', status: 'verified' }]).client).verifiedFactor()).toBe('f1');
    expect(await supabaseMfa(fakeClient([{ id: 'f1', factor_type: 'totp', status: 'unverified' }]).client).verifiedFactor()).toBeNull();
    expect(await supabaseMfa(fakeClient([], { listError: true }).client).verifiedFactor()).toBeNull();
  });

  it('6자리: 맞음 / 틀림(WRONG_CODE) / 그 밖의 오류(FAILED)', async () => {
    const api = supabaseMfa(fakeClient([], { verifyCode: '123456' }).client);
    expect(await api.verify('f1', '123456')).toEqual({ ok: true });
    expect(await api.verify('f1', '000000')).toEqual({ ok: false, error: 'WRONG_CODE' });
    expect(await api.verify('f1', '999999')).toEqual({ ok: false, error: 'FAILED' });
  });
});
