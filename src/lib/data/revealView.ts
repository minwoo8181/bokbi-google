/**
 * 동·호수·연락처 열람 결과 → 화면에 보일 값 (A2', 대표님 2026-10-26).
 * - 열람 성공: 그 값
 * - local + 저장소에 없는 의뢰(NO_REQUEST — 테스트 스위처 예시·다시 요청 의뢰): 의뢰에 든 값 그대로 (지금 화면과 같게)
 * - 그 밖의 거절(매칭 해제 등): 가림 — Supabase와 같은 모습
 */
import type { OwnerContact, OwnerRequest } from '@/lib/requests/types';
import type { RevealError, Result } from './repo';

export type RevealStatus = 'idle' | 'loading' | 'ok' | 'denied';

export interface RevealView {
  /** 열람한 동·호수 (없으면 null → 화면은 가려진 값) */
  dongHo: string | null;
  contact: OwnerContact | null;
  status: RevealStatus;
}

export const HIDDEN: RevealView = { dongHo: null, contact: null, status: 'denied' };

export function revealView(
  result: Result<{ dongHo: string; contact: OwnerContact | null }, RevealError>,
  request: Pick<OwnerRequest, 'dongHo' | 'contact'>,
  backend: 'local' | 'supabase',
): RevealView {
  if (result.ok) return { dongHo: result.value.dongHo || null, contact: result.value.contact, status: 'ok' };
  if (result.error === 'NO_REQUEST' && backend === 'local') return { dongHo: request.dongHo || null, contact: request.contact ?? null, status: 'ok' };
  return HIDDEN;
}
