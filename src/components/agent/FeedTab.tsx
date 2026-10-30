'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatWon } from '@/lib/utils';
import { WEEKLY_CREDITS } from '@/lib/broker/credits';
import { feedFilterCounts, groupFeed, isUrgent, type FeedFilter, type FeedItem } from '@/lib/broker/feed';
import { fill, SECTION_COUNT } from '@/components/my-requests/format';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '@/components/analysis/segmentStyles';
import MoreCreditsButton from './MoreCreditsButton';

const t = SITE_CONTENT.brokerAgent;
const occupancyLabel = SITE_CONTENT.myRequests.feeSheet.occupancy;

interface FeedTabProps {
  feed: FeedItem[];
  sentIds: ReadonlySet<string>;
  balance: number;
  nextWeekLabel: string;
  filter: FeedFilter;
  onFilter: (f: FeedFilter) => void;
  onOpen: (requestId: string) => void;
  onMoreCredits: () => void;
  /** 맨 위 긴급 알림 "먼저 끝내야 할 일" (TodoFirstBanner) */
  todo?: React.ReactNode;
}

function SectionTitle({ title, n }: { title: string; n: number }) {
  return (
    <h2 className="pt-3 px-1 flex items-center gap-2 text-[17px] font-bold text-text-primary">
      {title}
      <span className={SECTION_COUNT}>{fill(t.feed.sectionCount, { n })}</span>
    </h2>
  );
}

/**
 * 새 의뢰 탭 (대표님 2026-10-27, 내 매물과 같은 틀): 긴급 알림(먼저 끝내야 할 일) → 회색 점 안내 → 요청 가능한 매물(공통 세그먼트 필터) → 요청 보낸 매물.
 * 색은 금액 파랑과 24시간 미만 남은 시간 빨강만
 */
export default function FeedTab({ feed, sentIds, balance, nextWeekLabel, filter, onFilter, onOpen, onMoreCredits, todo }: FeedTabProps) {
  const groups = groupFeed(feed, sentIds, filter);
  const counts = feedFilterCounts(feed);
  const notice = [t.feed.notice];
  return (
    <section className="space-y-2" data-testid="tab-feed">
      {todo}
      <ul className="pt-1 px-1 space-y-1" data-testid="feed-notice">
        {notice.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[13px] font-medium text-text-tertiary break-keep text-pretty">
            <span aria-hidden className="mt-[7px] w-1 h-1 rounded-full bg-text-tertiary shrink-0" />
            {line}
          </li>
        ))}
      </ul>
      {balance === 0 && (
        <div className="p-4 rounded-2xl bg-surface-card" data-testid="no-credit">
          <p className="text-[15px] font-bold text-text-primary">{t.feed.noCredit.title}</p>
          <p className="mt-1 text-[13px] font-medium text-text-secondary">{fill(t.feed.noCredit.body, { date: nextWeekLabel, n: WEEKLY_CREDITS })}</p>
          <MoreCreditsButton onClick={onMoreCredits} />
        </div>
      )}
      {feed.length === 0 ? (
        <div className="p-5 rounded-2xl bg-surface-card text-center">
          <p className="text-[15px] font-bold text-text-primary">{t.feed.empty}</p>
          <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.feed.emptySub}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2" data-testid="feed-group-open">
            <SectionTitle title={t.feed.sections.open} n={groups.open.length} />
            {/* 거래 종류 필터: 분석 화면 매매/전세와 같은 공통 세그먼트 (개수는 전체 피드 기준) */}
            <div className={`${SEGMENT_TRACK} grid-cols-3`} role="group" aria-label={t.feed.title}>
              {(['ALL', '매매', '전세'] as FeedFilter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onFilter(k)}
                  aria-pressed={filter === k}
                  data-testid={`feed-filter-${k}`}
                  className={`${SEGMENT_ITEM} ${segmentItemState(filter === k)} text-[13px] font-extrabold`}
                >
                  {fill(t.feed.filterCount, { label: t.feed.filters[k], n: counts[k] })}
                </button>
              ))}
            </div>
            {groups.open.length === 0 ? (
              <p className="p-5 rounded-2xl bg-surface-card text-center text-[13px] font-medium text-text-tertiary">{t.feed.filterEmpty}</p>
            ) : (
              <FeedList items={groups.open} sent={false} onOpen={onOpen} />
            )}
          </div>
          {groups.sent.length > 0 && (
            <div className="space-y-2" data-testid="feed-group-sent">
              <SectionTitle title={t.feed.sections.sent} n={groups.sent.length} />
              <FeedList items={groups.sent} sent onOpen={onOpen} />
            </div>
          )}
          <p className="pt-1 px-1 text-[12px] font-medium text-text-tertiary break-keep inline-flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t.feed.sub}
          </p>
        </>
      )}
    </section>
  );
}

function FeedList({ items, sent, onOpen }: { items: FeedItem[]; sent: boolean; onOpen: (requestId: string) => void }) {
  return (
    <ul className="px-4 rounded-2xl bg-surface-card divide-y divide-border-light">
      {items.map((f) => (
        <li key={f.requestId}>
          <FeedRow item={f} sent={sent} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

/** 의뢰 한 줄: 단지·조건 / 받는 금액·남은 시간(24시간 미만 빨강). 요청 보낸 줄은 금액 회색 + "n시간 뒤 결과"(기다리는 것뿐이라 색 없음) */
function FeedRow({ item: f, sent, onOpen }: { item: FeedItem; sent: boolean; onOpen: (requestId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(f.requestId)}
      data-testid="feed-card"
      data-request-id={f.requestId}
      className="w-full min-h-16 py-3 flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-transform duration-fast ease-out-soft"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-text-primary break-keep">{f.complexName}</span>
        <span className="mt-1 block text-[12px] font-medium text-text-tertiary break-keep">
          {[f.tradeType, f.pyeongLabel, f.floorLabel, occupancyLabel[f.occupancy]].join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block text-[17px] font-extrabold tabular-nums tracking-tight ${sent ? 'text-text-secondary' : 'text-brand'}`}>{formatWon(f.commissionWon)}</span>
        <span className={`block text-[12px] font-bold tabular-nums ${!sent && isUrgent(f.hoursLeft) ? 'text-[var(--status-risk-strong)]' : 'text-text-tertiary'}`} data-testid="feed-hours">
          {fill(sent ? t.feed.resultIn : t.feed.hoursLeft, { h: f.hoursLeft })}
        </span>
      </span>
    </button>
  );
}
