'use client';

import React, { useEffect } from 'react';
import CloseButton from '@/components/common/CloseButton';
import { shortName } from '@/lib/market/debateTopics';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE_CONTENT } from '@/config/siteContent';
import type { DebateCompareSide } from '@/lib/market/debateTopics';
import { CompareBars, DebateTopicHead, VoteFoot, VoteVsButtons } from './DebateVisuals';

export interface DebateOption {
  id: string;
  label: string;
  votes: number;
}

export interface DebateTopic {
  id: string;
  badge: string;
  question: string;
  description: string;
  options: [DebateOption, DebateOption];
  /** 실데이터 비교 막대 (B안) */
  compare?: [DebateCompareSide, DebateCompareSide];
}

interface DebateBottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentName: string;
  debates: DebateTopic[];
  userVotes: Record<string, string>;
  onVote: (topicId: string, optionId: string) => void;
}

export default function DebateBottomSheetModal({
  isOpen,
  onClose,
  apartmentName,
  debates = [],
  userVotes = {},
  onVote,
}: DebateBottomSheetModalProps) {
  const { debates: debatesConfig } = SITE_CONTENT.analysis;

  // 모달 열림 시 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* 어두운 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* 슬라이드업 바텀시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg bg-surface-page rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* 드래그 핸들 및 헤더 */}
            <div className="px-5 pt-3 pb-3 border-b border-border-default bg-surface-card flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border-default mx-auto mb-3" />
              <div className="flex items-start justify-between gap-3">
                {/* 아이콘 없이 제목 + 부제, 괄호 설명((주거복합) 등)은 뺀다 (2026-10-27) */}
                <div className="min-w-0">
                  <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight break-keep">
                    {shortName(apartmentName)} {debatesConfig.modalHeaderTitleSuffix}
                  </h2>
                  <p className="text-[12px] font-medium text-text-tertiary mt-1">
                    {debatesConfig.modalHeaderSubTitle.replace('{count}', String(debates.length))}
                  </p>
                </div>
                {/* 닫기 X 통일 (2026-10-27): ActionSheet와 같은 CloseButton */}
                <CloseButton onClick={onClose} className="-m-2" />
              </div>
              <p className="mt-3 pt-3 border-t border-border-light flex items-start gap-2 text-[12px] font-medium text-text-secondary break-keep">
                <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-text-tertiary flex-shrink-0" aria-hidden />
                {debatesConfig.aiUpdateNotice}
              </p>
            </div>

            {/* 스크롤 가능한 본문 영역 (댓글 없는 순수 5대 끝장 투표) */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {debates.map((topic, index) => {
                const votedOptionId = userVotes[topic.id];
                const hasVoted = Boolean(votedOptionId);

                return (
                  <div
                    key={topic.id}
                    className="p-4 rounded-2xl bg-surface-card border border-border-default space-y-3"
                  >
                    {/* 분석 화면 카드와 같은 머리·막대·칸·안내 (2026-10-27 G안, 색 없음) */}
                    <DebateTopicHead
                      badge={`주제 ${index + 1} · ${topic.badge}`}
                      status={hasVoted ? debatesConfig.statusVoted : debatesConfig.statusOpen}
                      question={topic.question}
                      description={topic.description}
                    />

                    {topic.compare && <CompareBars compare={topic.compare} />}

                    {/* VS 대결형 선택 칸 (대표님 A안 2026-10-27) */}
                    <VoteVsButtons
                      options={topic.options}
                      votedOptionId={votedOptionId}
                      onVote={(optId) => onVote(topic.id, optId)}
                      testId={(idx) => `modal-topic-${index}-opt-${idx}`}
                    />
                    {/* 실제 집계 전까지 결과를 보여주지 않는다 (가짜 표수 금지) */}
                    <VoteFoot hasVoted={hasVoted} />
                  </div>
                );
              })}
              {/* 맨 아래 매칭 안내 상자는 삭제 (2026-10-27 대표님: 분석 화면에서 들어온 창이라 같은 말 반복, CTA는 분석 화면에서) */}
              {/* 아래 파란 "돌아가기" 버튼도 삭제 (2026-10-29 대표님: 닫기는 오른쪽 위 X + 바깥 누르기) */}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
