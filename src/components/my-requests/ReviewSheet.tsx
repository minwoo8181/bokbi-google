'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { REVIEW_AVERAGE_MIN, topReviewChips } from '@/lib/requests/stage';
import type { BrokerOffer } from '@/lib/requests/types';
import ActionSheet from './ActionSheet';
import { fill } from './format';

/** 후기 요약: 글 없이 칩별 개수만 (익명 단계에서 누군지 드러나지 않게) */
export default function ReviewSheet({ offer, onClose }: { offer: BrokerOffer | null; onClose: () => void }) {
  const t = SITE_CONTENT.myRequests.reviewSheet;
  if (!offer) return null;
  const r = offer.review;
  const chips = topReviewChips(r.chipCounts);
  const max = chips[0]?.[1] ?? 1;
  return (
    <ActionSheet open testId="review-sheet" title={fill(t.title, { count: r.count })} cancelLabel={t.close} onCancel={onClose}>
      <p className="text-[15px] font-bold text-text-secondary">
        {r.count >= REVIEW_AVERAGE_MIN ? fill(t.average, { average: r.average.toFixed(1) }) : t.averageHidden}
      </p>
      <ul className="mt-4 space-y-3">
        {chips.map(([chip, n]) => (
          <li key={chip}>
            <div className="flex justify-between text-[15px] font-medium text-text-primary">
              <span>{chip}</span>
              <span className="font-bold tabular-nums">{n}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </ActionSheet>
  );
}
