'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, Home } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import BrandLogo from '@/components/common/BrandLogo';

export default function HomeHeader() {
  const { common } = SITE_CONTENT;

  return (
    // 머리줄을 위에 고정 (아파트 화면처럼 스크롤해도 붙어 있게, 대표님 2026-10-28 "붕 뜬 느낌").
    // 바탕은 페이지 회색과 같게, 선 없이 (대표님 2026-10-29 "흰 바탕 빼줘") — 투명이면 스크롤 때 카드가 비쳐서 회색으로 채운다
    <header className="h-14 px-5 flex items-center justify-between bg-surface-page sticky top-0 z-30">
      <Link href="/" className="flex items-center gap-2 active:opacity-70 transition-opacity">
        <BrandLogo size={30} />
        <span className="font-extrabold text-[20px] tracking-[-0.03em] text-text-primary">
          {common.brandName}
        </span>
        <span className="text-[12px] font-bold text-brand-hover bg-brand-light px-2 py-1 rounded-full">
          {common.regionBadge}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/my-requests"
          className="h-8 px-3 rounded-full bg-surface-card border border-border-default text-[13px] font-semibold text-text-secondary hover:bg-surface-subtle flex items-center gap-2 justify-center transition-all active:scale-95"
        >
          <Home className="w-3.5 h-3.5 text-text-secondary" />
          {common.navMyRequests}
        </Link>
        <Link
          href="/agent/register"
          className="h-8 px-3 rounded-full bg-surface-card border border-border-default text-[13px] font-semibold text-text-secondary hover:bg-surface-subtle flex items-center gap-2 justify-center transition-all active:scale-95"
        >
          <Briefcase className="w-3.5 h-3.5 text-text-secondary" />
          {common.navBroker}
        </Link>
      </div>
    </header>
  );
}
