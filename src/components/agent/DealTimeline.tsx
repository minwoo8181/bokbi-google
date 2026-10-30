'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { TimelineItem, Viewer } from '@/lib/deal/deal';
import { kstNow } from '@/lib/requests/showing';
import { staggerDelay } from '@/lib/motion';
import { fill, formatDateKo } from '@/components/my-requests/format';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';

const t = SITE_CONTENT.brokerDeal;

/** 'YYYY-MM-DD' → '11/2' */
export const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
/** 기록 시각(ISO) → 한국 날짜 '11/2' */
const atLabel = (at: string) => shortDate(kstNow(new Date(at)).date);

/** 기록 한 줄 문구 (목록 카드의 "새 소식" 줄에서도 씀) */
export function label(item: TimelineItem, today: string, viewer: Viewer): React.ReactNode {
  // 집주인 화면은 같은 사실을 집주인 쪽 말로 (timelineOwner)
  const o = viewer === 'OWNER' ? t.timelineOwner : null;
  switch (item.kind) {
    case 'MATCHED':
      return t.timeline.MATCHED;
    case 'OWNER_CHECKED':
      return (o ?? t.timeline).OWNER_CHECKED[item.how];
    case 'AD_POSTED':
      return (
        <>
          {(o ?? t.timeline).AD_POSTED} ·{' '}
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand">
            {t.timeline.adLink}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        </>
      );
    case 'VISIT': {
      const base = fill(t.timeline.VISIT, { date: shortDate(item.date), hour: item.hour });
      if (item.canceled) return <span className="line-through text-text-tertiary">{`${base} · ${t.timeline.visitCanceled}`}</span>;
      return item.date < today ? `${base} · ${t.timeline.visitDone}` : base;
    }
    case 'REPORTED':
      return (o ?? t.timeline).REPORTED[item.step];
    case 'ANSWERED':
      return item.ok ? (o ?? t.timeline).ANSWERED_YES[item.step] : <span className="text-[var(--status-risk-strong)]">{(o ?? t.timeline).ANSWERED_NO}</span>;
    case 'DATE': {
      const field = t.fields[item.field];
      if (!item.to) return fill(t.timeline.DATE_CLEARED, { field });
      if (!item.from) return fill(t.timeline.DATE_SET, { field, to: formatDateKo(item.to) });
      return fill(t.timeline.DATE_CHANGED, { field, from: shortDate(item.from), to: formatDateKo(item.to) });
    }
    case 'AD_REMOVED':
      return (o ?? t.timeline).AD_REMOVED;
    case 'OWNER_DECLARED':
      return (o ?? t.timeline).OWNER_DECLARED[item.step];
    case 'FEE_ANSWER':
      return item.kept ? (
        (o ?? t.timeline).FEE_ANSWER.true
      ) : (
        <span className="text-[var(--status-risk-strong)]">
          {(o ?? t.timeline).FEE_ANSWER.false}
          {item.reason && ` · ${t.timeline.feeReason[item.reason]}`}
        </span>
      );
    case 'REVIEW':
      return (o ?? t.timeline).REVIEW;
    case 'CLOSED_ELSEWHERE':
      return (o ?? t.timeline).CLOSED_ELSEWHERE;
    case 'OWNER_WITHDRAWN':
      return (o ?? t.timeline).OWNER_WITHDRAWN;
    case 'OWNER_PAUSED':
      return (o ?? t.timeline).OWNER_PAUSED;
    case 'OWNER_RESUMED':
      return (o ?? t.timeline).OWNER_RESUMED;
    case 'OWNER_CHECK_ASKED':
      return t.timeline.OWNER_CHECK_ASKED;
    case 'OWNER_CHECK_OK':
      return t.timeline.OWNER_CHECK_OK;
    case 'FAKE_CONFIRMED':
      return <span className="text-[var(--status-risk-strong)]">{t.timeline.FAKE_CONFIRMED}</span>;
    case 'PRICE_CHANGED':
      return fill((o ?? t.timeline).PRICE_CHANGED, { price: formatPriceTenThousand(item.priceManwon), fee: formatWon(item.feeWon) });
  }
}

/** 거래 기록: 오래된 것부터. 처음 열 때 줄마다 0.05초 간격으로 올라옴, 집주인 확인 줄은 체크가 그려짐 */
/** bare: 제목을 카드 밖 섹션 제목으로 따로 둔 화면 (거래 페이지, 2026-10-27) */
export default function DealTimeline({ items, now, viewer = 'BROKER', bare = false }: { items: TimelineItem[]; now: number; viewer?: Viewer; bare?: boolean }) {
  const today = kstNow(new Date(now)).date;
  return (
    <section className={`${bare ? 'px-4 py-2' : 'mt-3 p-4'} rounded-2xl bg-surface-card`} data-testid="deal-timeline">
      {!bare && <h2 className="text-[15px] font-bold text-text-primary">{t.timelineTitle}</h2>}
      <ol className={`${bare ? '' : 'mt-1 '}divide-y divide-border-light`}>
        {items.map((item, i) => (
          <li
            key={`${item.kind}-${item.at}-${i}`}
            className="py-2 flex gap-3 animate-rise-in"
            style={{ animationDelay: staggerDelay(i) }}
            data-testid="deal-timeline-item"
          >
            <span className="w-10 shrink-0 text-[13px] font-medium text-text-tertiary tabular-nums">{atLabel(item.at)}</span>
            <span className="min-w-0 flex-1 text-[15px] font-medium text-text-primary break-keep">{label(item, today, viewer)}</span>
            {((item.kind === 'ANSWERED' && item.ok) || item.kind === 'OWNER_DECLARED') && (
              <svg width="20" height="20" viewBox="0 0 28 28" className="shrink-0" aria-hidden>
                <circle cx="14" cy="14" r="13" className="fill-status-good-light" />
                <path
                  d="M8 14.5l4 4 8-8"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="24"
                  className="stroke-status-good animate-check-draw"
                />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
