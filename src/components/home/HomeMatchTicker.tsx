'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatWon } from '@/lib/utils';
import { fill } from '@/components/my-requests/format';
import type { MatchCaseFeed } from '@/components/analysis/types';

const t = SITE_CONTENT.home.matchTicker;

/**
 * 홈 검색 카드 맨 아래 작은 알약 (대표님 2026-10-29 캔버스: 카드 띠 → 알약 한 줄, "단지 평형 매매 · n 절약").
 * 사례는 2.8초마다 바뀐다. 움직임 줄이기 설정이거나 검색창에 입력 중이면 멈춘다(critique: 입력 중 시선 뺏김).
 * 실데이터 전까지 목업(source EXAMPLE)을 배지 없이 돌리고(대표님 결정), 실제 매칭이 쌓이면 getMatchCaseFeed 안만 바꿔 대체
 */
export default function HomeMatchTicker({ feed }: { feed: MatchCaseFeed }) {
  const items = feed.items;
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (items.length < 2 || reduce) return;
    const timer = setInterval(() => {
      if (document.activeElement instanceof HTMLInputElement) return;
      setI((p) => (p + 1) % items.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [items.length, reduce]);

  if (items.length === 0) return null;
  const item = items[i % items.length];

  return (
    <div className="relative h-7 overflow-hidden" data-testid="home-match-ticker" data-source={feed.source} aria-label={t.title}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={item.id}
          initial={reduce ? false : { y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: -12, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute left-0 top-0 inline-flex h-7 max-w-full items-center gap-2 rounded-full bg-brand-light px-3 text-[12px] font-bold text-brand-hover"
        >
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden />
          <span className="truncate">
            {fill(t.pill, { complex: item.complexName, pyeong: item.pyeongLabel, trade: item.tradeType, amount: formatWon(item.savedWon) })}
          </span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
