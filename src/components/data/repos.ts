'use client';

/**
 * 화면이 쓰는 저장소 하나. 기능 스위치 NEXT_PUBLIC_DATA_BACKEND:
 * - 없음·local (기본): 브라우저 저장소 구현. 의뢰 원본 = 매칭 모달이 저장한 요약(있으면) + 예시 의뢰 (components/agent/mock-feed)
 * - supabase: 서버 액션 → Supabase (lib/data/remote.ts). 로그인(A1)과 화면의 연락처 열람 전환 뒤에 켠다
 * 설계 docs/handover/supabase-schema.md §7
 */
import { createLocalRepos } from '@/lib/data/local';
import { createRemoteRepos } from '@/lib/data/remote';
import { parseJson, isRecord } from '@/lib/data/schema';
import { REQUEST_SUMMARY_KEY } from '@/lib/requests/requestDraft';
import { demoFeedRequests } from '@/components/agent/mock-feed';

/** 매칭 모달이 저장한 요약 (없거나 깨졌으면 null) */
export function readRequestSummary(): Record<string, unknown> | null {
  try {
    const v = parseJson(localStorage.getItem(REQUEST_SUMMARY_KEY));
    return isRecord(v) ? v : null;
  } catch {
    return null;
  }
}

export const DATA_BACKEND: 'local' | 'supabase' = process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase' ? 'supabase' : 'local';

export const repos =
  DATA_BACKEND === 'supabase' ? createRemoteRepos() : createLocalRepos({ baseRequests: (now) => demoFeedRequests(now, readRequestSummary()) });
