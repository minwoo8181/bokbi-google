'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import UrgentAlert from '@/components/common/UrgentAlert';
import type { FreshnessRow } from '@/lib/admin/dataFreshness';
import type { KeyStatus } from '@/lib/admin/keys';
import { nowOverview, serviceIssues, type ServiceIssue } from '@/lib/admin/overview';
import { deadlineLeft, type TodayItem } from '@/lib/admin/today';
import { fill } from '@/components/my-requests/format';
import { kstLabel } from './AdminReportsTab';
import type { MarketBase } from './adminTabs';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.today;
const sys = SITE_CONTENT.adminConsole.system;
const CARD = 'rounded-3xl bg-surface-card';
/** 눌러서 처리하러 가는 일 (나머지는 보기만) */
const TAPPABLE = new Set<TodayItem['kind']>(['SIGNUP', 'FAKE_REPORT', 'FEE_OVERCHARGED', 'INQUIRY']);
/** 곧 할 일 / 지켜볼 것 */
const SOON = new Set<TodayItem['kind']>(['SIGNUP', 'FAKE_REPORT', 'FEE_OVERCHARGED', 'INQUIRY', 'WITHDRAW']);

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-h-[88px] p-3 rounded-xl bg-surface-page">
      <span className="block text-[12px] font-medium text-text-secondary break-keep">{label}</span>
      <span className="block text-[20px] font-bold text-text-primary tabular-nums">{value}</span>
      {sub && <span className="block text-[12px] font-medium text-text-tertiary break-keep">{sub}</span>}
    </div>
  );
}

function issueText(i: ServiceIssue): string {
  if (i.kind === 'KEY_MISSING') return fill(t.issue.KEY_MISSING, { name: sys.keys[i.id] });
  if (i.kind === 'DATA_PENDING') return fill(t.issue.DATA_PENDING, { name: sys.sources[i.id] });
  return i.days === null ? fill(t.issue.DATA_STALE_NONE, { name: sys.sources[i.id] }) : fill(t.issue.DATA_STALE, { name: sys.sources[i.id], days: i.days });
}

function Row({ item, onOpen }: { item: TodayItem; onOpen: (item: TodayItem) => void }) {
  const left = deadlineLeft(item);
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-text-secondary break-keep">{t.kinds[item.kind]}</span>
        <span className="block text-[15px] font-bold text-text-primary break-keep">{item.title}</span>
        <span className="block text-[12px] font-medium text-text-tertiary break-keep">{fill(t.hint[item.kind], { hours: item.hours })}</span>
      </span>
      {left && (
        <span className={`shrink-0 px-2 py-1 rounded-lg text-[12px] font-bold ${left.unit === 'HOURS' && left.n <= 12 ? 'bg-status-caution-light text-[var(--status-caution-strong)]' : 'bg-surface-page text-text-secondary'}`}>
          {fill(left.unit === 'DAYS' ? t.daysLeft : t.hoursLeft, { n: left.n })}
        </span>
      )}
      {TAPPABLE.has(item.kind) && <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-label={t.open} />}
    </>
  );
  return (
    <li className="border-t border-border-light first:border-t-0" data-testid="admin-today-item" data-kind={item.kind}>
      {TAPPABLE.has(item.kind) ? (
        <button type="button" onClick={() => onOpen(item)} className="w-full min-h-16 px-5 py-3 flex items-center gap-3 text-left active:bg-surface-subtle">
          {body}
        </button>
      ) : (
        <div className="min-h-16 px-5 py-3 flex items-center gap-3">{body}</div>
      )}
    </li>
  );
}

function ListCard({ title, items, onOpen, testId }: { title: string; items: TodayItem[]; onOpen: (item: TodayItem) => void; testId: string }) {
  if (items.length === 0) return null;
  return (
    <section className={`${CARD} pt-5 pb-2`} data-testid={testId}>
      <h2 className="px-5 pb-2 text-[17px] font-bold text-text-primary">
        {title} <span className="text-brand">{items.length}</span>
      </h2>
      <ul>
        {items.map((i) => (
          <Row key={i.key} item={i} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );
}

/**
 * 오늘 (대표님 2026-10-29 A안): 지금 현황 숫자 → 빨강 긴급 알림(기한 지난 일) → 곧 할 일 → 지켜볼 것 → 서비스 상태(문제만).
 * 넓은 화면은 왼쪽(현황·할 일) / 오른쪽(긴급·상태) 두 칸
 */
export default function AdminTodayTab({ data, keys, freshness, base, onOpen }: { data: AdminData; keys: KeyStatus[]; freshness: FreshnessRow[]; base: MarketBase; onOpen: (item: TodayItem) => void }) {
  const now = new Date(data.now);
  const o = nowOverview(data.requests, now);
  const urgent = data.items.filter((i) => i.overdue);
  const soon = data.items.filter((i) => !i.overdue && SOON.has(i.kind));
  const watch = data.items.filter((i) => !i.overdue && !SOON.has(i.kind));
  const issues = serviceIssues(keys, freshness);
  const approved = data.approvedOffices;

  return (
    <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4 lg:space-y-0 lg:items-start" data-testid="admin-today">
      <div className="space-y-3">
        <section className={`${CARD} p-5`} data-testid="admin-now">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-text-primary">{t.nowTitle}</h2>
            <span className="text-[12px] font-medium text-text-tertiary tabular-nums">{fill(t.asOf, { time: kstLabel(now.toISOString()) })}</span>
          </div>
          <div className="mt-3">
            <span className="block text-[13px] font-medium text-text-secondary">{t.visits}</span>
            <span className="block text-[26px] font-bold text-text-tertiary">{SITE_CONTENT.adminConsole.metrics.empty}</span>
            <span className="block text-[12px] font-medium text-text-tertiary">{t.visitsLater}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Tile label={t.waiting} value={String(o.waiting)} />
            <Tile label={t.inDeal} value={String(o.inDeal)} sub={fill(t.contracted, { n: o.contracted })} />
            <Tile label={t.brokers} value={String(approved)} sub={fill(t.brokersOf, { total: base.totalOffices })} />
          </div>
        </section>
        <div className="lg:hidden">
          <UrgentAlert
            title={t.urgentTitle}
            reason={t.urgentReason}
            goLabel={t.urgentGo}
            testId="admin-urgent"
            items={urgent.map((i) => ({ key: i.key, label: `${t.kinds[i.kind]} · ${i.title}`, sub: fill(t.hint[i.kind], { hours: i.hours }), onClick: () => onOpen(i) }))}
          />
        </div>
        <ListCard title={t.soonTitle} items={soon} onOpen={onOpen} testId="admin-soon" />
        <ListCard title={t.watchTitle} items={watch} onOpen={onOpen} testId="admin-watch" />
        {data.items.length === 0 && <p className="py-8 text-center text-[15px] font-medium text-text-secondary">{t.empty}</p>}
      </div>

      <div className="space-y-3">
        <div className="hidden lg:block">
          <UrgentAlert
            title={t.urgentTitle}
            reason={t.urgentReason}
            goLabel={t.urgentGo}
            testId="admin-urgent-wide"
            items={urgent.map((i) => ({ key: i.key, label: `${t.kinds[i.kind]} · ${i.title}`, sub: fill(t.hint[i.kind], { hours: i.hours }), onClick: () => onOpen(i) }))}
          />
        </div>
        <section className={`${CARD} p-5`} data-testid="admin-service">
          <h2 className="text-[17px] font-bold text-text-primary">{t.serviceTitle}</h2>
          {issues.length === 0 ? (
            <p className="mt-2 text-[15px] font-medium text-text-secondary">{t.serviceOk}</p>
          ) : (
            <ul className="mt-2">
              {issues.map((i) => (
                <li key={`${i.kind}:${i.id}`} className="min-h-11 py-2 flex items-center justify-between gap-3 border-t border-border-light first:border-t-0">
                  <span className="min-w-0 text-[15px] font-medium text-text-primary break-keep">{issueText(i)}</span>
                  <span className={`shrink-0 px-2 py-1 rounded-lg text-[12px] font-bold ${i.kind === 'KEY_MISSING' ? 'bg-status-risk-light text-[var(--status-risk-strong)]' : 'bg-status-caution-light text-[var(--status-caution-strong)]'}`}>
                    {t.issueTone[i.kind]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[12px] font-medium text-text-tertiary">{t.serviceNote}</p>
        </section>
      </div>
    </div>
  );
}
