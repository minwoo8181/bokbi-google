'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from './format';

const t = SITE_CONTENT.myRequests;

/**
 * 광고 내림 확인 n/m (deal.adRemoval). 복비가 네이버 광고를 직접 내릴 수 없어 중개사가 "광고 내렸어요"를 누른 수를 센다.
 * 다른 곳과 진행(진행 중 화면)·집주인이 끝낸 의뢰(종료 화면) 공통, 아래 한 줄만 다르다
 */
export default function AdRemovalCard({ removal, sub }: { removal: { done: number; total: number } | null; sub: string }) {
  if (!removal || removal.total === 0) return null;
  const all = removal.done === removal.total;
  return (
    <div
      className={`p-4 rounded-2xl animate-rise-in transition-colors duration-base ease-out-soft ${all ? 'bg-status-good-light' : 'bg-brand-light'}`}
      data-testid="ad-removal"
    >
      <p className={`text-[15px] font-bold ${all ? 'text-status-good' : 'text-brand'}`}>{fill(t.deal.adRemoval, { done: removal.done, total: removal.total })}</p>
      <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">{sub}</p>
    </div>
  );
}
