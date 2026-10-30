/**
 * 관리자 화면 관문 (A5, 대표님 2026-10-29 C안). 서버가 매 요청마다 판정한다.
 * - 브라우저 저장소(목업) 단계: 개발 화면에서만 열고, 배포 빌드는 404
 * - Supabase: 로그인 → 관리자 계정 → 인증 앱 등록 → 6자리(aal2) 순서. 관리자가 아니면 없는 페이지처럼 404
 * DB도 같은 조건(private.is_admin = role admin + aal2)으로 막으므로 화면 관문이 뚫려도 데이터는 안 열린다
 */
export type AdminGate = 'NOT_FOUND' | 'LOGIN' | 'ENROLL' | 'VERIFY' | 'OPEN';

export interface AdminGateInput {
  backend: 'local' | 'supabase';
  production: boolean;
  userId: string | null;
  role: string | null;
  /** 등록을 마친 인증 앱 수 */
  verifiedTotp: number;
  /** 세션 인증 단계 (aal1 = 문자만, aal2 = 6자리까지) */
  aal: string | null;
}

export function adminGate(i: AdminGateInput): AdminGate {
  if (i.backend === 'local') return i.production ? 'NOT_FOUND' : 'OPEN';
  if (!i.userId) return 'LOGIN';
  if (i.role !== 'admin') return 'NOT_FOUND';
  if (i.verifiedTotp === 0) return 'ENROLL';
  return i.aal === 'aal2' ? 'OPEN' : 'VERIFY';
}

/** 입력칸 값 → 숫자만, 6자리까지 (붙여 넣은 "123 456"도) */
export function cleanTotpCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}

/** 손으로 옮겨 적기 쉽게 4자씩 띄움 */
export function groupSecret(secret: string): string {
  return secret.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}
