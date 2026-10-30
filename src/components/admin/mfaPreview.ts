import type { MfaApi } from '@/lib/auth/mfa';

/** 개발 미리보기용 흉내 2단계 인증 (/admin?mfa=ENROLL|VERIFY, 브라우저 저장소 단계에서만). 123456이면 통과 */
export const PREVIEW_CODE = '123456';

const PREVIEW_QR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"/><path d="M0 0h3v3H0zM7 0h3v3H7zM0 7h3v3H0zM4 4h2v2H4zM5 1h1v2H5zM1 5h2v1H1zM7 5h1v3H7zM5 7h1v3H5z" fill="#191F28"/></svg>',
  );

export function previewMfa(): MfaApi {
  return {
    async startEnroll() {
      return { ok: true, value: { factorId: 'preview', qr: PREVIEW_QR, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Bokbi:preview?secret=JBSWY3DPEHPK3PXP&issuer=Bokbi' } };
    },
    async verifiedFactor() {
      return 'preview';
    },
    async verify(_factorId, code) {
      return code === PREVIEW_CODE ? { ok: true } : { ok: false, error: 'WRONG_CODE' };
    },
  };
}
