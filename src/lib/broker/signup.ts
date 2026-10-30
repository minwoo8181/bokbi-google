/**
 * 가입 화면으로 내려보내는 값 (결정론, 순수 함수)
 * - 명단의 대표자 이름·전화번호는 내려보내지 않는다: 상호만. 확인 전화 안내는 모든 신청자에게 같은 문구
 *   (어느 번호로 걸지는 관리자가 정함: 브이월드 → 없으면 네이버 부동산 광고 번호, 2026-10-25 대표님)
 * - 실패 잠금: 같은 접속에서 5번 틀리면 10분 잠금 (브라우저 저장소 단계는 서버 메모리, Supabase는 private.signup_fails — signupService.ts)
 */
import type { BrokerMatchResult } from './registry';

export type SignupCheck =
  /** address: 비슷한 상호가 많아 "이 사무소가 맞나요?"를 지도·주소로 한 번 더 확인 (대표님 2026-10-25). 공개 등록 주소 */
  | { ok: true; regNo: string; office: string; address: string; nameClose: boolean; openYear: number | null }
  | { ok: false; error: 'NOT_FOUND' | 'CEO_MISMATCH' | 'OFFICE_MISMATCH' | 'SUSPENDED' | 'ALREADY_JOINED' | 'LOCKED' | 'EMPTY' | 'NOT_SIGNED_IN' | 'NOT_CONFIGURED' };

export function toSignupCheck(result: BrokerMatchResult): SignupCheck {
  if (result.status !== 'MATCHED' && result.status !== 'NAME_CLOSE') return { ok: false, error: result.status };
  const e = result.entry;
  return {
    ok: true,
    regNo: e.regNo,
    office: e.office,
    address: e.address,
    nameClose: result.status === 'NAME_CLOSE',
    openYear: e.openYear,
  };
}

export const LOCK_MAX_FAILS = 5;
export const LOCK_MS = 10 * 60 * 1000;

export interface FailRecord {
  count: number;
  /** 첫 실패 시각. 잠금 시간이 지나면 기록을 버린다 */
  since: number;
}

export function isLocked(rec: FailRecord | undefined, now: number): boolean {
  return !!rec && rec.count >= LOCK_MAX_FAILS && now - rec.since < LOCK_MS;
}

export function recordFail(rec: FailRecord | undefined, now: number): FailRecord {
  if (!rec || now - rec.since >= LOCK_MS) return { count: 1, since: now };
  return { count: rec.count + 1, since: rec.since };
}

/** 확인 코드 4자리 (0000·같은 숫자 4개처럼 부르기 헷갈리는 값 제외). random은 0 이상 1 미만 */
export function makeConfirmCode(random: () => number): string {
  for (;;) {
    const code = String(Math.floor(random() * 10000)).padStart(4, '0');
    if (!/^(\d)\1{3}$/.test(code)) return code;
  }
}
