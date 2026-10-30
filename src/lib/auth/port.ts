/**
 * 휴대폰 인증 포트 (A1). 화면은 이것만 부른다 → 지금은 흉내(local.ts), Supabase 스위치 때 Supabase Auth 구현.
 * 문자 발송은 Supabase가 Send SMS Hook으로 우리 서버(/api/auth/sms-hook → Solapi)에 맡긴다 (배포 직전 키만)
 */
import type { AuthError } from './phone';

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthError };

export interface AuthUser {
  id: string;
  /** 국제 형식 +82… */
  phone: string;
}

export interface AuthPort {
  /**
   * 인증번호 보내기 (번호 형식이 틀리면 BAD_PHONE, 너무 자주면 RATE_LIMITED).
   * existingOnly: 로그인 화면 — 계정이 없으면 NO_ACCOUNT (동의 없이 계정이 생기지 않게)
   */
  sendCode(phone: string, opts?: { existingOnly?: boolean }): Promise<AuthResult<void>>;
  /** 인증번호 확인 = 로그인 (Supabase: 세션 쿠키가 생김) */
  verifyCode(phone: string, code: string): Promise<AuthResult<AuthUser>>;
  currentUser(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
