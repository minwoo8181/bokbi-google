'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { complexRanking, penetration, type ComplexRank } from '@/lib/admin/overview';
import { fill } from '@/components/my-requests/format';
import { SEGMENT_ITEM, SEGMENT_TRACK, segmentItemState } from '@/components/analysis/segmentStyles';
import type { MarketBase } from './adminTabs';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.metrics;
type Compare = keyof typeof t.compare;
const COMPARES = Object.keys(t.compare) as Compare[];
const CARD = 'p-5 rounded-3xl bg-surface-card min-w-0';
const nf = (n: number) => n.toLocaleString('ko-KR');
const pct1 = (r: number | null) => (r === null ? t.empty : `${Math.round(r * 1000) / 10}`);

/** 초록 "실제" 표시: 지금 데이터 그대로인 숫자 */
const Real = () => <span className="ml-1 px-2 py-1 rounded-md bg-status-good-light text-[12px] font-bold text-[var(--status-good-strong)] align-middle">{t.real}</span>;

function Bar({ rate }: { rate: number | null }) {
  return (
    <div className="mt-2 h-2 rounded-full bg-surface-page overflow-hidden" aria-hidden>
      <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, (rate ?? 0) * 100)}%` }} />
    </div>
  );
}

function Rank({ title, rows, value, later }: { title: string; rows: ComplexRank[]; value?: (r: ComplexRank) => [string, string]; later?: string }) {
  return (
    <section className={CARD}>
      <h3 className="text-[17px] font-bold text-text-primary">{title}</h3>
      {later ? (
        <p className="mt-2 text-[13px] font-medium text-text-tertiary">{later}</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[13px] font-medium text-text-tertiary">{t.rankEmpty}</p>
      ) : (
        <ol className="mt-2">
          {rows.map((r, i) => {
            const [main, sub] = value!(r);
            return (
              <li key={r.name} className="min-h-11 py-2 grid grid-cols-[20px_minmax(0,1fr)_auto_auto] gap-3 items-center border-t border-border-light first:border-t-0 text-[15px]">
                <span className="text-[12px] font-bold text-text-tertiary">{i + 1}</span>
                <span className="font-medium text-text-primary truncate">{r.name}</span>
                <span className="font-bold text-text-primary tabular-nums">{main}</span>
                <span className="text-[13px] font-medium text-text-tertiary tabular-nums">{sub}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * 지표 (PC 대시보드 v2, 대표님 2026-10-29): 비교 기준 → 한눈에 → 다산동에 얼마나 퍼졌나 → 어느 단지 → 기록이 쌓이면 보이는 지표 → 개선 제안.
 * 지금 셀 수 있는 것(다산동 사무소·단지·데이터 수, 저장소 의뢰)만 숫자로, 나머지는 "—" (가짜 숫자 금지). 계산은 lib/admin/overview·lib/analytics/metrics
 */
export default function AdminMetricsTab({ data, base }: { data: AdminData; base: MarketBase }) {
  const [compare, setCompare] = useState<Compare>('WEEK');
  const joined = data.approvedOffices;
  const p = penetration({ joinedOffices: joined, totalOffices: base.totalOffices, requests: data.requests, totalComplexes: base.totalComplexes });
  const byRequests = complexRanking(data.requests, 'requests');
  const byMatched = complexRanking(data.requests, 'matched');

  return (
    <div className="space-y-4" data-testid="admin-metrics">
      <div className="space-y-2 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
        <p className="text-[13px] font-medium text-text-secondary break-keep text-pretty">
          <Real /> {t.realNote}
        </p>
        <div className={`${SEGMENT_TRACK} grid-cols-3 lg:w-[360px] lg:shrink-0`} role="tablist">
          {COMPARES.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={compare === c} onClick={() => setCompare(c)} className={`${SEGMENT_ITEM} text-[13px] font-bold ${segmentItemState(compare === c)}`}>
              {t.compare[c]}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-[20px] font-bold text-text-primary">{t.glanceTitle}</h2>
        <ul className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {t.glance.map((label) => (
            <li key={label} className="p-4 rounded-2xl bg-surface-card min-w-0">
              <span className="block text-[12px] font-medium text-text-secondary break-keep">{label}</span>
              <span className="block text-[20px] font-bold text-text-tertiary">{t.empty}</span>
              <span className="block text-[12px] font-medium text-text-tertiary">{t.compare[compare]} {t.empty}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.compareNote}</p>
      </section>

      <section className="space-y-2" data-testid="admin-reach">
        <h2 className="text-[20px] font-bold text-text-primary">{t.reachTitle}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div className={CARD}>
            <span className="block text-[13px] font-medium text-text-secondary">{t.joined}</span>
            <span className="block text-[26px] font-bold text-text-primary tabular-nums">
              {fill(t.joinedValue, { n: p.joinedOffices, total: nf(p.totalOffices) })}
              <Real />
            </span>
            <Bar rate={p.officeRate} />
            <span className="block mt-1 text-[12px] font-medium text-text-tertiary">{fill(t.ofTotal, { pct: pct1(p.officeRate) })}</span>
          </div>
          <div className={CARD}>
            <span className="block text-[13px] font-medium text-text-secondary">{t.complexes}</span>
            <span className="block text-[26px] font-bold text-text-primary tabular-nums">
              {fill(t.complexesValue, { n: p.complexesWithRequests, total: p.totalComplexes })}
              <Real />
            </span>
            <Bar rate={p.complexRate} />
            <span className="block mt-1 text-[12px] font-medium text-text-tertiary">{fill(t.ofTotal, { pct: pct1(p.complexRate) })}</span>
          </div>
        </div>
        <div className="px-5 py-4 rounded-3xl bg-surface-card flex flex-wrap gap-x-6 gap-y-2 items-center text-[13px] font-medium text-text-secondary">
          <span className="font-bold text-text-primary">
            {t.dataTitle}
            <Real />
          </span>
          <span>{fill(t.data.trades, { n: nf(base.trades) })}</span>
          <span>{fill(t.data.sale, { n: nf(base.saleListings) })}</span>
          <span>{fill(t.data.jeonse, { n: nf(base.jeonseListings) })}</span>
          <span>{fill(t.data.complexes, { n: base.totalComplexes })}</span>
          <span>{fill(t.data.observed, { date: base.observedAt })}</span>
        </div>
      </section>

      <section className="space-y-2" data-testid="admin-where">
        <h2 className="text-[20px] font-bold text-text-primary">{t.whereTitle}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          <Rank title={t.rankSearched} rows={[]} later={t.rankSearchedLater} />
          <Rank title={t.rankRequests} rows={byRequests} value={(r) => [fill(t.rankRequestsUnit, { n: r.requests }), fill(t.rankMatchRate, { pct: Math.round(r.matchRate * 100) })]} />
          <Rank title={t.rankMatched} rows={byMatched} value={(r) => [fill(t.rankRequestsUnit, { n: r.matched }), fill(t.rankMatchRate, { pct: Math.round(r.matchRate * 100) })]} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[20px] font-bold text-text-primary">{t.laterTitle}</h2>
        <p className="text-[13px] font-medium text-text-secondary break-keep text-pretty">{t.notice}</p>
        <ul className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {t.items.map((m) => (
            <li key={m.key} className="p-4 rounded-2xl bg-surface-card min-w-0" data-testid="admin-metric">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-bold text-text-primary break-keep">{m.label}</h3>
                <span className="shrink-0 text-[20px] font-bold text-text-tertiary tabular-nums">{t.empty}</span>
              </div>
              <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{m.rule}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={CARD}>
        <h2 className="text-[17px] font-bold text-text-primary">{t.suggestTitle}</h2>
        <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep text-pretty">{t.suggestEmpty}</p>
      </section>
    </div>
  );
}
