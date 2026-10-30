'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import type { HomeComplexExample } from '@/lib/home/homeMarket';
import BrandLogo from '@/components/common/BrandLogo';
import type { SearchComplex } from '@/components/home/HomeSearchSection';
import HomeFooter from '@/components/home/HomeFooter';
import SamjeomOwnerHome from './SamjeomOwnerHome';
import SamjeomBrokerHome from './SamjeomBrokerHome';
import { TabBar } from './SamjeomUi';

const a = LAB_CONTENT.samjeom.audience;
type Audience = 'owner' | 'broker';

/**
 * design-lab 삼쩜삼 홈 2차 (2026-10-30). 맨 위 "집주인 | 중개사" 보기 바꾸기로 두 사람의 흐름을 가른다
 * (삼쩜삼 홈이 개인사업자를 따로 받는 방식을 한 단계 위로). 기본은 집주인, 주소 #broker면 중개사로 연다(공유·광고 링크용)
 */
export default function SamjeomHome({ complexes, examples }: { complexes: SearchComplex[]; examples: HomeComplexExample[] }) {
  const [who, setWho] = useState<Audience>('owner');
  useEffect(() => {
    const read = () => setWho(window.location.hash === '#broker' ? 'broker' : 'owner');
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const pick = (w: Audience) => {
    setWho(w);
    window.history.replaceState(null, '', w === 'broker' ? '#broker' : window.location.pathname);
    window.scrollTo({ top: 0 });
  };
  const focusSearch = () => {
    const input = document.getElementById('home-search-input');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  };

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-20">
      <header className="h-14 pl-5 pr-4 flex items-center justify-between bg-surface-page sticky top-0 z-30">
        <Link href="/" className="h-11 flex items-center gap-2" aria-label={SITE_CONTENT.common.brandName}>
          <BrandLogo size={28} />
          <span className="text-[20px] font-extrabold text-text-primary">{SITE_CONTENT.common.brandName}</span>
        </Link>
        {/* 오른쪽 위 = 두 번째로 보는 자리: 누구용 화면인지 바꾸기 */}
        {/* 칸 높이 44px (바깥 52px - 안쪽 여백 4px×2) */}
        <div role="tablist" aria-label={a.label} className="h-13 p-1 rounded-full bg-border-default flex">
          {(['owner', 'broker'] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={who === w}
              onClick={() => pick(w)}
              className={`min-w-[64px] px-3 rounded-full text-[13px] font-bold ${
                who === w ? 'bg-surface-card text-text-primary' : 'text-text-secondary'
              }`}
            >
              {a[w]}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 pt-2" role="tabpanel">
        {who === 'owner' ? (
          <SamjeomOwnerHome complexes={complexes} examples={examples} onFocusSearch={focusSearch} onBroker={() => pick('broker')} />
        ) : (
          <SamjeomBrokerHome examples={examples} />
        )}
      </main>

      <div className="mt-10">
        <HomeFooter />
      </div>
      <TabBar />
    </div>
  );
}
