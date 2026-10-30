/**
 * 중개사 가입 신청 상태와 관리자 승인 (결정론, 순수 함수)
 * - 승인: 관리자가 사무소 번호로 전화해 신청자가 불러 준 코드를 입력 → 신청 때 받은 코드와 같아야 승인
 * - 개설 연도: 명단 등록번호에서 못 구한 곳(옛 형식 38곳)은 관리자가 브이월드 등록일로 입력해야 승인 가능
 * 목업 단계: 신청은 신청한 브라우저 localStorage에만 (관리자 화면도 같은 브라우저에서 확인). Supabase 연결 시 테이블로
 * 설계: docs/handover/phase5-broker-signup.md §7-1
 */
import { applicationSchema, parseJson } from '@/lib/data/schema';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BrokerApplication {
  regNo: string;
  office: string;
  /** 신청자가 입력해 명단과 맞춘 대표자 이름 (내 사무소 화면 표시용). 예전 저장분에는 없음 */
  ceo?: string;
  /** 확인 코드 4자리 (신청자 화면에 표시, 관리자는 전화로 받아 입력) */
  code: string;
  strengths: string[];
  /** 가능한 것 (조건, 여러 개). 예전 저장분에는 없음 */
  conditions?: string[];
  /** 신청자가 인증한 휴대폰 (승인 결과 알림용) */
  phone: string;
  submittedAt: string;
  status: ApplicationStatus;
  reviewedAt: string | null;
  rejectReason: string | null;
  /** 승인 때 확정한 개설 연도 (명단에서 구했거나 관리자가 입력). 확인 배지 구간 계산용 */
  openYear: number | null;
}

export const APPLICATION_STORAGE_KEY = 'bokbi_broker_application';

/** 예전 저장분(상태 없음)도 대기 중으로 읽는다 (계약: lib/data/schema.ts applicationSchema) */
export function parseApplication(raw: string | null): BrokerApplication | null {
  const r = applicationSchema.safeParse(parseJson(raw));
  return r.success ? r.data : null;
}

export function loadApplication(): BrokerApplication | null {
  try {
    return parseApplication(localStorage.getItem(APPLICATION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveApplication(app: BrokerApplication | null): void {
  try {
    if (app) localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(app));
    else localStorage.removeItem(APPLICATION_STORAGE_KEY);
  } catch {
    // 저장이 막힌 브라우저: 화면 상태만 바뀐다
  }
}

/** 신청자에게 "48시간 안에 확인 전화" 라고 안내한다 */
export const CALL_DEADLINE_HOURS = 48;

/** 신청 후 지난 시간(시간 단위, 내림). 관리자 화면 마감 표시용 */
export function hoursSince(iso: string, now: Date): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 3_600_000)) : 0;
}

export type ApproveError = 'NOT_PENDING' | 'CODE_MISMATCH' | 'YEAR_REQUIRED' | 'YEAR_INVALID';

/**
 * registryOpenYear: 명단 등록번호에서 구한 연도 (없으면 null → enteredYear 필수)
 * enteredYear: 관리자가 브이월드 등록일을 보고 입력한 연도 (registryOpenYear가 있으면 무시)
 */
export function approveApplication(
  app: BrokerApplication,
  input: { spokenCode: string; registryOpenYear: number | null; enteredYear: string; now: Date },
): { ok: true; app: BrokerApplication } | { ok: false; error: ApproveError } {
  if (app.status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };
  if (input.spokenCode.replace(/\D/g, '') !== app.code) return { ok: false, error: 'CODE_MISMATCH' };
  const year = resolveOpenYear(input.registryOpenYear, input.enteredYear, input.now);
  if (!year.ok) return year;
  return { ok: true, app: { ...app, status: 'APPROVED', reviewedAt: input.now.toISOString(), rejectReason: null, openYear: year.year } };
}

/** 관리자 가입 목록 순서: 확인 대기 먼저(오래 기다린 순), 그다음 처리한 신청(최근 신청 순) */
export function sortApplications<T extends Pick<BrokerApplication, 'status' | 'submittedAt'>>(list: readonly T[]): T[] {
  const pending = list.filter((a) => a.status === 'PENDING').sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const rest = list.filter((a) => a.status !== 'PENDING').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return [...pending, ...rest];
}

/** 개설 연도: 명단 연도가 있으면 그것, 없으면 관리자 입력(1980~올해). 서버 판정(approve_broker) 전에도 같은 검사 */
export function resolveOpenYear(registryOpenYear: number | null, enteredYear: string, now: Date): { ok: true; year: number } | { ok: false; error: 'YEAR_REQUIRED' | 'YEAR_INVALID' } {
  if (registryOpenYear !== null) return { ok: true, year: registryOpenYear };
  if (!enteredYear.trim()) return { ok: false, error: 'YEAR_REQUIRED' };
  const y = Number(enteredYear.trim());
  if (!Number.isInteger(y) || y < 1980 || y > now.getFullYear()) return { ok: false, error: 'YEAR_INVALID' };
  return { ok: true, year: y };
}

export function rejectApplication(app: BrokerApplication, reason: string, now: Date): BrokerApplication | null {
  if (app.status !== 'PENDING' || !reason.trim()) return null;
  return { ...app, status: 'REJECTED', reviewedAt: now.toISOString(), rejectReason: reason };
}
