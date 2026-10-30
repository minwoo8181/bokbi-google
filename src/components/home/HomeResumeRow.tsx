'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { parseSavedRequest, REQUEST_SUMMARY_KEY, type SavedRequest } from '@/lib/requests/requestDraft';
import { fill } from '@/components/my-requests/format';
import type { SearchComplex } from './HomeSearchSection';

const t = SITE_CONTENT.home.hero;

/**
 * 진행 중인 의뢰 이어보기 (헤이딜러 "이어하기", 대표님 2026-10-28 A안).
 * 매칭 모달이 저장한 의뢰가 이 휴대폰에 있을 때만 보인다 — 처음 온 사람의 홈은 그대로
 */
export default function HomeResumeRow({ complexes }: { complexes: SearchComplex[] }) {
  const [saved, setSaved] = useState<SavedRequest | null>(null);

  useEffect(() => {
    try {
      setSaved(parseSavedRequest(JSON.parse(localStorage.getItem(REQUEST_SUMMARY_KEY) ?? 'null')));
    } catch {}
  }, []);

  if (!saved) return null;
  const apt = complexes.find((c) => String(c.id) === saved.aptId)?.apt_name;
  if (!apt) return null;

  return (
    <Link
      href="/my-requests"
      data-testid="home-resume"
      className="mt-4 -mx-1 px-4 h-14 rounded-2xl bg-surface-subtle flex items-center justify-between gap-3 active:scale-[0.99] transition-transform duration-fast ease-out-soft"
    >
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-text-tertiary">{t.resumeLabel}</span>
        <span className="block text-[15px] font-bold text-text-primary truncate">
          {fill(t.resumeValue, { apt, pyeong: saved.pyeongName, trade: saved.tradeType })}
        </span>
      </span>
      <span className="inline-flex items-center flex-shrink-0 text-[15px] font-bold text-brand">
        {t.resumeButton}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </span>
    </Link>
  );
}
