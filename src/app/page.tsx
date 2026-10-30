import React from 'react';
import HomeHeader from '@/components/home/HomeHeader';
import HomeHero from '@/components/home/HomeHero';
import HomeSearchSection from '@/components/home/HomeSearchSection';
import HomeStatsCard from '@/components/home/HomeStatsCard';
import HomeProcessSteps from '@/components/home/HomeProcessSteps';
import BrokerPartnerBanner from '@/components/agent/BrokerPartnerBanner';
import HomeFooter from '@/components/home/HomeFooter';
import HomeMatchTicker from '@/components/home/HomeMatchTicker';
import HomeFloatingCta from '@/components/home/HomeFloatingCta';
import { getMatchCaseFeed, getSearchIndex } from '@/lib/market/repository';
import market from '@/data/market/dasan-market.json';
import offices from '@/data/brokers/dasan-offices.json';
import type { HomeFacts } from '@/lib/home/homeStats';
import { homeComplexExamples } from '@/lib/home/homeMarket';
import LabThemeView from '@/components/lab/LabThemeView';
import SamjeomHome from '@/components/lab/samjeom/SamjeomHome';

/** 홈 숫자 카드 1단계 사실 숫자 (데이터 파일 기준 — 데이터를 다시 만들면 같이 바뀜) */
const HOME_FACTS: HomeFacts = {
  complexes: market.meta.counts.complexes,
  trades: market.meta.counts.validTrades,
  listings: market.meta.counts.saleListings,
  offices: offices.meta.count,
};

/** 숫자 카드 단지 예시 칩 (아이비플레이스·힐스테이트다산·롯데캐슬, 최근 12개월 중개 매매) */
const HOME_EXAMPLES = homeComplexExamples(market.complexes, market.meta.observedAt);

export default function HomePage() {
  const complexes = getSearchIndex();
  return (
    <LabThemeView
      samjeom={<SamjeomHome complexes={complexes} examples={HOME_EXAMPLES} />}
    >
    <div className="flex flex-col min-h-[100dvh] bg-surface-page">
      {/* ── GNB 헤더 ── */}
      <HomeHeader />

      {/* ── 메인 콘텐츠 ── */}
      {/* 섹션마다 둥근 흰 카드 + 옆 여백 + 회색 틈 (토스 앱 방식, 대표님 2026-10-28 "섹션이 안 나눠지고 허전" → "둥글게") */}
      <main className="flex-1 px-3 pt-3 pb-3 flex flex-col gap-3">
        {/* ① 헤이딜러 첫 화면: 문구 + 명패 검색창 + 큰 버튼(홈 CTA) + 이어보기(진행 중일 때만) + 이용 방법 시트 */}
        <div className="bg-surface-card rounded-3xl px-5 pt-7 pb-6 flex flex-col gap-6">
          <HomeHero />
          <HomeSearchSection complexes={complexes} />
          {/* 매칭 사례 알약 (2026-10-29 캔버스: 카드 띠 → 검색 카드 맨 아래 작게) */}
          <HomeMatchTicker feed={getMatchCaseFeed()} />
        </div>

        {/* ② 숫자로 보는 다산동 복비 = 상황별 전광판 + 월별 실거래 막대 (매칭 0건: 분석 사실 / 1건부터: 매칭마다 실적) */}
        <HomeStatsCard facts={HOME_FACTS} examples={HOME_EXAMPLES} />

        {/* ③ 복비는 이렇게 달라요 (진행 3단계 + 다른 점 + 화면 조각) */}
        <HomeProcessSteps />

        {/* ④ 중개사용은 맨 끝 */}
        <BrokerPartnerBanner />
      </main>

      {/* ── 푸터 ── (pb: 바닥 플로팅 버튼에 마지막 줄이 가리지 않게) */}
      <div className="pb-24">
        <HomeFooter />
      </div>

      {/* 바닥 고정 "우리 집 복비 얼마?" → 검색창으로 */}
      <HomeFloatingCta />
    </div>
    </LabThemeView>
  );
}
