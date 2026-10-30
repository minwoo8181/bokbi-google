'use client';

/**
 * 매칭 모달 6단계 제출 + 다시 요청 채우기 (A2', 대표님 2026-10-26). 모달 파일이 커서 저장 부분만 여기로.
 * - local (기본): 지금처럼 요약만 저장 → 저장소의 의뢰 원본이 이 요약이라 requests.create를 부르지 않는다 (피드·내 의뢰 중복 없음)
 * - supabase: requests.create(블라인드 / 비밀 칸) → 받은 서버 id로 요약 id를 바꾸고, 휴대폰 요약에는 비밀 칸을 빼고 저장
 * 변환 규칙은 lib/requests/summaryRequest
 */
import { COMPANY_INFO } from '@/config/siteContent';
import { DATA_BACKEND, repos } from '@/components/data/repos';
import { REQUEST_SUMMARY_KEY, RESUME_KEY, type SavedRequest } from '@/lib/requests/requestDraft';
import { fillSecrets, newRequestInput, stripSecrets } from '@/lib/requests/summaryRequest';

const OWNER_PHONE_KEY = 'bokbi_active_owner_phone';
const REQUEST_ID_KEY = 'bokbi_active_request_id';

/** 요약 저장 (+ supabase면 서버 의뢰 생성). 저장된 접수번호를 돌려준다(완료 영수증에 표시). 실패하면 null — 완료 화면으로 넘기지 않는다 */
export async function submitRequest(summary: Record<string, unknown>, now: Date): Promise<string | null> {
  try {
    let id: string;
    if (DATA_BACKEND === 'supabase') {
      const input = newRequestInput(summary, COMPANY_INFO.policyEffectiveDate);
      if (!input) return null;
      id = await repos.requests.create(input, now);
      localStorage.setItem(REQUEST_ID_KEY, id);
      localStorage.setItem(REQUEST_SUMMARY_KEY, JSON.stringify({ ...stripSecrets(summary), id }));
    } else {
      id = String(summary.id);
      localStorage.setItem(OWNER_PHONE_KEY, typeof summary.ownerPhone === 'string' ? summary.ownerPhone : '');
      localStorage.setItem(REQUEST_ID_KEY, id);
      localStorage.setItem(REQUEST_SUMMARY_KEY, JSON.stringify(summary));
    }
    // 다시 요청을 마쳤으면 이어하기 정보는 지운다
    localStorage.removeItem(RESUME_KEY);
    return id;
  } catch {
    return null;
  }
}

/**
 * 다시 요청: 요청서에 동·호수가 없으면(supabase — 휴대폰에 남기지 않음) 지난 의뢰를 본인 열람(OWNER_VIEW, 기록 1줄)해 채운다.
 * 못 불러오면 refilled false → 화면이 안내 한 줄 + 직접 입력
 */
export async function refillDraft(draft: SavedRequest, now: Date): Promise<{ draft: SavedRequest; refilled: boolean }> {
  if (draft.dongInput || draft.hoInput) return { draft, refilled: true };
  let requestId: string | null = null;
  try {
    requestId = localStorage.getItem(REQUEST_ID_KEY);
  } catch {}
  if (!requestId) return { draft, refilled: false };
  try {
    const r = await repos.contacts.reveal(requestId, 'OWNER_VIEW', now);
    if (!r.ok || !r.value.dongHo) return { draft, refilled: false };
    return { draft: fillSecrets(draft, r.value), refilled: true };
  } catch {
    return { draft, refilled: false };
  }
}
