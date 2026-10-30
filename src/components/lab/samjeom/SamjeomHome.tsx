'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import type { HomeComplexExample } from '@/lib/home/homeMarket';
import BrandLogo from '@/components/common/BrandLogo';
import FormattedText from '@/components/common/FormattedText';
import HomeSearchSection, { type SearchComplex } from '@/components/home/HomeSearchSection';
import HomeGuideSheet from '@/components/home/HomeGuideSheet';
import HomeFooter from '@/components/home/HomeFooter';
import KeepProgressSteps from '@/components/lab/keeps/KeepProgressSteps';
import SamjeomTabBar from './SamjeomTabBar';
import { CardLabel, SamjeomProcessCard, SamjeomSavingsCard, SectionTitle } from './SamjeomHomeCards';

const t = LAB_CONTENT.samjeom.home;

/**
 * design-lab 삼쩜삼 홈 (레퍼런스: 삼쩜삼 2024 홈). 회색 바탕 위 "구획 제목 → 흰 카드" 묶음:
 * 우리 집 복비 알아보기(검색 + 킵 K3 진행 단계 막대) → 예시 단지 막대 카드 → 왜 다를까요 → 중개사 카드 → 바닥글 → 탭 바.
 * 주 버튼은 검색 하나 — 카드 아래 버튼은 연파랑 보조 (2026-10-30: 알림 줄·단지 목록은 대표님이 뺌)
 */
export default function SamjeomHome({ complexes, examples }: { complexes: SearchComplex[]; examples: HomeComplexExample[] }) {
  const router = useRouter();
  const [guide, setGuide] = useState<'owner' | 'broker' | null>(null);
  const { hero, partnerBanner, brokerGuide, stats } = SITE_CONTENT.home;
  const focusSearch = () => {
    const input = document.getElementById('home-search-input');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  };

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-20">
      <header className="h-14 px-5 flex items-center bg-surface-page sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2" aria-label={SITE_CONTENT.common.brandName}>
          <BrandLogo size={28} />
          <span className="text-[20px] font-extrabold text-text-primary">{SITE_CONTENT.common.brandName}</span>
        </Link>
      </header>

      <main className="px-4">
        <SectionTitle>{t.startTitle}</SectionTitle>
        <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-6">
          <CardLabel onClick={() => setGuide('owner')}>{t.startLabel}</CardLabel>
          <p className="mt-1 text-[17px] font-bold text-text-primary leading-snug">
            <FormattedText text={hero.title} highlightClassName="text-brand" />
          </p>
          <div className="mt-4">
            <HomeSearchSection complexes={complexes} />
          </div>
          <div className="mt-5">
            <KeepProgressSteps current={0} />
          </div>
        </section>

        <SectionTitle>{stats.sectionTitle}</SectionTitle>
        <SamjeomSavingsCard examples={examples} onCta={focusSearch} />

        <SamjeomProcessCard onMore={() => setGuide('owner')} />

        <SectionTitle>{t.partnerTitle}</SectionTitle>
        <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-6" data-testid="home-partner">
          <CardLabel onClick={() => setGuide('broker')}>{t.partnerLabel}</CardLabel>
          <p className="mt-1 text-[17px] font-bold text-text-primary leading-snug whitespace-pre-line">{partnerBanner.title}</p>
          <button
            type="button"
            onClick={() => setGuide('broker')}
            className="mt-5 w-full h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
          >
            {partnerBanner.buttonText}
          </button>
        </section>
      </main>

      <div className="mt-8">
        <HomeFooter />
      </div>

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

      <SamjeomTabBar />
    </div>
  );
}
