'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SITE_CONTENT } from '@/config/siteContent';

/** 한 번도 요청하지 않은 사람 (지난 의뢰가 있으면 종료 화면이 대신 보인다) */
export default function EmptyRequestsView() {
  const router = useRouter();
  const t = SITE_CONTENT.myRequests.empty;

  return (
    <section className="pt-16 pb-8 text-center" data-testid="empty-requests">
      <h2 className="text-[20px] font-extrabold text-text-primary tracking-tight">{t.title}</h2>
      <p className="mt-2 text-[15px] font-medium text-text-secondary">{t.subTitle}</p>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="mt-8 w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold"
      >
        {t.searchButtonText}
      </button>
    </section>
  );
}
