/**
 * 휴대폰 인증 흉내 (목업 단계, Supabase 스위치가 local일 때). 문자는 보내지 않고 숫자 6자리면 통과 — 테스트 채우기 버튼은 123456.
 * 세션은 없다 (지금 화면은 로그인 없이 브라우저 저장소로 동작)
 */
import type { AuthPort } from './port';
import { isOtpCode, toE164Kr } from './phone';

export function createLocalAuth(): AuthPort {
  return {
    async sendCode(phone) {
      return toE164Kr(phone) ? { ok: true, value: undefined } : { ok: false, error: 'BAD_PHONE' };
    },
    async verifyCode(phone, code) {
      const e164 = toE164Kr(phone);
      if (!e164) return { ok: false, error: 'BAD_PHONE' };
      if (!isOtpCode(code)) return { ok: false, error: 'WRONG_CODE' };
      return { ok: true, value: { id: `local-${e164}`, phone: e164 } };
    },
    async currentUser() {
      return null;
    },
    async signOut() {},
  };
}
