'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { FreshnessRow } from '@/lib/admin/dataFreshness';
import type { KeyStatus } from '@/lib/admin/keys';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.adminConsole.system;

/** 시스템: 키 있음/없음(값 없음) + 데이터 갱신 날짜(7일 넘으면 빨강, 매물 새 CSV는 "반영 전") */
export default function AdminSystemTab({ keys, freshness }: { keys: KeyStatus[]; freshness: FreshnessRow[] }) {
  return (
    <div className="space-y-4" data-testid="admin-system">
      <section className="p-4 rounded-2xl bg-surface-card">
        <h2 className="text-[15px] font-bold text-text-primary">{t.keysTitle}</h2>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{t.keysNote}</p>
        <ul className="mt-2 divide-y divide-border-light">
          {keys.map((k) => (
            <li key={k.id} className="min-h-[44px] py-2 flex items-center justify-between gap-3" data-testid={`admin-key-${k.id}`}>
              <span className="text-[15px] font-medium text-text-primary break-keep">{t.keys[k.id]}</span>
              <span className={`shrink-0 px-2 py-1 rounded-md text-[12px] font-bold ${k.set ? 'bg-status-good-light text-[var(--status-good-strong)]' : 'bg-status-risk-light text-[var(--status-risk-strong)]'}`}>
                {k.set ? t.set : t.missing}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-4 rounded-2xl bg-surface-card">
        <h2 className="text-[15px] font-bold text-text-primary">{t.dataTitle}</h2>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.dataNote}</p>
        <ul className="mt-2 divide-y divide-border-light">
          {freshness.map((r) => (
            <li key={r.id} className="min-h-[44px] py-2 flex items-center justify-between gap-3" data-testid={`admin-data-${r.id}`} data-stale={r.stale}>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium text-text-primary break-keep">{t.sources[r.id]}</span>
                {r.pending && <span className="block text-[12px] font-bold text-status-caution">{t.pending}</span>}
              </span>
              <span className={`shrink-0 text-right text-[13px] font-bold tabular-nums ${r.stale ? 'text-[var(--status-risk-strong)]' : 'text-text-secondary'}`}>
                {r.date ? (
                  <>
                    {r.date}
                    <span className="block text-[12px] font-medium">{r.days === 0 ? t.today : fill(t.daysAgo, { days: r.days ?? 0 })}</span>
                  </>
                ) : (
                  t.noFile
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="p-4 rounded-2xl bg-surface-card">
        <h2 className="text-[15px] font-bold text-text-primary">{t.laterTitle}</h2>
        <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep text-pretty">{t.later}</p>
      </section>
    </div>
  );
}
