'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { SITE_CONTENT } from '@/config/siteContent';
import type { DebateCompareSide } from '@/lib/market/debateTopics';

/**
 * 끝장 투표 카드 조각 (2026-10-27 대표님 G안: 구성은 그대로, 투표 칸만 무채색, 출렁이는 결과 막대 없음. 배지·데이터 막대 색은 예전 그대로).
 * 분석 화면 카드(EndgameDebatePoll)와 전체 투표 창(DebateBottomSheetModal)이 같이 쓴다.
 * 순서: 주제 머리(DebateTopicHead) → 데이터로 보면(CompareBars) → 두 칸 + VS(VoteVsButtons) → 결과 안내 한 줄(VoteFoot)
 */
export function DebateTopicHead({ badge, status, question, description }: { badge: string; status: string; question: string; description: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-extrabold px-2 py-1 rounded bg-brand-light text-brand-hover border border-brand-line">{badge}</span>
        <span className="text-[12px] font-medium text-text-tertiary">{status}</span>
      </div>
      {/* 질문이 두 줄이면 줄 끝을 고르게 (text-pretty), 설명은 바로 아래 */}
      <div className="mt-3">
        <h3 className="text-[15px] font-bold text-text-primary leading-snug tracking-tight break-keep text-pretty">{question}</h3>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary leading-normal break-keep text-pretty">{description}</p>
      </div>
    </div>
  );
}

/** 결과 자리: 실제 집계 전까지 결과(퍼센트·표수)를 보여주지 않는다 (가짜 표수 금지). 예전 출렁이는 막대는 없앰 (대표님 "정신없다") */
export function VoteFoot({ hasVoted }: { hasVoted: boolean }) {
  const { debates } = SITE_CONTENT.analysis;
  return (
    <p className="text-[12px] font-medium text-text-tertiary text-center" data-testid="vote-foot">
      {hasVoted ? debates.votedNotice : debates.blindResultNotice}
    </p>
  );
}

/**
 * 두 칸 + 가운데 VS. 흰 칸 · 회색 테두리, 고르면 그 칸만 파란 테두리에 불이 들어옴 + ✓ 내 선택 (대표님 2026-10-27, 안 고른 칸은 그대로)
 */
export function VoteVsButtons({
  options,
  votedOptionId,
  onVote,
  testId,
}: {
  options: readonly { id: string; label: string }[];
  votedOptionId: string | undefined;
  onVote: (optionId: string) => void;
  testId: (idx: number) => string;
}) {
  const { debates } = SITE_CONTENT.analysis;
  const hasVoted = Boolean(votedOptionId);
  return (
    <div className="relative grid grid-cols-2 gap-2">
      {options.map((opt, idx) => {
        const isSelected = votedOptionId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            data-testid={testId(idx)}
            aria-pressed={isSelected}
            onClick={() => onVote(opt.id)}
            className={`min-h-[68px] px-3 py-3 rounded-xl bg-surface-card flex flex-col items-center justify-center gap-1 text-center text-text-primary transition-colors duration-fast ease-out-soft active:scale-98 ${
              isSelected ? 'border-2 border-brand ring-4 ring-brand-glow' : 'border border-border-default'
            }`}
          >
            {/* 칸 안쪽 폭 ≈ 96px(분석 카드): 7자 이상(단지 짧은 이름 등)은 13px로 한 줄 + 가운데 VS와 겹치지 않게 */}
            <span className={`${opt.label.length >= 7 ? 'text-[13px]' : 'text-[15px]'} font-bold leading-snug tracking-tight break-keep [overflow-wrap:anywhere] text-balance`}>{opt.label}</span>
            <span className={`text-[12px] font-medium inline-flex items-center gap-1 ${isSelected ? 'text-brand' : 'text-text-tertiary'}`}>
              {isSelected && <Check className="w-3 h-3" strokeWidth={3} aria-hidden />}
              {isSelected ? debates.myChoiceBadge : hasVoted ? ' ' : debates.voteHint}
            </span>
          </button>
        );
      })}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-surface-card border border-border-default flex items-center justify-center text-[12px] font-bold text-text-tertiary"
      >
        VS
      </span>
    </div>
  );
}

/** 데이터로 보면: 예전 색 그대로 (이번 값 파랑 · 비교 값 회색, 처음 한 번 늘어남) — 무채색은 투표 칸만 (대표님 2026-10-27 "흑백영화 같다") */
export function CompareBars({ compare }: { compare: [DebateCompareSide, DebateCompareSide] }) {
  const reduce = useReducedMotion();
  const { debates } = SITE_CONTENT.analysis;
  const max = Math.max(compare[0].value, compare[1].value, 1);
  return (
    <div className="space-y-2" data-testid="compare-bars">
      <div className="text-[12px] font-bold text-text-tertiary">{debates.compareTitle}</div>
      {compare.map((s, i) => (
        <div key={`${s.label}-${i}`} className="grid grid-cols-[minmax(0,40%)_1fr_auto] items-center gap-2">
          <span className="text-[12px] font-medium text-text-secondary truncate">{s.label}</span>
          <div className="h-2.5 rounded-full bg-border-default overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${i === 0 ? 'bg-brand' : 'bg-text-tertiary'}`}
              initial={{ width: reduce ? `${(s.value / max) * 100}%` : '0%' }}
              animate={{ width: `${(s.value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.15 }}
            />
          </div>
          <span className={`text-[13px] font-extrabold tabular-nums whitespace-nowrap ${i === 0 ? 'text-brand' : 'text-text-secondary'}`}>{s.display}</span>
        </div>
      ))}
    </div>
  );
}
