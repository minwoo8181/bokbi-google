/**
 * 휴대폰 인증 규칙 (결정론·순수 함수, A1). 매칭 모달 4단계·중개사 가입·재방문 로그인이 같은 규칙을 쓴다.
 * 문자 발송·확인은 AuthPort(port.ts)가 — 지금은 흉내(local), Supabase 스위치 때 Supabase Auth
 */

/** 인증번호 유효 시간 (화면 타이머) */
export const OTP_SECONDS = 180;

/** NO_ACCOUNT: 로그인 화면은 기존 회원만 (처음 오는 사람은 동의를 받는 매칭 모달·중개사 가입에서 계정이 생김) */
export type AuthError = 'BAD_PHONE' | 'RATE_LIMITED' | 'WRONG_CODE' | 'EXPIRED' | 'NO_ACCOUNT' | 'FAILED';
export const AUTH_ERRORS: AuthError[] = ['BAD_PHONE', 'RATE_LIMITED', 'WRONG_CODE', 'EXPIRED', 'NO_ACCOUNT', 'FAILED'];

const MOBILE = /^01[016789]\d{7,8}$/;

/** 숫자만 */
export const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** 한국 휴대폰 번호 → 국제 형식(+82…). 휴대폰이 아니면 null */
export function toE164Kr(input: string): string | null {
  const d = digitsOnly(input.trim().replace(/^\+82/, '0'));
  return MOBILE.test(d) ? `+82${d.slice(1)}` : null;
}

export const isMobileKr = (input: string) => toE164Kr(input) !== null;

/** 인증번호 6자리 숫자 */
export const isOtpCode = (s: string) => /^\d{6}$/.test(s.trim());

/** 남은 시간 표시 2:59 */
export function countdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Supabase Auth 오류 → 앱 오류. 인증번호가 틀린 것과 지난 것을 Supabase는 같은 코드(otp_expired)로 준다 →
 * 시간이 지난 것은 화면 타이머가 먼저 막고, 여기서는 "틀림"으로
 */
export function authErrorFromSupabase(e: { code?: string; status?: number; message?: string } | null | undefined): AuthError {
  const code = e?.code ?? '';
  if (code === 'over_sms_send_rate_limit' || code === 'over_request_rate_limit' || e?.status === 429) return 'RATE_LIMITED';
  if (code === 'otp_expired' || code === 'invalid_credentials') return 'WRONG_CODE';
  if (code === 'otp_disabled' || code === 'signup_disabled' || code === 'user_not_found') return 'NO_ACCOUNT';
  if (code === 'validation_failed' || code === 'phone_provider_disabled' || (/phone/i.test(e?.message ?? '') && e?.status === 400)) return 'BAD_PHONE';
  return 'FAILED';
}
