'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { pendingOwnerCheck } from '@/lib/broker/fakeReport';
import type { OwnerRequest } from '@/lib/requests/types';

const t = SITE_CONTENT.myRequests.inProgress.ownerCheckBanner;

/**
 * 내 의뢰 맨 위 "운영팀이 소유자 확인 중이에요" (허위 매물 신고 확인 중, 대표님 시안 2026-10-26).
 * 안내만 — 의뢰 전체는 멈추지 않고, 신고한 곳 카드에 "소유자 확인 중 · 광고 시간 멈춤"
 */
export default function OwnerCheckBanner({ request }: { request: OwnerRequest }) {
  if (!pendingOwnerCheck(request)) return null;
  return (
    <section className="p-4 rounded-2xl bg-status-caution-light animate-rise-in" data-testid="owner-check-banner" role="status">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-status-caution break-keep">
        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden />
        {t.title}
      </h2>
      <p className="mt-1 text-[15px] font-medium leading-relaxed text-text-secondary break-keep text-pretty">{t.body}</p>
    </section>
  );
}
