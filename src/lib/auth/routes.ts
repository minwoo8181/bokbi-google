/**
 * 로그인이 필요한 화면 (A1, 미들웨어가 씀). Supabase 스위치가 켜졌을 때만 적용 — 지금(브라우저 저장소)은 모두 열림.
 * - 내 의뢰·중개사 화면은 로그인 필요
 * - 중개사 가입(/agent/register)은 가입 화면 안에서 휴대폰 인증 → 열어 둠. 복비 특약 만들기(/agent/terms)도 로그인 없이
 * - 관리자(/admin)는 페이지 서버 관문이 따로 맡음 (A5: 로그인 → 관리자 → 2단계 인증, app/admin/adminGate.ts)
 */
const PROTECTED = ['/my-requests', '/agent'];
const OPEN_UNDER_PROTECTED = ['/agent/register', '/agent/terms'];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export function needsLogin(pathname: string): boolean {
  if (OPEN_UNDER_PROTECTED.some((p) => under(pathname, p))) return false;
  return PROTECTED.some((p) => under(pathname, p));
}

/** 로그인 뒤 돌아갈 곳: 우리 사이트 안의 경로만 (다른 사이트로 보내는 주소 조작 막기) */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/my-requests';
  return next;
}

export const LOGIN_PATH = '/login';
