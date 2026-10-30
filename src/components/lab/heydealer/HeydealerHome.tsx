'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import type { HomeComplexExample } from '@/lib/home/homeMarket';
import type { HomeFacts } from '@/lib/home/homeStats';
import HomeSearchSection, { type SearchComplex } from '@/components/home/HomeSearchSection';
import HomeGuideSheet from '@/components/home/HomeGuideSheet';
import HomeFooter from '@/components/home/HomeFooter';
import HeydealerMenu from './HeydealerMenu';
import { HdExampleList, HdFactBoard, HdProcessTimeline, HdSectionTitle } from './HeydealerHomeCards';

const t = LAB_CONTENT.heydealer.home;
const tm = LAB_CONTENT.heydealer.menu;

/**
 * design-lab 헤이딜러 홈 (레퍼런스: 헤이딜러 2023 "먼저, 내 차 시세를 알아볼까요?").
 * 먹색 머리줄(글자 탭 2개 + 메뉴) 위로 둥근 연회색 판이 올라오고, 판 위엔 큰 질문 + 명패 검색창 하나가 첫 화면 전부.
 * 아래로: 전광판(사실 숫자) → 단지별 복비 예시(펼침 견적 카드) → 진행 순서(점선 타임라인) → 바닥글.
 * 탭 바 대신 오른쪽 메뉴 판, 중개사 입구는 머리줄 두 번째 탭 (헤이딜러 "내차 살 때")
 */
export default function HeydealerHome({
  complexes,
  examples,
  facts,
}: {
  complexes: SearchComplex[];
  examples: HomeComplexExample[];
  facts: HomeFacts;
}) {
  const router = useRouter();
  const [guide, setGuide] = useState<'owner' | 'broker' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { brokerGuide } = SITE_CONTENT.home;
  const focusSearch = () => {
    const input = document.getElementById('home-search-input');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  };
  const openGuide = (g: 'owner' | 'broker') => {
    setMenuOpen(false);
    setGuide(g);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--lab-ink)]">
      <header className="h-14 pl-3 pr-2 flex items-center justify-between">
        <nav className="flex items-center" aria-label={SITE_CONTENT.common.brandName}>
          <span aria-current="page" className="h-11 px-2 flex items-center text-[15px] font-bold text-text-inverse border-b-2 border-text-inverse">
            {t.tabOwner}
          </span>
          <button type="button" onClick={() => setGuide('broker')} className="h-11 px-2 ml-2 text-[15px] font-bold text-text-disabled">
            {t.tabBroker}
          </button>
        </nav>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label={tm.open} className="w-11 h-11 flex items-center justify-center text-text-inverse">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* 둥근 판: 질문 + 명패 하나 */}
      <main className="min-h-[calc(100dvh-56px)] rounded-t-3xl bg-surface-page px-5 pt-10 pb-8">
        <h1 className="px-1 text-[26px] font-bold text-text-primary leading-[1.4] whitespace-pre-line">{t.question}</h1>
        <div className="mt-8">
          <HomeSearchSection complexes={complexes} />
        </div>

        <HdSectionTitle>{t.boardTitle}</HdSectionTitle>
        <HdFactBoard facts={facts} />

        <HdSectionTitle note={t.examplesNote}>{t.examplesTitle}</HdSectionTitle>
        <HdExampleList examples={examples} />

        <HdSectionTitle>{t.processTitle}</HdSectionTitle>
        <HdProcessTimeline onMore={() => setGuide('owner')} />
      </main>

      <div className="bg-surface-page">
        <HomeFooter />
      </div>

      <HeydealerMenu open={menuOpen} onClose={closeMenu} onOwnerGuide={() => openGuide('owner')} onBrokerGuide={() => openGuide('broker')} />
      <HomeGuideSheet
        open={guide === 'owner'}
        onClose={() => setGuide(null)}
        onDone={() => {
          setGuide(null);
          focusSearch();
        }}
      />
      <HomeGuideSheet
        open={guide === 'broker'}
        guide={brokerGuide}
        testId="broker-guide"
        onClose={() => setGuide(null)}
        onDone={() => {
          setGuide(null);
          router.push('/agent/register');
        }}
      />
    </div>
  );
}
