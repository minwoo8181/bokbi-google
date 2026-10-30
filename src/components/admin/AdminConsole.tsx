'use client';

import React, { useEffect, useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { markNoTrack } from '@/lib/analytics/remote';
import type { FreshnessRow } from '@/lib/admin/dataFreshness';
import type { KeyStatus } from '@/lib/admin/keys';
import { isOpenReport } from '@/lib/admin/reports';
import { todayCounts } from '@/lib/admin/today';
import AdminTodayTab from './AdminTodayTab';
import AdminBrokersTab from './AdminBrokersTab';
import AdminRequestsTab, { type RequestsSegment } from './AdminRequestsTab';
import AdminMetricsTab from './AdminMetricsTab';
import AdminSystemTab from './AdminSystemTab';
import AdminAccessLog from './AdminAccessLog';
import AdminPushCard from './AdminPushCard';
import { useAdminData } from './useAdminData';
import { ADMIN_TABS, type AdminTab, type MarketBase } from './adminTabs';

const t = SITE_CONTENT.adminConsole;

/**
 * 관리자 콘솔 /admin (대표님 2026-10-29 A안): 오늘 / 중개사 / 의뢰 / 지표 / 시스템.
 * 휴대폰은 위 탭, 넓은 화면(lg)은 왼쪽 메뉴 + 넓은 본문(대시보드). 같은 부품을 쓴다.
 * 키·데이터 날짜·다산동 기준 숫자는 서버가 계산해 넘기고, 나머지는 이 브라우저 저장소(useAdminData)
 */
export default function AdminConsole({ initialTab, keys, freshness, base }: { initialTab: AdminTab; keys: KeyStatus[]; freshness: FreshnessRow[]; base: MarketBase }) {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [segment, setSegment] = useState<RequestsSegment>('reports');
  const [openReport, setOpenReport] = useState<string | null>(null);
  const d = useAdminData();
  // 관문을 통과한 브라우저는 행동 기록을 서버로 보내지 않음 (홈 "복비 계산 n회"가 부풀지 않게, 대표님 2026-10-29)
  useEffect(() => markNoTrack(), []);
  const openReports = d.reports.filter(isOpenReport).length;
  // 빨간 숫자는 급한 것만: 오늘 = 기한 지난 일, 중개사 = 확인 대기, 의뢰 = 처리 전 신고
  const badge: Partial<Record<AdminTab, number>> = { today: todayCounts(d.items).overdue, brokers: d.pendingOffices, requests: openReports };

  const go = (next: AdminTab) => {
    void d.reload();
    setTab(next);
  };

  const tabButton = (k: AdminTab, wide: boolean) => (
    <button
      key={k}
      type="button"
      onClick={() => go(k)}
      aria-current={tab === k ? 'page' : undefined}
      data-testid={`admin-tab-${k}${wide ? '-wide' : ''}`}
      className={
        wide
          ? `h-11 px-3 rounded-xl text-[15px] font-bold inline-flex items-center justify-between gap-2 text-left ${tab === k ? 'bg-brand-subtle text-brand-hover' : 'text-text-secondary hover:bg-surface-subtle'}`
          : `flex-1 min-w-0 h-11 px-1 text-[15px] font-bold border-b-2 inline-flex items-center justify-center gap-1 break-keep ${tab === k ? 'border-brand text-text-primary' : 'border-transparent text-text-tertiary'}`
      }
    >
      {t.tabs[k]}
      {!!badge[k] && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-status-risk text-white text-[12px] leading-[18px] text-center tabular-nums">{badge[k]}</span>}
    </button>
  );

  return (
    <div className="admin-wide min-h-[100dvh] bg-surface-page lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* 넓은 화면: 왼쪽 메뉴 */}
      <aside className="hidden lg:flex flex-col gap-1 px-3 py-6 bg-surface-card border-r border-border-default sticky top-0 h-[100dvh]">
        <h1 className="px-3 mb-4 text-[17px] font-bold text-text-primary">{t.title}</h1>
        <nav className="flex flex-col gap-1" aria-label={t.title}>
          {ADMIN_TABS.map((k) => tabButton(k, true))}
        </nav>
      </aside>

      <div className="min-w-0 pb-12">
        {/* 휴대폰: 위 탭 */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-page border-b border-border-default">
          <div className="max-w-md mx-auto px-4 h-12 flex items-center">
            <h1 className="text-[17px] font-bold text-text-primary">{t.title}</h1>
          </div>
          <nav className="max-w-md mx-auto px-2 flex" aria-label={t.title}>
            {ADMIN_TABS.map((k) => tabButton(k, false))}
          </nav>
        </header>

        <main className="max-w-md lg:max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8 space-y-4">
          <p className="text-[12px] font-medium text-text-tertiary break-keep">{t.mockNotice}</p>
          {d.loaded && tab === 'today' && (
            <AdminTodayTab
              data={d}
              keys={keys}
              freshness={freshness}
              base={base}
              onOpen={(item) => {
                if (item.kind === 'SIGNUP') return go('brokers');
                if (item.kind === 'FAKE_REPORT' || item.kind === 'FEE_OVERCHARGED') {
                  setSegment('reports');
                  setOpenReport(item.key);
                  return go('requests');
                }
                if (item.kind === 'INQUIRY') {
                  setSegment('inquiries');
                  return go('requests');
                }
                // 광고 내림 늦음·요청 0곳: 그 의뢰를 찾아보게 모든 의뢰로 (탈퇴 요청 처리는 서버 연결 뒤)
                if (item.kind === 'REMOVE_AD_LATE' || item.kind === 'NO_OFFERS') {
                  setSegment('all');
                  return go('requests');
                }
              }}
            />
          )}
          {d.loaded && tab === 'brokers' && <AdminBrokersTab data={d} totalOffices={base.totalOffices} />}
          {d.loaded && tab === 'requests' && <AdminRequestsTab data={d} segment={segment} onSegment={setSegment} openReport={openReport} onOpenReport={setOpenReport} />}
          {d.loaded && tab === 'metrics' && <AdminMetricsTab data={d} base={base} />}
          {tab === 'system' && (
            <>
              <AdminPushCard />
              <AdminSystemTab keys={keys} freshness={freshness} />
              {d.loaded && <AdminAccessLog data={d} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
