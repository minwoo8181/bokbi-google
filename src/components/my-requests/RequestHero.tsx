'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { PROGRESS_STEPS, progressStep } from '@/lib/requests/stage';
import type { EndedReason, RequestStage } from '@/lib/requests/types';
import { fill } from './format';
import StepCircles from '@/components/common/StepCircles';
import StatusPill, { type PillTone } from '@/components/common/StatusPill';
import { shortDate } from '@/components/agent/DealTimeline';

/** 칩을 누르면 갈 곳: 광고 → 진행 중인 부동산, 방문 → 우리 집 방문 설정, 새 소식 → 새 소식이 있는 첫 카드 */
const JUMP = {
  ads: '#owner-brokers',
  visits: '[data-testid="showing-card"], [data-testid="showing-tenant"]',
  news: '[data-has-news="true"]',
} as const;

interface RequestHeroProps {
  stage: RequestStage;
  endedReason: EndedReason | null;
  offerCount: number;
  matchedCount: number;
  hoursLeft: number;
  liveAds: number;
  /** 다가오는 방문 (heroVisit): 개수 + 가장 가까운 날짜·시각, 24시간 안이면 soon */
  visit: { n: number; date: string; hour: number; soon: boolean } | null;
  /** 진행 중 카드들의 새 소식 합계 (현황판 칩) */
  newsCount: number;
  /** "나의 매칭 요청" 줄 한 줄 요약 (단지 · 평형 거래) */
  homeLine: string;
  /** 펼치면 카드 아래에 보이는 나의 매칭 요청 (RequestSummaryDetail) */
  detail: React.ReactNode;
  /** 요청 받는 중엔 펼친 채 시작 */
  defaultOpen: boolean;
  paused: boolean;
  reviewed: boolean;
}

/** 상태마다 바뀌는 위쪽 큰 제목 + 한 줄 진행 막대 (토스식 흰 배경) */
export default function RequestHero(p: RequestHeroProps) {
  const t = SITE_CONTENT.myRequests.hero;
  const [open, setOpen] = useState(p.defaultOpen);
  let title = '';
  let sub: React.ReactNode = null;

  if (p.stage === 'RECEIVING') {
    title = p.offerCount > 0 ? fill(t.receivingWithOffers, { count: p.offerCount }) : t.receivingWaiting;
    sub = (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Clock className="w-4 h-4" aria-hidden />
        {fill(t.hoursLeft, { hours: p.hoursLeft })}
      </span>
    );
  } else if (p.stage === 'IN_PROGRESS') {
    if (p.paused) {
      title = t.paused;
      sub = t.pausedSub;
    } else {
      title = fill(t.inProgress, { count: p.matchedCount });
      // 현황판 칩 (2026-10-27): 0이 아닌 것만, 진행 중 카드와 같은 점 알약. 색은 상태대로(방문은 24시간 안만 노랑),
      // 누르면 그 섹션으로 스크롤. 광고가 아직 없으면 안내 한 줄
      const chips: { key: string; text: string; tone: PillTone; target: string }[] = [];
      if (p.liveAds > 0) chips.push({ key: 'ads', text: fill(t.chips.ads, { n: p.liveAds }), tone: 'GOOD', target: JUMP.ads });
      if (p.visit)
        chips.push({
          key: 'visits',
          text: fill(t.chips.visits, { n: p.visit.n, date: shortDate(p.visit.date), hour: p.visit.hour }),
          tone: p.visit.soon ? 'CAUTION' : 'WAIT',
          target: JUMP.visits,
        });
      if (p.newsCount > 0) chips.push({ key: 'news', text: fill(t.chips.news, { n: p.newsCount }), tone: 'ACTION', target: JUMP.news });
      sub =
        chips.length > 0 ? (
          <span className="flex flex-wrap gap-2" data-testid="hero-chips">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => document.querySelector(c.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                data-testid={`hero-chip-${c.key}`}
                className="active:scale-96 transition-transform duration-fast ease-out-soft"
              >
                <StatusPill tone={c.tone}>
                  {c.text}
                  <ChevronRight className="w-3.5 h-3.5 -mr-1" aria-hidden />
                </StatusPill>
              </button>
            ))}
          </span>
        ) : (
          t.inProgressNoAd
        );
    }
  } else if (p.stage === 'CONTRACTED') {
    title = t.contracted;
  } else {
    const reason = p.endedReason ?? 'EXPIRED';
    title = t.ended[reason];
    sub =
      reason === 'EXPIRED'
        ? p.offerCount > 0
          ? t.endedSub.EXPIRED_WITH_OFFER
          : t.endedSub.EXPIRED_NO_OFFER
        : t.endedSub[reason];
  }

  const step = progressStep(p.stage, p.reviewed);

  return (
    // 현황판 = 흰 카드 하나, 모든 단계 같은 틀 (2026-10-27 대표님 A안):
    // 한 줄 제목 → 상태(칩·남은 시간) → 진행 동그라미 → 구분선 아래 "나의 매칭 요청" 줄(오른쪽 펼치기)
    <section className="mt-1 rounded-2xl bg-surface-card overflow-hidden" data-testid="request-hero">
      <div className="p-5">
        <h2 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug break-keep">{title.replace(/\n/g, ' ')}</h2>
        {sub && <div className="mt-2 text-[15px] font-medium text-text-secondary break-keep">{sub}</div>}
      {/* 막대 5칸 → 요청 창과 같은 이름 동그라미 (2026-10-27 대표님) */}
      {step > 0 && (
        <div className="mt-4" data-testid="request-progress">
          <StepCircles
            labels={t.progressLabels}
            current={step}
            ariaLabel={fill(t.progress, { step, total: PROGRESS_STEPS, label: t.progressLabels[step - 1] })}
          />
          {/* 진행 중 카드는 할 일·새 소식 순으로 정렬된다 (useOwnerRequest listRank) */}
          {p.stage === 'IN_PROGRESS' && (
            <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-text-secondary" data-testid="request-order-hint">
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary flex-shrink-0" aria-hidden />
              {t.orderHint}
            </p>
          )}
        </div>
      )}
      </div>
      {/* 나의 매칭 요청: 카드 아래 한 줄, 오른쪽 펼치기 (따로 있던 카드를 합침) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-5 py-4 border-t border-border-light flex items-center justify-between gap-3 text-left active:bg-surface-subtle"
        data-testid="hero-home"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-bold text-text-tertiary">{SITE_CONTENT.myRequests.summary.title}</span>
          <span className="block text-[15px] font-bold text-text-primary truncate">{p.homeLine}</span>
        </span>
        <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-bold text-text-secondary">
          {open ? SITE_CONTENT.myRequests.summary.collapse : SITE_CONTENT.myRequests.summary.expand}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && <div className="px-5 pb-5">{p.detail}</div>}
    </section>
  );
}
