/**
 * 내 정보 관리 (A안, 대표님 2026-10-29): 본인 확인 → 내 정보 보기 · 정정·삭제 문의 · 탈퇴 요청을 한 화면에서.
 * 정정·삭제는 문의로(lib/support/inquiry.ts), 탈퇴는 요청으로 받고 운영팀이 본인 확인 뒤 10일 안에 처리 (처리방침 8조, 계약 기록은 법정 기간 보관).
 * 목업 단계: 요청은 이 브라우저 localStorage. Supabase 연결 때 서버 표 + 관리자 "오늘 할 일"로
 */
export const PRIVACY_REQUESTS_KEY = 'bokbi_privacy_requests';
/** 처리 기한 (처리방침 8조) */
export const PRIVACY_DUE_DAYS = 10;

export interface PrivacyRequest {
  id: string;
  kind: 'WITHDRAW';
  /** 요청한 휴대폰 (숫자만) — 운영팀 본인 확인용 */
  phone: string;
  at: string;
  dueAt: string;
}

export const phoneDigits = (p: string) => p.replace(/\D/g, '');

/** 010-1234-5678 → 010-12**-5678 (가운데 뒤 두 자리 가림). 자리 수가 이상하면 숫자만 */
export function maskPhone(p: string): string {
  const d = phoneDigits(p);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 5)}**-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 4)}**-${d.slice(6)}`;
  return d;
}

export const samePhone = (a: string, b: string) => phoneDigits(a).length >= 10 && phoneDigits(a) === phoneDigits(b);

/** 탈퇴 전 막는 이유: 진행 중인 의뢰가 있으면 먼저 취소 (중개사·거래 기록이 걸려 있어서) */
export function withdrawBlock(input: { activeRequests: number }): 'ACTIVE_REQUEST' | null {
  return input.activeRequests > 0 ? 'ACTIVE_REQUEST' : null;
}

/** 탈퇴 요청 추가: 같은 번호의 처리 전 요청이 기한 안에 있으면 새로 쌓지 않음 (여러 번 눌러도 한 건) */
export function addWithdrawRequest(list: readonly PrivacyRequest[], input: { phone: string; now: Date }): { list: PrivacyRequest[]; added: boolean } {
  const phone = phoneDigits(input.phone);
  if (list.some((r) => r.phone === phone && new Date(r.dueAt) > input.now)) return { list: [...list], added: false };
  const at = input.now.toISOString();
  const dueAt = new Date(input.now.getTime() + PRIVACY_DUE_DAYS * 86_400_000).toISOString();
  return { list: [...list, { id: `WITHDRAW-${phone}-${input.now.getTime()}`, kind: 'WITHDRAW', phone, at, dueAt }], added: true };
}

export function parsePrivacyRequests(raw: unknown): PrivacyRequest[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is PrivacyRequest =>
      !!r && typeof r === 'object' && r.kind === 'WITHDRAW' && typeof r.phone === 'string' && typeof r.at === 'string' && typeof r.dueAt === 'string',
  );
}
