'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import type { HomeComplexExample } from '@/lib/home/homeMarket';
import BrandLogo from '@/components/common/BrandLogo';
import HomeSearchSection, { type SearchComplex } from '@/components/home/HomeSearchSection';
import HomeGuideSheet from '@/components/home/HomeGuideSheet';
import HomeFooter from '@/components/home/HomeFooter';
import KeepProgressSteps from '@/components/lab/keeps/KeepProgressSteps';
import SamjeomTabBar from '@/components/lab/samjeom/SamjeomTabBar';
import { SectionTitle } from '@/components/lab/samjeom/SamjeomHomeCards';
import { BrokerSection, OwnerQna, ReportPreview } from './Samjeom2HomeParts';

const t = LAB_CONTENT.samjeom2.home;

/**
 * design-lab 삼쩜삼 심화 홈 (2026-10-30). 논증 순서 = 화면 순서:
 * ① 주장 두 줄 + 무엇인지 한 문장 + 검색(주 행동) + 킵 K3 → ② 이런 리포트를 받아요(휴대폰 틀 속 실제 예시)
 * → ③ 집주인이 먼저 묻는 것(말풍선 → 답 카드 3개) → 끝에 같은 행동 버튼 → ④ 중개사 구획(검정 버튼 = 다른 사람용) → 바닥글.
 * 중개사 입구는 머리줄 오른쪽(첫 화면에서 바로 보임) + ④ 구획 두 곳
 */
export default function Samjeom2Home({
  complexes,
  examples,
  offices,
}: {
  complexes: SearchComplex[];
  examples: HomeComplexExample[];
  offices: number;
}) {
  const router = useRouter();
  const [guide, setGuide] = useState(false);
  const focusSearch = () => {
    const input = document.getElementById('home-search-input');
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  };
  const toBroker = () => document.getElementById('lab-broker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="min-h-[100dvh] bg-surface-page pb-20">
      <header className="h-14 pl-5 pr-3 flex items-center justify-between bg-surface-page sticky top-0 z-30">
        <Link href="/" className="h-11 flex items-center gap-2" aria-label={SITE_CONTENT.common.brandName}>
          <BrandLogo size={28} />
          <span className="text-[20px] font-extrabold text-text-primary">{SITE_CONTENT.common.brandName}</span>
        </Link>
        {/* 오른쪽 위 = 두 번째로 보는 자리: 중개사 입구 (회색 글자 링크, 집주인 주 행동과 겨루지 않게) */}
        <button type="button" onClick={toBroker} className="h-11 px-2 text-[13px] font-bold text-text-secondary">
          {LAB_CONTENT.samjeom2.header.broker}
        </button>
      </header>

      <main className="px-4">
        {/* ① 첫 화면: 주장 → 설명 한 문장 → 검색 하나 */}
        <section className="mt-2 rounded-2xl bg-surface-card px-5 pt-8 pb-6">
          <h1 className="text-[26px] font-bold text-text-primary leading-[1.35] whitespace-pre-line">{t.title}</h1>
          <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">{t.lead}</p>
          <div className="mt-6">
            <HomeSearchSection complexes={complexes} />
          </div>
          <div className="mt-6">
            <KeepProgressSteps current={0} />
          </div>
        </section>

        {/* ② 결과 미리 보기 */}
        <SectionTitle>{t.previewTitle}</SectionTitle>
        <ReportPreview examples={examples} />

        {/* ③ 의문 3개 → 행동 */}
        <SectionTitle>{t.askTitle}</SectionTitle>
        <div className="-mt-6">
          <OwnerQna offices={offices} onCta={focusSearch} />
        </div>

        {/* ④ 중개사 */}
        <SectionTitle>{t.brokerTitle}</SectionTitle>
        <BrokerSection onRegister={() => router.push('/agent/register')} onMore={() => setGuide(true)} />
      </main>

      <div className="mt-8">
        <HomeFooter />
      </div>

      <HomeGuideSheet
        open={guide}
        guide={SITE_CONTENT.home.brokerGuide}
        testId="broker-guide"
        onClose={() => setGuide(false)}
        onDone={() => {
          setGuide(false);
          router.push('/agent/register');
        }}
      />
      <SamjeomTabBar />
    </div>
  );
}
