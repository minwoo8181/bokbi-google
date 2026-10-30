'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { timeline } from '@/lib/deal/deal';
import { isOpenReport, type ReportRow, type ReportStatus } from '@/lib/admin/reports';
import type { AdminResult } from '@/lib/admin/adminLog';
import DealTimeline from '@/components/agent/DealTimeline';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.reports;
const RESULTS: AdminResult[] = ['CONFIRMED', 'REJECTED', 'CONTACTED'];

/** ISO → 한국 시간 '11/2 14:05' */
export function kstLabel(iso: string): string {
  const k = new Date(Date.parse(iso) + 9 * 3_600_000);
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
}

const chipTone: Record<ReportStatus, string> = {
  PENDING: 'bg-status-risk-light text-[var(--status-risk-strong)]',
  CONTACTED: 'bg-status-caution-light text-status-caution',
  CONFIRMED: 'bg-surface-subtle text-text-secondary',
  REJECTED: 'bg-surface-subtle text-text-secondary',
};
const Chip = ({ status }: { status: ReportStatus }) => <span className={`shrink-0 px-2 py-1 rounded-md text-[12px] font-bold ${chipTone[status]}`}>{t.status[status]}</span>;

function Row({ row, onOpen }: { row: ReportRow; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} data-testid="admin-report-row" className="w-full min-h-[64px] px-4 py-3 flex items-center gap-3 text-left active:bg-surface-subtle">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-text-secondary">{t.kinds[row.kind]}</span>
          <span className="block text-[15px] font-bold text-text-primary break-keep">{row.complexName}</span>
          <span className="block text-[12px] font-medium text-text-tertiary break-keep">
            {row.officeName} · {kstLabel(row.at)}
          </span>
        </span>
        <Chip status={row.status} />
        <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
      </button>
    </li>
  );
}

/** 신고 한 건: 내용 + 그 거래 기록(timeline) + 처리(확인 / 반려 / 중개사에게 연락함) + 처리 기록 */
function Detail({ row, data, onBack }: { row: ReportRow; data: AdminData; onBack: () => void }) {
  const request = data.requests.find((r) => r.id === row.requestId) ?? null;
  const items = request ? timeline({ request, deals: data.deals[row.requestId] ?? {}, offerId: row.offerId }) : [];
  const open = isOpenReport(row);
  const labels = t.actions[row.kind];
  const effects = t.effects[row.kind];
  return (
    <section data-testid="admin-report-detail" className="space-y-3">
      <button type="button" onClick={onBack} className="-ml-2 h-11 px-2 inline-flex items-center gap-1 text-[15px] font-bold text-text-secondary">
        <ChevronLeft className="w-5 h-5" aria-hidden />
        {t.close}
      </button>
      <article className="p-4 rounded-2xl bg-surface-card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[17px] font-bold text-text-primary break-keep">{t.kinds[row.kind]}</h2>
          <Chip status={row.status} />
        </div>
        <dl className="divide-y divide-border-light text-[15px]">
          {[
            [t.complex, row.complexName],
            [t.office, row.officeName],
            [t.reportedAt, kstLabel(row.at)],
          ].map(([k, v]) => (
            <div key={k} className="py-2 flex gap-3">
              <dt className="w-20 shrink-0 font-medium text-text-tertiary">{k}</dt>
              <dd className="min-w-0 font-bold text-text-primary break-keep">{v}</dd>
            </div>
          ))}
        </dl>
      </article>

      <DealTimeline items={items} now={data.now} />

      <section className="p-4 rounded-2xl bg-surface-card space-y-3" data-testid="admin-report-actions">
        <h3 className="text-[15px] font-bold text-text-primary">{t.actionsTitle}</h3>
        {open ? (
          RESULTS.map((res) => (
            <div key={res}>
              <button
                type="button"
                onClick={() => void data.handle(row, res)}
                data-testid={`admin-report-${res.toLowerCase()}`}
                className={`w-full h-12 rounded-xl text-[15px] font-bold ${res === 'CONFIRMED' ? 'bg-status-risk text-white' : res === 'REJECTED' ? 'bg-brand text-white' : 'bg-surface-subtle text-text-primary'}`}
              >
                {labels[res]}
              </button>
              {res !== 'CONTACTED' && <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{effects[res]}</p>}
            </div>
          ))
        ) : (
          <p className="text-[15px] font-medium text-text-secondary">{t.decided}</p>
        )}
        {row.history.length > 0 && (
          <div className="pt-2 border-t border-border-light">
            <h4 className="text-[13px] font-bold text-text-secondary">{t.historyTitle}</h4>
            <ul className="mt-1 space-y-1">
              {row.history.map((a) => (
                <li key={a.id} className="flex gap-3 text-[13px] font-medium text-text-primary">
                  <span className="w-20 shrink-0 text-text-tertiary tabular-nums">{kstLabel(a.at)}</span>
                  {labels[a.result]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </section>
  );
}

export default function AdminReportsTab({ data, openKey, onOpenKey }: { data: AdminData; openKey: string | null; onOpenKey: (key: string | null) => void }) {
  const row = openKey ? data.reports.find((r) => r.key === openKey) ?? null : null;
  if (row) return <Detail row={row} data={data} onBack={() => onOpenKey(null)} />;
  if (data.reports.length === 0) return <p className="py-12 text-center text-[15px] font-medium text-text-secondary">{t.empty}</p>;
  const pending = data.reports.filter(isOpenReport);
  const done = data.reports.filter((r) => !isOpenReport(r));
  return (
    <div className="space-y-4" data-testid="admin-reports">
      {[
        [t.pending, pending],
        [t.done, done],
      ].map(([title, rows]) =>
        (rows as ReportRow[]).length ? (
          <section key={title as string}>
            <h2 className="mb-2 text-[15px] font-bold text-text-secondary">{title as string}</h2>
            <ul className="rounded-2xl bg-surface-card divide-y divide-border-light overflow-hidden">
              {(rows as ReportRow[]).map((r) => (
                <Row key={r.key} row={r} onOpen={() => onOpenKey(r.key)} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
