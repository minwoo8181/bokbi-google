'use client';

/**
 * 동·호수·연락처 열람 (A2'). 열 때마다 열람 기록이 남으므로 enabled가 참이 되는 순간 (의뢰 id, 목적)당 1번만 부르고
 * 결과는 화면 상태로 들고 있다 — 리렌더·1분 타이머·의뢰 상태 변경으로 다시 부르지 않는다. 판정 규칙은 lib/data/revealView
 */
import { useEffect, useRef, useState } from 'react';
import type { ContactPurpose } from '@/lib/data/repo';
import { revealView, type RevealView } from '@/lib/data/revealView';
import type { OwnerRequest } from '@/lib/requests/types';
import { DATA_BACKEND, repos } from './repos';

const IDLE: RevealView = { dongHo: null, contact: null, status: 'idle' };

export function useContactReveal(request: Pick<OwnerRequest, 'id' | 'dongHo' | 'contact'> | null, purpose: ContactPurpose, enabled: boolean): RevealView {
  const [view, setView] = useState<RevealView>(IDLE);
  /** 마지막으로 부른 (id, 목적). 개발 모드 이중 실행에도 기록이 한 줄이게 */
  const asked = useRef<string | null>(null);
  const latest = useRef(request);
  latest.current = request;
  const id = request?.id ?? null;
  const key = enabled && id ? `${id}:${purpose}` : null;

  useEffect(() => {
    if (!key || !id) {
      asked.current = null;
      setView(IDLE);
      return;
    }
    if (asked.current === key) return;
    asked.current = key;
    setView({ ...IDLE, status: 'loading' });
    void repos.contacts
      .reveal(id, purpose, new Date())
      .catch(() => ({ ok: false, error: 'NOT_ALLOWED' }) as const)
      .then((r) => {
        const cur = latest.current;
        if (asked.current !== key || !cur) return;
        setView(revealView(r, cur, DATA_BACKEND));
      });
  }, [key, id, purpose]);

  return view;
}
