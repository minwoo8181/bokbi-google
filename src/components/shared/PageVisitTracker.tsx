'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { deviceOf, pageOf, pageRole } from '@/lib/analytics/derive';
import { track } from '@/lib/analytics/store';

/** 방문 기록 (A7): 화면 종류·기기만, 주소 속 번호·검색값은 남기지 않음. 관리자 화면은 기록 안 함. 그리는 것 없음 */
export default function PageVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const page = pageOf(pathname ?? '/');
    if (!page) return;
    track('page_visit', { page, device: deviceOf(window.innerWidth) }, { role: pageRole(page) });
  }, [pathname]);
  return null;
}
