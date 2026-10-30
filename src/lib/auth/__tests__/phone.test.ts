import { describe, expect, it } from 'vitest';
import { authErrorFromSupabase, countdown, isMobileKr, isOtpCode, toE164Kr } from '../phone';

describe('휴대폰 인증 규칙', () => {
  it('휴대폰 번호 → 국제 형식, 하이픈·공백·+82 모두 받음', () => {
    expect(toE164Kr('010-1234-5678')).toBe('+821012345678');
    expect(toE164Kr(' 01012345678 ')).toBe('+821012345678');
    expect(toE164Kr('+82 10 1234 5678')).toBe('+821012345678');
    expect(toE164Kr('011-123-4567')).toBe('+82111234567');
  });

  it('휴대폰이 아니면 거절 (집 전화·짧은 번호·글자)', () => {
    for (const bad of ['02-123-4567', '010-123-456', '010-1234-56789', '', 'abc', '012-1234-5678']) expect(isMobileKr(bad)).toBe(false);
  });

  it('인증번호는 숫자 6자리만', () => {
    expect(isOtpCode('123456')).toBe(true);
    expect(isOtpCode(' 000000 ')).toBe(true);
    for (const bad of ['12345', '1234567', '12a456', '']) expect(isOtpCode(bad)).toBe(false);
  });

  it('남은 시간 표시', () => {
    expect(countdown(180)).toBe('3:00');
    expect(countdown(59)).toBe('0:59');
    expect(countdown(-3)).toBe('0:00');
  });

  it('Supabase 오류 → 앱 오류', () => {
    expect(authErrorFromSupabase({ code: 'over_sms_send_rate_limit' })).toBe('RATE_LIMITED');
    expect(authErrorFromSupabase({ status: 429 })).toBe('RATE_LIMITED');
    expect(authErrorFromSupabase({ code: 'otp_expired' })).toBe('WRONG_CODE');
    expect(authErrorFromSupabase({ code: 'validation_failed' })).toBe('BAD_PHONE');
    expect(authErrorFromSupabase({ code: 'otp_disabled' })).toBe('NO_ACCOUNT');
    expect(authErrorFromSupabase({ code: 'sms_send_failed' })).toBe('FAILED');
    expect(authErrorFromSupabase(null)).toBe('FAILED');
  });
});
