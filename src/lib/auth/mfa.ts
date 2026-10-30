/**
 * 관리자 2단계 인증 (A5): 인증 앱(TOTP) 등록·확인. Supabase Auth MFA를 쓰고, 화면은 이 작은 포트만 안다
 * (테스트·개발 미리보기는 흉내 구현으로 바꿔 끼움)
 */
export interface TotpEnrollment {
  factorId: string;
  /** QR 이미지 (SVG data URL) — 넓은 화면 */
  qr: string;
  /** 키 (QR을 못 찍을 때 손으로) */
  secret: string;
  /** otpauth:// 주소 — 휴대폰에서 누르면 인증 앱이 열림 */
  uri: string;
}

export type MfaError = 'FAILED' | 'WRONG_CODE';

export interface MfaApi {
  /** 등록 시작. 마치지 못한 예전 등록은 지우고 새로 */
  startEnroll(): Promise<{ ok: true; value: TotpEnrollment } | { ok: false; error: 'FAILED' }>;
  /** 등록을 마친 인증 앱 (없으면 null) */
  verifiedFactor(): Promise<string | null>;
  /** 6자리 확인 → 성공하면 세션이 aal2로 */
  verify(factorId: string, code: string): Promise<{ ok: true } | { ok: false; error: MfaError }>;
}

interface FactorLike {
  id: string;
  factor_type: string;
  status: string;
}
type ErrLike = { message?: string; code?: string } | null;

/** supabase.auth.mfa 중 쓰는 것만 (테스트에서 가짜로) */
export interface MfaClientLike {
  auth: {
    mfa: {
      listFactors(): PromiseLike<{ data: { all: FactorLike[]; totp: FactorLike[] } | null; error: ErrLike }>;
      unenroll(args: { factorId: string }): PromiseLike<{ error: ErrLike }>;
      enroll(args: { factorType: 'totp'; friendlyName?: string }): PromiseLike<{
        data: { id: string; totp: { qr_code: string; secret: string; uri: string } } | null;
        error: ErrLike;
      }>;
      challengeAndVerify(args: { factorId: string; code: string }): PromiseLike<{ error: ErrLike }>;
    };
  };
}

/** Supabase가 틀린 코드에 주는 오류 코드 */
const WRONG_CODE = new Set(['mfa_verification_failed', 'mfa_challenge_expired']);

export function supabaseMfa(client: MfaClientLike, friendlyName = '복비 관리자'): MfaApi {
  const mfa = client.auth.mfa;
  return {
    async startEnroll() {
      const list = await mfa.listFactors();
      if (list.error || !list.data) return { ok: false, error: 'FAILED' };
      // 같은 이름의 마치지 못한 등록이 남아 있으면 새 등록이 거절되므로 먼저 지운다
      for (const f of list.data.all) {
        if (f.factor_type === 'totp' && f.status !== 'verified') await mfa.unenroll({ factorId: f.id });
      }
      const r = await mfa.enroll({ factorType: 'totp', friendlyName });
      if (r.error || !r.data) return { ok: false, error: 'FAILED' };
      return { ok: true, value: { factorId: r.data.id, qr: r.data.totp.qr_code, secret: r.data.totp.secret, uri: r.data.totp.uri } };
    },
    async verifiedFactor() {
      const list = await mfa.listFactors();
      if (list.error || !list.data) return null;
      return list.data.totp.find((f) => f.status === 'verified')?.id ?? null;
    },
    async verify(factorId, code) {
      const r = await mfa.challengeAndVerify({ factorId, code });
      if (!r.error) return { ok: true };
      return { ok: false, error: WRONG_CODE.has(r.error.code ?? '') ? 'WRONG_CODE' : 'FAILED' };
    },
  };
}
