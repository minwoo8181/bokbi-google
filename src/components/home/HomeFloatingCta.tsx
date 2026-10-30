'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';

/**
 * 홈 바닥 고정 버튼 (대표님 2026-10-29): 검색 카드의 큰 버튼을 빼고 바닥에 늘 띄운다. 흰 띠 위에 버튼 (분석 화면 고정 바와 같은 틀).
 * 단지를 고르면 바로 분석으로 가므로 버튼은 "검색창으로 데려가기"만 한다 — 누르면 검색창으로 올라가 커서를 둔다
 */
export default function HomeFloatingCta() {
  const goSearch = () => {
    const input = document.getElementById('home-search-input');
    // 한 번에 올라간다: 부드러운 스크롤은 도중에 끊기고, 휴대폰 키보드는 누른 순간 focus해야 뜬다
    input?.scrollIntoView({ block: 'center' });
    input?.focus({ preventScroll: true });
  };

  return (
    // 띠는 앱 폭(440)에 맞추고 윗모서리를 둥글게 (대표님 2026-10-29)
    <div className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card rounded-t-3xl border border-b-0 border-border-default">
      <div className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <button
          type="button"
          onClick={goSearch}
          data-testid="home-floating-cta"
          className="w-full h-14 rounded-xl bg-brand hover:bg-brand-hover text-white text-[17px] font-bold active:scale-[0.98] transition-transform duration-fast ease-out-soft"
        >
          {SITE_CONTENT.home.search.submit}
        </button>
      </div>
    </div>
  );
}
