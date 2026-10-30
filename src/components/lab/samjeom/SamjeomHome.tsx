'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Megaphone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { formatWon } from '@/lib/utils';
import type { ComplexFeedItem } from '@/lib/lab/complexFeed';
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
/** 목록 카드에 처음 보이는 줄 수 (나머지는 "단지 전체 보기") */
const FIRST_ROWS = 5;

/**
 * design-lab 삼쩜삼 홈 (레퍼런스: 삼쩜삼 2024 홈). 회색 바탕 위 "구획 제목 → 흰 카드" 묶음:
 * 알림 줄 → 우리 집 복비 알아보기(검색 + 킵 K3 진행 단계 막대) → 예시 단지 카드 → 단지 복비 목록 → 왜 다를까요 → 중개사 카드 → 바닥글 → 탭 바
 */
export default function SamjeomHome({
  feed,
  complexes,
  examples,
}: {
  feed: ComplexFeedItem[];
  complexes: SearchComplex[];
  examples: HomeComplexExample[];
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [guide, setGuide] = useState<'owner' | 'broker' | null>(null);
  const { hero, partnerBanner, brokerGuide, stats } = SITE_CONTENT.home;
  const rows = showAll ? feed : feed.slice(0, FIRST_ROWS);
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
        {/* 알림 줄 (삼쩜삼 "새로 나왔어요") → 단지 목록으로 */}
        <a href="#lab-complex-list" className="mt-2 min-h-[64px] px-4 py-3 rounded-2xl bg-surface-card flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-brand" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-medium text-brand-hover">{t.notice.label}</span>
            <span className="block text-[15px] font-bold text-text-primary truncate">{t.notice.text.replace('{n}', String(feed.length))}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-text-disabled flex-shrink-0" aria-hidden />
        </a>

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
        <SamjeomSavingsCard examples={examples} />

        <SectionTitle id="lab-complex-list">{t.listTitle}</SectionTitle>
        <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-5">
          <CardLabel>{t.listLabel}</CardLabel>
          <ul>
            {rows.map((i) => (
              <li key={i.id}>
                <Link href={`/analysis/${i.id}`} className="min-h-[64px] py-2 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-brand" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-text-primary truncate">{i.name}</span>
                    <span className="block text-[13px] text-text-tertiary">
                      {i.pyeongName.replace(/\s*\(.*\)$/, '')} ·{' '}
                      <span className="font-bold text-brand-hover">{t.rowFee.replace('{amount}', formatWon(i.recommendedWon))}</span>
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-text-disabled flex-shrink-0" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="mt-3 w-full h-12 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
          >
            {showAll ? t.showLess : t.showAll.replace('{n}', String(feed.length))}
          </button>
          <p className="mt-3 text-[12px] text-text-tertiary">{t.basis}</p>
        </section>

        <SamjeomProcessCard onMore={() => setGuide('owner')} />

        <SectionTitle>{t.partnerTitle}</SectionTitle>
        <section className="rounded-2xl bg-surface-card px-5 pt-5 pb-6" data-testid="home-partner">
          <CardLabel onClick={() => setGuide('broker')}>{t.partnerLabel}</CardLabel>
          <p className="mt-1 text-[17px] font-bold text-text-primary leading-snug whitespace-pre-line">{partnerBanner.title}</p>
          <button
            type="button"
            onClick={() => setGuide('broker')}
            className="mt-5 w-full h-12 rounded-xl bg-brand text-text-inverse text-[15px] font-bold active:scale-[0.99] transition-transform duration-fast"
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
