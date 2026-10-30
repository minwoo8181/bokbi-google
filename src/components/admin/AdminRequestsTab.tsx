'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { timeline } from '@/lib/deal/deal';
import { effectiveStage } from '@/lib/requests/stage';
import type { OwnerRequest } from '@/lib/requests/types';
import { isOpenReport } from '@/lib/admin/reports';
import { matchesQuery } from '@/lib/admin/overview';
import { fill } from '@/components/my-requests/format';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '@/components/analysis/segmentStyles';
import DealTimeline from '@/components/agent/DealTimeline';
import AdminReportsTab, { kstLabel } from './AdminReportsTab';
import AdminInquiries from './AdminInquiries';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.requestsTab;
export type RequestsSegment = 'reports' | 'inquiries' | 'all';
const SEGMENTS: RequestsSegment[] = ['reports', 'inquiries', 'all'];

function Detail({ request, data, onBack }: { request: OwnerRequest; data: AdminData; onBack: () => void }) {
  const offerId = request.matchedOfferIds[0] ?? null;
  const items = offerId ? timeline({ request, deals: data.deals[request.id] ?? {}, offerId }) : [];
  return (
    <section className="space-y-3" data-testid="admin-request-detail">
      <button type="button" onClick={onBack} className="-ml-2 h-11 px-2 inline-flex items-center gap-1 text-[15px] font-bold text-text-secondary">
        <ChevronLeft className="w-5 h-5" aria-hidden />
        {t.back}
      </button>
      <article className="p-5 rounded-3xl bg-surface-card">
        <h2 className="text-[17px] font-bold text-text-primary break-keep">
          {request.complexName} {request.pyeongLabel} {request.tradeType}
        </h2>
        <p className="mt-1 text-[13px] font-medium text-text-secondary tabular-nums">
          {request.id} · {t.registered} {kstLabel(request.createdAt)} · {fill(t.offers, { n: request.offers.length })}
        </p>
        <p className="mt-2 text-[12px] font-medium text-text-tertiary">{t.privacyNote}</p>
      </article>
      {items.length > 0 ? <DealTimeline items={items} now={data.now} /> : <p className="py-6 text-center text-[15px] font-medium text-text-secondary">{t.timelineEmpty}</p>}
    </section>
  );
}

function AllRequests({ data }: { data: AdminData }) {
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? data.requests.find((r) => r.id === openId) ?? null : null;
  if (open) return <Detail request={open} data={data} onBack={() => setOpenId(null)} />;
  const list = data.requests.filter((r) => matchesQuery(r, q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="p-5 rounded-3xl bg-surface-card space-y-3" data-testid="admin-all-requests">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-text-tertiary">{t.search}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="h-12 px-4 rounded-xl border border-border-default bg-surface-card text-[15px] text-text-primary placeholder:text-text-tertiary"
        />
      </label>
      {list.length === 0 ? (
        <p className="py-6 text-center text-[15px] font-medium text-text-secondary">{data.requests.length === 0 ? t.empty : t.noMatch}</p>
      ) : (
        <ul className="-mx-5">
          {list.map((r) => (
            <li key={r.id} className="border-t border-border-light">
              <button type="button" onClick={() => setOpenId(r.id)} data-testid="admin-request-row" className="w-full min-h-16 px-5 py-3 flex items-center gap-3 text-left active:bg-surface-subtle">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-text-primary break-keep">
                    {r.complexName} {r.pyeongLabel} {r.tradeType}
                  </span>
                  <span className="block text-[12px] font-medium text-text-tertiary tabular-nums truncate">
                    {r.id} · {kstLabel(r.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 px-2 py-1 rounded-lg bg-surface-page text-[12px] font-bold text-text-secondary">{t.stage[effectiveStage(r, data.now).stage]}</span>
                <span className="shrink-0 text-[12px] font-medium text-text-tertiary tabular-nums">{fill(t.offers, { n: r.offers.length })}</span>
                <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 의뢰 탭 (2026-10-29 A안, 예전 "신고" 탭): 신고 / 문의 / 모든 의뢰 */
export default function AdminRequestsTab({
  data,
  segment,
  onSegment,
  openReport,
  onOpenReport,
}: {
  data: AdminData;
  segment: RequestsSegment;
  onSegment: (s: RequestsSegment) => void;
  openReport: string | null;
  onOpenReport: (key: string | null) => void;
}) {
  const count: Record<RequestsSegment, number | null> = {
    reports: data.reports.filter(isOpenReport).length,
    inquiries: data.inquiries.filter((i) => !i.answer).length,
    all: data.requests.length,
  };
  return (
    <div className="space-y-3 lg:max-w-3xl" data-testid="admin-requests">
      <div className={`${SEGMENT_TRACK} grid-cols-3`} role="tablist">
        {SEGMENTS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={segment === s} onClick={() => onSegment(s)} data-testid={`admin-seg-${s}`} className={`${SEGMENT_ITEM} text-[13px] font-bold ${segmentItemState(segment === s)}`}>
            {t.segments[s]}
            {count[s] ? ` ${count[s]}` : ''}
          </button>
        ))}
      </div>
      {segment === 'reports' && <AdminReportsTab data={data} openKey={openReport} onOpenKey={onOpenReport} />}
      {segment === 'inquiries' && <AdminInquiries data={data} />}
      {segment === 'all' && <AllRequests data={data} />}
    </div>
  );
}
