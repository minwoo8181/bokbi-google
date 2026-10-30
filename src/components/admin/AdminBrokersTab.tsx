'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { CALL_DEADLINE_HOURS, hoursSince } from '@/lib/broker/application';
import { fill } from '@/components/my-requests/format';
import AdminBrokerReview from './AdminBrokerReview';
import { kstLabel } from './AdminReportsTab';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.brokersTab;
const b = SITE_CONTENT.adminBrokers;

const STATUS_TONE = {
  PENDING: 'bg-status-caution-light text-[var(--status-caution-strong)]',
  APPROVED: 'bg-status-good-light text-[var(--status-good-strong)]',
  REJECTED: 'bg-surface-page text-text-secondary',
} as const;

/**
 * 중개사 탭 (2026-10-29 A안 + A2''): 가입한 중개사 수 / 다산동 사무소 → 가입 신청 목록(확인 대기 먼저) → 누르면 가입 확인(확인 전화·승인·반려).
 * 목록은 저장소 admin.applications (Supabase = 관리자 RLS로 모든 사무소, 브라우저 저장소 = 이 브라우저 신청 1건)
 */
export default function AdminBrokersTab({ data, totalOffices }: { data: AdminData; totalOffices: number }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? data.applications.find((a) => a.id === openId) ?? null : null;
  const joined = data.approvedOffices;
  const pct = totalOffices > 0 ? Math.round((joined / totalOffices) * 1000) / 10 : 0;
  const now = new Date(data.now);

  if (open)
    return (
      <section className="space-y-3 lg:max-w-2xl" data-testid="admin-broker-detail">
        <button type="button" onClick={() => setOpenId(null)} className="-ml-2 h-11 px-2 inline-flex items-center gap-1 text-[15px] font-bold text-text-secondary">
          <ChevronLeft className="w-5 h-5" aria-hidden />
          {b.back}
        </button>
        <AdminBrokerReview key={open.id} app={open} onChange={() => void data.reload()} />
      </section>
    );

  return (
    <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-4 lg:space-y-0 lg:items-start" data-testid="admin-brokers">
      <section className="p-5 rounded-3xl bg-surface-card">
        <h2 className="text-[13px] font-medium text-text-secondary">{t.joinedTitle}</h2>
        <p className="text-[26px] font-bold text-text-primary tabular-nums">{fill(t.joinedValue, { n: joined, total: totalOffices })}</p>
        <div className="mt-2 h-2 rounded-full bg-surface-page overflow-hidden" aria-hidden>
          <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary">{fill(t.joinedRate, { pct })}</p>
      </section>

      <section className="rounded-3xl bg-surface-card pt-5 pb-2" data-testid="admin-applications">
        <h2 className="px-5 pb-2 text-[17px] font-bold text-text-primary">
          {b.listTitle} <span className="text-brand">{data.applications.length}</span>
        </h2>
        {data.applications.length === 0 ? (
          <p className="px-5 py-6 text-[15px] font-medium text-text-secondary">{b.empty}</p>
        ) : (
          <ul>
            {data.applications.map((a) => {
              const hours = hoursSince(a.submittedAt, now);
              return (
                <li key={a.id} className="border-t border-border-light">
                  <button type="button" onClick={() => setOpenId(a.id)} data-testid="admin-application-row" className="w-full min-h-16 px-5 py-3 flex items-center gap-3 text-left active:bg-surface-subtle">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-text-primary break-keep">{a.office}</span>
                      <span className="block text-[12px] font-medium text-text-tertiary tabular-nums">
                        {a.regNo} · {fill(b.submitted, { date: kstLabel(a.submittedAt) })}
                        {a.status === 'PENDING' && ` · ${hours >= CALL_DEADLINE_HOURS ? b.overdue : fill(b.dueSoon, { hours: CALL_DEADLINE_HOURS - hours })}`}
                      </span>
                    </span>
                    <span className={`shrink-0 px-2 py-1 rounded-lg text-[12px] font-bold ${STATUS_TONE[a.status]}`}>{b.status[a.status]}</span>
                    <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-5 pt-2 pb-3 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.listLater}</p>
      </section>
    </div>
  );
}
