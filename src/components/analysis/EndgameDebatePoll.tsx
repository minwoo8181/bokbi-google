'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { DebateTopic } from './DebateBottomSheetModal';
import { SITE_CONTENT } from '@/config/siteContent';
import { CompareBars, DebateTopicHead, VoteFoot, VoteVsButtons } from './DebateVisuals';
import { compactComplexName } from '@/data/complexShortNames';

interface EndgameDebatePollProps {
  apartmentName: string;
  debates: DebateTopic[];
  userVotes: Record<string, string>;
  onVote: (topicId: string, optionId: string) => void;
  onOpenDebateModal: () => void;
}

export default function EndgameDebatePoll({
  apartmentName,
  debates,
  userVotes = {},
  onVote,
  onOpenDebateModal,
}: EndgameDebatePollProps) {
  const { debates: debatesConfig } = SITE_CONTENT.analysis;
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const safeDebates = debates ?? [];

  // 5초마다 다음 주제로 부드럽게 롤링 (사용자가 마우스 올리거나 터치 중일 때는 일시정지)
  useEffect(() => {
    if (isPaused || safeDebates.length === 0) return;
    const timer = setInterval(() => {
      setActiveTopicIndex((prev) => (prev + 1) % safeDebates.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [safeDebates.length, isPaused]);

  // 계기가 되는 데이터가 없는 단지는 투표 카드를 띄우지 않는다 (다른 단지 주제로 채우지 않음)
  if (safeDebates.length === 0) return null;

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4"
    >
      {/* ── 헤더: 타이틀 & 순환 인디케이터 (대표님 지침: '실시간 롤링' 버블 영구 삭제) ── */}
      <div className="flex items-center justify-between gap-2">
        {/* 제목 앞에 단지 짧은 이름 "자이아이비 끝장 투표" (대표님 2026-10-29). "(주거복합)" 같은 괄호는 떼고 짧은 이름 표로 */}
        <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight min-w-0 truncate">
          {debatesConfig.cardTitle.replace('{name}', compactComplexName(apartmentName.replace(/\s*\(.*\)\s*$/, '')))}
        </h2>

        {/* 주제 순환 인디케이터 (1/5, 이전, 다음) */}
        <div className="flex items-center gap-2 text-[12px] text-text-tertiary flex-shrink-0 ml-2">
          <span className="font-extrabold text-text-secondary tabular-nums">
            {activeTopicIndex + 1} / {safeDebates.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsPaused(true);
                setActiveTopicIndex((prev) => (prev - 1 + safeDebates.length) % safeDebates.length);
              }}
              className="w-6 h-6 rounded-md hover:bg-surface-subtle flex items-center justify-center border border-border-default active:scale-95 transition-transform"
              aria-label="이전 투표 주제"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPaused(true);
                setActiveTopicIndex((prev) => (prev + 1) % safeDebates.length);
              }}
              className="w-6 h-6 rounded-md hover:bg-surface-subtle flex items-center justify-center border border-border-default active:scale-95 transition-transform"
              aria-label="다음 투표 주제"
            >
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 활성 토론 주제 카드 (부드러운 전환 & 가독성 높은 한국어 타이포) ── */}
      {/*
        주제 5개를 같은 칸(grid 1/1)에 겹쳐 두고 지금 주제만 보이게 (나머지는 invisible — 자리만 차지, 누를 수 없음).
        카드 높이 = 그 화면 폭에서 가장 긴 주제 → 5초마다 넘어가도 들썩이지 않고, 넓은 화면에서 아래가 비지 않음 (대표님 2026-10-27 "반응형으로")
      */}
      <div className="p-4 rounded-xl bg-surface-subtle border border-border-default grid">
        {safeDebates.map((topic, i) => {
          const active = i === activeTopicIndex;
          const voted = userVotes[topic.id];
          return (
            <div
              key={topic.id}
              aria-hidden={!active}
              className={`[grid-area:1/1] space-y-3 ${active ? 'animate-rise-in' : 'invisible'}`}
            >
              <DebateTopicHead
                badge={topic.badge}
                status={voted ? debatesConfig.statusVoted : debatesConfig.statusOpen}
                question={topic.question}
                description={topic.description}
              />

              {topic.compare && <CompareBars compare={topic.compare} />}

              {/* VS 대결형 선택 칸 (대표님 A안 2026-10-27) */}
              <VoteVsButtons
                options={topic.options}
                votedOptionId={voted}
                onVote={(optId) => {
                  setIsPaused(true);
                  onVote(topic.id, optId);
                }}
                testId={(idx) => (active ? `inline-opt-${idx}` : `inline-opt-${i}-${idx}-hidden`)}
              />
              {/* 실제 집계 전까지 결과(퍼센트·표수)를 보여주지 않는다 (가짜 표수 금지, 대표님 승인 2026-10-24) */}
              <VoteFoot hasVoted={Boolean(voted)} />
            </div>
          );
        })}
      </div>

      {/* ── 전체 투표방 참여 진입 바 (토스식 풀 바텀시트 호출) ── */}
      <button
        type="button"
        data-testid="open-debate-modal-btn"
        onClick={onOpenDebateModal}
        className="w-full py-3 px-3 rounded-xl bg-surface-subtle hover:bg-surface-card border border-border-default flex items-center justify-between text-[13px] text-text-secondary hover:text-brand font-bold transition-all active:scale-98"
      >
        <span className="flex items-center gap-2">
          <span>{debatesConfig.openModalButtonText.replace('{count}', String(safeDebates.length))}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-text-tertiary" />
      </button>
    </section>
  );
}
