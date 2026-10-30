'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { TimelineItem, Viewer } from '@/lib/deal/deal';
import { kstNow } from '@/lib/requests/showing';
import { fill } from '@/components/my-requests/format';
import { label } from './DealTimeline';

const t = SITE_CONTENT.brokerDeal.news;

/**
 * 목록 카드의 "새 소식" 한 줄 (대표님 2026-10-26): 마지막으로 거래 페이지를 연 뒤 상대가 남긴 기록 중 최신 1줄 + 개수.
 * 오른쪽에 그 소식에 맞는 버튼(예: 방문 일정 → 캘린더에 저장)을 붙일 수 있다
 */
export default function DealNewsRow({ news, viewer, now, action }: { news: TimelineItem[]; viewer: Viewer; now: number; action?: React.ReactNode }) {
  if (news.length === 0) return null;
  const today = kstNow(new Date(now)).date;
  // 카드 전체가 버튼인 곳에도 들어가서 span으로만 (버튼 안에 div·button을 넣지 않게, action은 버튼 아닌 카드에서만)
  return (
    <span className="px-4 py-3 flex items-center justify-between gap-2 border-t border-border-light animate-rise-in" data-testid="deal-news">
      <span className="min-w-0 flex items-center gap-2 text-[13px] font-medium text-text-primary">
        <span className="shrink-0 h-6 px-2 rounded-full bg-brand-light text-brand-hover text-[12px] font-bold inline-flex items-center">
          {news.length > 1 ? fill(t.badgeCount, { n: news.length }) : t.badge}
        </span>
        <span className="min-w-0 truncate">{label(news[0], today, viewer)}</span>
      </span>
      {action}
    </span>
  );
}
