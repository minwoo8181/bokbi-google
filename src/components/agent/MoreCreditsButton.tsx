'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';

/** "크레딧 더 받기" 줄 버튼 (피드 크레딧 0개 카드·내 사무소 크레딧 카드). 누르면 페이크 도어 투표 */
export default function MoreCreditsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="more-credits"
      className="mt-3 w-full h-11 px-3 rounded-xl bg-surface-subtle flex items-center justify-between text-[13px] font-bold text-text-secondary"
    >
      {SITE_CONTENT.brokerAgent.moreCredits.button}
      <ChevronRight className="w-4 h-4" aria-hidden />
    </button>
  );
}
