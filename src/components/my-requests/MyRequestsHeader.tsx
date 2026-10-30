'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';

export default function MyRequestsHeader() {
  const router = useRouter();

  return (
    <header className="h-14 px-2 flex items-center bg-surface-page sticky top-0 z-30">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary active:bg-surface-subtle"
        aria-label="홈으로 가기"
      >
        <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
      </button>
      <h1 className="text-[17px] font-bold text-text-primary">{SITE_CONTENT.myRequests.headerTitle}</h1>
    </header>
  );
}
