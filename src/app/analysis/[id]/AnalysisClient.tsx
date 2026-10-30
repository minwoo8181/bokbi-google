'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { INITIAL_SPECIAL_BONUS_OPTIONS } from '@/lib/mock-analysis-data';
import { commissionFromDiscount, computeCommissionQuote } from '@/lib/commission';
import { ENGINE_PARAMS } from '@/lib/analysis/marketEngine';
import type { AnalysisBundle } from '@/lib/market/repository';
import { floorBandLabel, referenceOf } from '@/lib/market/floorBand';
import { SITE_CONTENT } from '@/config/siteContent';
import AnalysisHeader from '@/components/analysis/AnalysisHeader';
import ApartmentHeroBadge from '@/components/analysis/ApartmentHeroBadge';
import TradeTypeToggle from '@/components/analysis/TradeTypeToggle';
import PyeongSelectorChips from '@/components/analysis/PyeongSelectorChips';
import FloorSelectorChips from '@/components/analysis/FloorSelectorChips';
import CommissionCustomizerCard from '@/components/analysis/CommissionCustomizerCard';
import HokimTradeChartCard from '@/components/analysis/HokimTradeChartCard';
import RecommendationReasonCard from '@/components/analysis/RecommendationReasonCard';
import EndgameDebatePoll from '@/components/analysis/EndgameDebatePoll';
import DebateBottomSheetModal, { DebateTopic } from '@/components/analysis/DebateBottomSheetModal';
import MatchingStickyBar from '@/components/analysis/MatchingStickyBar';
import MatchingBottomSheetModal from '@/components/analysis/MatchingBottomSheetModal';
import { useAnalysisTracking } from '@/components/analysis/useAnalysisTracking';
import { useLabTheme } from '@/components/lab/useLabTheme';
import SamjeomAnalysisBody from '@/components/lab/samjeom/SamjeomAnalysisBody';
import HeydealerAnalysisBody from '@/components/lab/heydealer/HeydealerAnalysisBody';
import {
  TradeType,
  FloorCategory,
  SpecialBonusOption,
} from '@/components/analysis/types';
import {
  findSavedPyeong,
  parseResume,
  RESUME_KEY,
  type ResumeStep,
  type SavedRequest,
} from '@/lib/requests/requestDraft';

/** 거래가 가장 많은 평형을 기본 선택 (대표 평형) */
function defaultPyeongId(list: AnalysisBundle['pyeongList']): string {
  const scored = list.map((p) => ({ id: p.id, n: p.market?.sale.series.reduce((s, m) => s + m.count, 0) ?? 0 }));
  return scored.sort((a, b) => b.n - a.n)[0]?.id ?? list[0].id;
}

export default function AnalysisClient({ apartment, pyeongList, observedAt, datasetStats, units, debates: initialDebates, complexInfo }: AnalysisBundle) {
  const router = useRouter();
  const labTheme = useLabTheme();

  // 2. 핵심 인터랙션 상태
  const [tradeType, setTradeType] = useState<TradeType>('매매');
  const [selectedPyeongId, setSelectedPyeongId] = useState<string>(() => defaultPyeongId(pyeongList));
  // 첫 화면은 이 평형 가장 최근 거래의 층 구간 → 평형 칩 가격 = 가장 최근 실거래
  const [floorCategory, setFloorCategory] = useState<FloorCategory>(
    () => pyeongList.find((p) => p.id === defaultPyeongId(pyeongList))?.market?.sale.latestFloor ?? 'mid',
  );
  const [bonusOptions, setBonusOptions] = useState<SpecialBonusOption[]>(INITIAL_SPECIAL_BONUS_OPTIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  // 다시 요청 (내 의뢰 → 수정): 저장된 요청서의 평형·거래 유형·층으로 맞추고 모달을 그 단계부터 연다
  const [resume, setResume] = useState<{ draft: SavedRequest; step: ResumeStep; feeWon: number } | null>(null);

  useEffect(() => {
    // 주소의 ?resume=1 은 모달을 닫을 때 지운다 (여기서 지우면 개발 모드의 두 번째 마운트가 못 읽음)
    if (new URLSearchParams(window.location.search).get('resume') !== '1') return;
    try {
      const info = parseResume(JSON.parse(localStorage.getItem(RESUME_KEY) ?? 'null'));
      const draft = info?.draft ?? null;
      const pyeong = draft && draft.aptId === String(apartment.id) ? findSavedPyeong(pyeongList, draft) : null;
      if (!draft || !info || !pyeong) return;
      setTradeType(draft.tradeType);
      setSelectedPyeongId(pyeong.id);
      setFloorCategory(draft.floorCategory);
      setResume({ draft, step: info.step, feeWon: info.feeWon });
      setIsModalOpen(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 주민 투표: 단지 실데이터로 만든 주제 (서버에서 생성, 대표님 승인 2026-10-24)
  const [debates, setDebates] = useState<DebateTopic[]>(initialDebates);

  useEffect(() => {
    setDebates(initialDebates);
  }, [initialDebates]);
  const [userDebateVotes, setUserDebateVotes] = useState<Record<string, string>>({});
  const [isDebateModalOpen, setIsDebateModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bokbi_debate_votes');
      if (saved) setUserDebateVotes(JSON.parse(saved));
    } catch {}
  }, []);

  const handleDebateVote = (topicId: string, optionId: string) => {
    const prevOptionId = userDebateVotes[topicId];
    if (prevOptionId === optionId) return;

    setDebates((prev) =>
      prev.map((d) => {
        if (d.id !== topicId) return d;
        const [optA, optB] = d.options;
        let newA = optA.votes;
        let newB = optB.votes;
        if (prevOptionId === optA.id) newA -= 1;
        if (prevOptionId === optB.id) newB -= 1;
        if (optionId === optA.id) newA += 1;
        if (optionId === optB.id) newB += 1;
        return {
          ...d,
          options: [
            { ...optA, votes: newA },
            { ...optB, votes: newB },
          ],
        };
      })
    );

    const nextVotes = { ...userDebateVotes, [topicId]: optionId };
    setUserDebateVotes(nextVotes);
    try {
      localStorage.setItem('bokbi_debate_votes', JSON.stringify(nextVotes));
    } catch {}
  };

  const selectedPyeong = useMemo(() => {
    return pyeongList.find((p) => p.id === selectedPyeongId) || pyeongList[0];
  }, [pyeongList, selectedPyeongId]);

  // 4~5. 기준 거래금액 = 선택 평형·층 구간의 가장 최근 실거래 (대표님 결정 2026-10-23).
  //      층·인테리어·개인 사정으로 집마다 가격이 달라 예상가를 만들지 않는다. 평형 칩·층 칩·복비 카드·추천 이유가 같은 값을 쓴다
  const reference = referenceOf(selectedPyeong, tradeType, floorCategory);
  const recommendation = reference?.recommendation ?? null;
  const floorLabel = floorBandLabel(floorCategory);
  const currentDealPriceWon = (reference?.priceManwon ?? 0) * 10000;

  // 6. 엔진 추천 복비 (시장 연동 할인율 → 만 원 단위)
  const defaultRecommendedWon = useMemo(() => {
    return commissionFromDiscount(currentDealPriceWon, tradeType, recommendation?.discount ?? ENGINE_PARAMS.midRecDiscount);
  }, [currentDealPriceWon, tradeType, recommendation?.discount]);

  const [customCommissionWon, setCustomCommissionWon] = useState<number>(defaultRecommendedWon);

  // 단지나 조건이 변경될 때 추천가로 동기화
  useEffect(() => {
    setCustomCommissionWon(defaultRecommendedWon);
  }, [defaultRecommendedWon]);

  // 보너스 토글 핸들러
  const handleToggleBonus = (id: string) => {
    setBonusOptions((prev) =>
      prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b))
    );
  };

  // 보너스 금액 수정 핸들러 (집주인 직접 입력 옵션용)
  const handleUpdateBonusAmount = (id: string, amount: number) => {
    setBonusOptions((prev) =>
      prev.map((b) => (b.id === id ? { ...b, amountWon: amount } : b))
    );
  };

  // 집주인 직접 입력 협의조건 텍스트 수정 핸들러
  const handleUpdateBonusConditionText = (id: string, text: string) => {
    setBonusOptions((prev) =>
      prev.map((b) => (b.id === id ? { ...b, customConditionText: text } : b))
    );
  };

  // 총 복비 = 제안 복비 + 보너스, 단일 견적 엔진으로 법정 상한 하드 캡 (RULES 규칙 11)
  const totalBonusWon = bonusOptions
    .filter((b) => b.checked)
    .reduce((sum, b) => sum + b.amountWon, 0);
  const quote = computeCommissionQuote({ basisPriceWon: currentDealPriceWon, tradeType, proposedWon: customCommissionWon, bonusWon: totalBonusWon });
  const totalCommissionWon = quote.totalWon;
  const savedWon = quote.savedWon;
  useAnalysisTracking({
    complexId: String(apartment.id),
    pyeongId: selectedPyeong.id,
    tradeType,
    recommendedWon: defaultRecommendedWon,
    chosenWon: customCommissionWon,
    legalMaxWon: quote.legal.maxWon,
  });

  const handleShare = () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        navigator.share({
          title: `${apartment.apt_name} ${selectedPyeong.name} 복비 분석`,
          url: typeof window !== 'undefined' ? window.location.href : '',
        }).catch(() => {});
      } else {
        alert('분석 결과 링크가 복사되었습니다.');
      }
    } catch {
      alert('분석 결과 링크가 복사되었습니다.');
    }
  };

  // 근거 카드 3개: 원래 화면과 design-lab 당근 화면이 같은 요소를 쓴다
  const reasonCard = (
    <RecommendationReasonCard
      tradeType={tradeType}
      recommendation={recommendation}
      observedAt={observedAt}
      datasetStats={datasetStats}
      complexId={apartment.id}
      pyeongId={selectedPyeong.id}
      floorCategory={floorCategory}
    />
  );
  const chartCard = (
    <HokimTradeChartCard
      pyeong={selectedPyeong}
      floorCategory={floorCategory}
      floorLabel={floorLabel}
      tradeType={tradeType}
      reference={reference}
    />
  );
  const debatePoll = (
    <EndgameDebatePoll
      apartmentName={apartment.apt_name}
      debates={debates}
      userVotes={userDebateVotes}
      onVote={handleDebateVote}
      onOpenDebateModal={() => setIsDebateModalOpen(true)}
    />
  );

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface-page pb-28 samjeom:pb-0 heydealer:pb-0">
      {labTheme === 'samjeom' ? (
        <SamjeomAnalysisBody
          apartment={apartment}
          pyeongList={pyeongList}
          selectedPyeong={selectedPyeong}
          onSelectPyeong={setSelectedPyeongId}
          tradeType={tradeType}
          onChangeTradeType={setTradeType}
          floorCategory={floorCategory}
          onSelectFloor={setFloorCategory}
          reference={reference}
          recommendation={recommendation}
          totalCommissionWon={totalCommissionWon}
          legalMaxWon={quote.legal.maxWon}
          onBack={() => router.push('/')}
          onShare={handleShare}
          onOpenModal={() => setIsModalOpen(true)}
          sections={{ chart: chartCard, reason: reasonCard, poll: debatePoll }}
        />
      ) : labTheme === 'heydealer' ? (
        <HeydealerAnalysisBody
          apartment={apartment}
          complexInfo={complexInfo}
          pyeongList={pyeongList}
          selectedPyeong={selectedPyeong}
          onSelectPyeong={setSelectedPyeongId}
          tradeType={tradeType}
          onChangeTradeType={setTradeType}
          floorCategory={floorCategory}
          onSelectFloor={setFloorCategory}
          reference={reference}
          recommendation={recommendation}
          dealPriceWon={currentDealPriceWon}
          totalCommissionWon={totalCommissionWon}
          legalMaxWon={quote.legal.maxWon}
          onBack={() => router.push('/')}
          onShare={handleShare}
          onOpenModal={() => setIsModalOpen(true)}
          sections={{ chart: chartCard, reason: reasonCard, poll: debatePoll }}
        />
      ) : (
      <>
      {/* ── GNB 상단 헤더 ── */}
      <AnalysisHeader
        apartmentName={apartment.apt_name}
        onBack={() => router.push('/')}
        onShare={handleShare}
      />

      {/* ── 단일 수직 플로우 메인 콘텐츠 (대표님 피드백 반영: 탭 제거 및 100% 통합) ── */}
      <main className="flex-1 px-5 pt-4 flex flex-col gap-4">
        {/* ① 헤이딜러 번호판 배지 + 심플한 👑 대장 단독 배지 + 오늘 실제 조회수 */}
        <ApartmentHeroBadge apartment={apartment} complexInfo={complexInfo} />

        {/* ②③④ "평형·층 고르기" 흰 카드 한 장 (대표님 2026-10-29 캔버스 1번 "테두리 카드"):
            제목 + 매매/전세 → 평형 칸 → 층 칸(층·가격만) → 거래 수·최근 거래 한 줄 */}
        <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4" data-testid="pyeong-floor-card">
          <PyeongSelectorChips
            pyeongList={pyeongList}
            selectedPyeongId={selectedPyeongId}
            onSelectPyeong={setSelectedPyeongId}
            headerRight={<TradeTypeToggle tradeType={tradeType} onChangeTradeType={setTradeType} />}
          />
          <FloorSelectorChips
            floorCategory={floorCategory}
            pyeong={selectedPyeong}
            tradeType={tradeType}
            onSelectFloor={setFloorCategory}
          />
        </section>

        {/* ⑤ 추천 복비 카드 (보여주기 전용 + 무료 매칭 버튼). 조절·옵션은 매칭 요청 창 "복비 정하기" 단계 (2026-10-27) */}
        <CommissionCustomizerCard
          tradeType={tradeType}
          dealPriceWon={currentDealPriceWon}
          reference={reference}
          floorBandName={SITE_CONTENT.analysis.floorSelector.bands[floorCategory].label}
          onRequestMatch={() => setIsModalOpen(true)}
          recommendation={recommendation}
          customCommissionWon={customCommissionWon}
        />

        {/* ⑤-1 추천 근거: 복비 카드 바로 아래 (대표님 지시 2026-10-22) — 수요·공급 위치 → 거래가 규모 → 추천 할인 계산 */}
        {reasonCard}

        {/* ⑥ 내 집 맞춤 진단 배너는 복비 카드 매칭 유도·하단 바와 같은 행동이라 화면에서 내림 (파일 유지, 대표님 승인 2026-10-24) */}

        {/* ⑦ [팩트 확인] 호갱노노 스타일 2개년 Recharts 추세선 + 거래량 바 + 국토부 실제 계약 목록 테이블 */}
        {chartCard}

        {/* ⑨ 실시간 주민 끝장 토론 롤링 카드 (원터치 투표 & 풀 바텀시트 트리거) */}
        {debatePoll}
        {/* 매칭 사례 피드는 홈 1·2 섹션 사이로 옮김 (HomeMatchTicker, 대표님 2026-10-28) */}
      </main>

      {/* ── 하단 고정 액션 바 (안심 가드레일 인포그래픽 바 + 동적 절약액 반영 CTA) ── */}
      <MatchingStickyBar
        legalMaxWon={quote.legal.maxWon}
        savedWon={savedWon}
        totalCommissionWon={totalCommissionWon}
        onOpenModal={() => setIsModalOpen(true)}
      />
      </>
      )}

      {/* ── 주민 끝장 토론 전체보기 및 의견 피드 풀 바텀시트 모달 ── */}
      <DebateBottomSheetModal
        isOpen={isDebateModalOpen}
        onClose={() => setIsDebateModalOpen(false)}
        apartmentName={apartment.apt_name}
        debates={debates}
        userVotes={userDebateVotes}
        onVote={handleDebateVote}
      />

      {/* ── 네이버 확인매물 연동 매물 등록 마법사 모달 (모달 내 거래유형·평형 스위처 연동) ── */}
      <MatchingBottomSheetModal
        isOpen={isModalOpen}
        key={modalKey}
        onClose={(opts) => {
          setIsModalOpen(false);
          // 요청을 마치고 닫으면 모달을 새로 만든다: 다음에 열면 1단계부터 (작성 중에 닫으면 그대로 이어서)
          if (opts?.completed) setModalKey((k) => k + 1);
          if (resume) {
            // 다시 요청을 마치거나 그만두면 이어하기 정보와 주소 표시를 지운다 (새로고침해도 다시 안 열리게)
            setResume(null);
            try {
              localStorage.removeItem(RESUME_KEY);
            } catch {}
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
        resume={resume}
        apartment={apartment}
        tradeType={tradeType}
        onChangeTradeType={setTradeType}
        selectedPyeong={selectedPyeong}
        onSelectPyeong={setSelectedPyeongId}
        pyeongList={pyeongList}
        floorCategory={floorCategory}
        floorLabel={floorLabel}
        customCommissionWon={customCommissionWon}
        bonusOptions={bonusOptions}
        fee={{
          tradeType,
          dealPriceWon: currentDealPriceWon,
          recommendation,
          onCommissionChange: setCustomCommissionWon,
          onToggleBonus: handleToggleBonus,
          onUpdateBonusAmount: handleUpdateBonusAmount,
          onUpdateBonusConditionText: handleUpdateBonusConditionText,
        }}
        units={units}
      />
    </div>
  );
}
