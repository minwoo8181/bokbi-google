/**
 * 개인정보 열람 기록 화면 줄 (A5): 연락처 열람(audit.access_log)과 관리자 처리(audit.admin_actions)를 최신 순으로.
 * 의뢰 id는 단지 이름으로 바꿔 보여 준다 (목록에 없는 의뢰는 null)
 */
import type { AccessLogRow, ContactPurpose } from '@/lib/data/repo';
import type { OwnerRequest } from '@/lib/requests/types';
import type { AdminAction, AdminResult, AdminTargetKind } from './adminLog';

export interface AccessLine {
  key: string;
  at: string;
  purpose: ContactPurpose;
  complexName: string | null;
  reason: string | null;
}

export interface ActionLine {
  key: string;
  at: string;
  target: AdminTargetKind;
  result: AdminResult;
  complexName: string | null;
}

const newestFirst = <T extends { at: string }>(a: T, b: T) => b.at.localeCompare(a.at);

export function accessLines(log: AccessLogRow[], requests: OwnerRequest[]): AccessLine[] {
  const names = new Map(requests.map((r) => [r.id, r.complexName]));
  return log
    .map((l, i) => ({ key: `${l.at}:${l.requestId}:${i}`, at: l.at, purpose: l.purpose, complexName: names.get(l.requestId) ?? null, reason: l.reason }))
    .sort(newestFirst);
}

export function actionLines(log: AdminAction[], requests: OwnerRequest[]): ActionLine[] {
  const names = new Map(requests.map((r) => [r.id, r.complexName]));
  return log.map((a) => ({ key: a.id, at: a.at, target: a.target, result: a.result, complexName: names.get(a.requestId) ?? null })).sort(newestFirst);
}
