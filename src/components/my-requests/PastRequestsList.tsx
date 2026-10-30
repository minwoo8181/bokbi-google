'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { PastRequest } from '@/lib/requests/types';

/** 지난 의뢰 (단지 · 결과 · 날짜) */
export default function PastRequestsList({ items }: { items: PastRequest[] }) {
  const t = SITE_CONTENT.myRequests.ended;
  if (items.length === 0) return null;
  return (
    <section className="p-5 rounded-2xl bg-surface-card" data-testid="past-requests">
      <h2 className="text-[17px] font-bold text-text-primary">{t.pastTitle}</h2>
      <ul className="mt-2 divide-y divide-border-light">
        {items.map((p) => (
          <li key={p.id} className="py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-text-primary truncate">{p.complexName}</p>
              <p className="text-[13px] font-medium text-text-tertiary">
                {p.pyeongLabel} · {p.endedAt.slice(0, 10).replace(/-/g, '.')}
              </p>
            </div>
            <span
              className={`flex-shrink-0 px-2 py-1 rounded-md text-[13px] font-bold ${
                p.result === 'CONTRACTED' ? 'bg-status-good-light text-[var(--status-good-strong)]' : 'bg-surface-subtle text-text-secondary'
              }`}
            >
              {t.pastResult[p.result]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
