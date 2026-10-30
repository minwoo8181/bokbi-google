/**
 * 관리자 처리 기록 (결정론·순수 함수 + 브라우저 저장소). 추가만 한다 — 기록이 곧 근거.
 * - 복비 "중개사가 더 요구": 확인(더 요구한 게 맞음) / 반려(문제 없음) / 중개사에게 연락함
 * - 허위 매물 신고: 판정은 fakeReport.decideFakeReport가 공유 저장소에 남기고, 여기엔 누가 언제 어떻게 처리했는지만
 * 제재·차단 목록 반영(약관 제8·11조)은 Supabase 때. 그때 admin_actions 테이블(관리자만 읽기·쓰기, RLS)로 옮긴다
 */

import { z } from 'zod';
import { listOf, parseJson } from '@/lib/data/schema';

export type AdminTargetKind = 'FAKE_REPORT' | 'FEE_OVERCHARGED';
export type AdminResult = 'CONFIRMED' | 'REJECTED' | 'CONTACTED';
export const ADMIN_RESULTS: AdminResult[] = ['CONFIRMED', 'REJECTED', 'CONTACTED'];

export interface AdminAction {
  id: string;
  at: string;
  target: AdminTargetKind;
  requestId: string;
  offerId: string;
  result: AdminResult;
}

export const ADMIN_LOG_KEY = 'bokbi_admin_log';

export const adminActionSchema: z.ZodType<AdminAction> = z.object({
  id: z.string(),
  at: z.string(),
  target: z.enum(['FAKE_REPORT', 'FEE_OVERCHARGED']),
  requestId: z.string(),
  offerId: z.string(),
  result: z.enum(['CONFIRMED', 'REJECTED', 'CONTACTED']),
});

/** 깨진 줄은 버린다 */
export function parseAdminLog(raw: string | null): AdminAction[] {
  return listOf(adminActionSchema, parseJson(raw));
}

export type AppendError = 'DECIDED';

/**
 * 처리 결과 추가. 확인·반려는 한 번만 (끝난 일에 다시 판정하지 않음), 연락함은 여러 번 가능.
 * 같은 id는 한 번만
 */
export function appendAdminAction(log: AdminAction[], action: AdminAction): { ok: true; log: AdminAction[] } | { ok: false; error: AppendError } {
  if (log.some((a) => a.id === action.id)) return { ok: true, log };
  if (action.result !== 'CONTACTED' && isResolved(log, action.target, action.requestId, action.offerId)) return { ok: false, error: 'DECIDED' };
  return { ok: true, log: [...log, action] };
}

/** 이 대상의 기록 (오래된 것부터) */
export function actionsFor(log: AdminAction[], target: AdminTargetKind, requestId: string, offerId: string): AdminAction[] {
  return log.filter((a) => a.target === target && a.requestId === requestId && a.offerId === offerId).sort((a, b) => a.at.localeCompare(b.at));
}

/** 확인 또는 반려로 끝났는지 (연락함만으로는 끝나지 않음) */
export function isResolved(log: AdminAction[], target: AdminTargetKind, requestId: string, offerId: string): boolean {
  return actionsFor(log, target, requestId, offerId).some((a) => a.result !== 'CONTACTED');
}

export function loadAdminLog(): AdminAction[] {
  try {
    return parseAdminLog(localStorage.getItem(ADMIN_LOG_KEY));
  } catch {
    return [];
  }
}

export function saveAdminLog(log: AdminAction[]): void {
  try {
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify(log));
  } catch {
    // 저장이 막힌 브라우저: 화면 상태만 바뀐다
  }
}
