'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardList, Inbox, Store } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { MoreCreditsTap } from '@/lib/broker/credits';
import { sendBlock, sentStatus, type FeedFilter } from '@/lib/broker/feed';
import { listingBucket } from '@/lib/broker/pastRequests';
import { ackCanceled, cancelVisit } from '@/lib/requests/showing';
import type { ReportStep } from '@/lib/deal/deal';
import { markCalendarSaved } from '@/lib/deal/savedCalendar';
import { monthPerformance, reviewChipCounts } from '@/lib/broker/monthPerformance';
import { topReviewChips } from '@/lib/requests/stage';
import { track } from '@/lib/analytics/store';
import InquiryEntry from '@/components/support/InquiryEntry';
import { useAgentWorkspace } from './useAgentWorkspace';
import { QaSwitcher, runQa } from './AgentQa';
import FeedTab from './FeedTab';
import TodoFirstBanner from './TodoFirstBanner';
import ListingsTab from './ListingsTab';
import OfficeTab, { OfficeHeader } from './OfficeTab';
import FeedRequestSheet from './FeedRequestSheet';
import DealPage from './DealPage';
import MoreCreditsSheet from './MoreCreditsSheet';
import StrengthsEditSheet from './StrengthsEditSheet';
import CreditSheet from './CreditSheet';

const t = SITE_CONTENT.brokerAgent;
type Tab = 'feed' | 'listings' | 'office';
const TABS: { key: Tab; icon: typeof Inbox }[] = [
  { key: 'feed', icon: Inbox },
  { key: 'listings', icon: ClipboardList },
  { key: 'office', icon: Store },
];

/**
 * 중개사 승인 후 화면 /agent (Phase 5 ③): 하단 탭 새 의뢰 / 내 매물 / 내 사무소.
 * 이 파일은 탭 전환·열린 시트·토스트만 가진다. 저장소 상태와 동작은 useAgentWorkspace, 탭 화면은 FeedTab·ListingsTab·OfficeTab
 */
export default function AgentWorkspace() {
  const w = useAgentWorkspace();
  const { app, ws, now, byId, feed, slots } = w;
  const [tab, setTab] = useState<Tab>('feed');
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreFrom, setMoreFrom] = useState<MoreCreditsTap['from'] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** 관리 화면을 연 매물 (선택된 매물) */
  const [listingId, setListingId] = useState<string | null>(null);
  const [editStrengths, setEditStrengths] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [creditSheet, setCreditSheet] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('ALL');

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // 행동 기록 (A7): 승인된 중개사가 새 의뢰 탭을 볼 때 (페이크 도어 클릭률의 분모)
  const approved = app?.status === 'APPROVED';
  useEffect(() => {
    if (w.loaded && approved && tab === 'feed') track('feed_view');
  }, [w.loaded, approved, tab]);

  if (!w.loaded) return null;

  const status = app?.status ?? 'NONE';
  const openItem = feed.find((f) => f.requestId === openId) ?? null;
  const openRequest = openId ? byId.get(openId) ?? null : null;
  const listingSent = listingId ? ws.sent.find((s) => s.requestId === listingId) ?? null : null;
  const listingRequest = listingId ? byId.get(listingId) ?? null : null;
  const openMoreCredits = (from: MoreCreditsTap['from']) => {
    w.recordMoreCredits(from);
    setMoreFrom(from);
  };
  const qa = (kind: Parameters<typeof runQa>[0]) => runQa(kind, w, { setTab, setToast });
  // 기한 지난 할 일 빨강 알림: 어느 탭에서든 맨 위 (대표님 2026-10-29 A안). 내 매물은 같은 일을 AgentUrgentAlert로 보여 줌
  const todoBanner = (
    <TodoFirstBanner
      items={w.blockingIds.map((id) => ({ requestId: id, complexName: byId.get(id)?.complexName ?? '', strip: w.strips.get(id)! }))}
      onGo={(id) => {
        const s = ws.sent.find((x) => x.requestId === id);
        if (s) w.markListingSeen(s);
        setTab('listings');
        setListingId(id);
      }}
    />
  );

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col">
        {status !== 'APPROVED' ? (
          <main className="flex-1 px-5 pt-16 text-center" data-testid="agent-gate">
            <h1 className="text-[20px] font-bold text-text-primary break-keep">{t.gate[status].title}</h1>
            <p className="mt-2 text-[15px] font-medium text-text-secondary whitespace-pre-line break-keep text-pretty">{t.gate[status].body}</p>
            <Link href="/agent/register" className="mt-6 inline-flex h-13 px-6 items-center rounded-xl bg-brand text-white text-[17px] font-bold">
              {t.gate[status].cta}
            </Link>
          </main>
        ) : (
          <>
            {tab === 'office' ? (
              <>
                {w.blockingIds.length > 0 && <div className="px-4 pt-4">{todoBanner}</div>}
                <OfficeHeader app={app!} slots={slots} kept={w.kept} reviews={w.reviews} onEditStrengths={() => setEditStrengths(true)} />
              </>
            ) : (
              /* 새 의뢰·내 매물: 제목 + 크레딧 칩 한 줄 (칩을 누르면 크레딧 시트, 대표님 2026-10-26) */
              <header className="sticky top-0 z-30 bg-surface-page px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">{t.tabs[tab]}</h1>
                {/* 필터 칩과 같은 흰 알약 + 숫자만 색 */}
                <button
                  type="button"
                  onClick={() => setCreditSheet(true)}
                  data-testid="agent-summary"
                  className="h-11 pl-4 pr-3 rounded-full bg-surface-card text-[15px] font-bold text-text-secondary inline-flex items-center gap-1 active:scale-96 transition-transform duration-fast ease-out-soft"
                >
                  {t.summary.credits}
                  <span className={`tabular-nums ${ws.wallet.balance === 0 ? 'text-[var(--status-risk-strong)]' : 'text-brand'}`}>{ws.wallet.balance}</span>
                  <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden />
                </button>
              </header>
            )}

            <main className="flex-1 px-4 pb-32 space-y-3">
              {tab === 'feed' && (
                <FeedTab
                  todo={todoBanner}
                  feed={feed}
                  sentIds={w.sentIds}
                  balance={ws.wallet.balance}
                  nextWeekLabel={w.nextWeekLabel}
                  filter={feedFilter}
                  onFilter={setFeedFilter}
                  onOpen={setOpenId}
                  onMoreCredits={() => openMoreCredits('FEED_EMPTY')}
                />
              )}
              {tab === 'listings' && (
                <ListingsTab
                  sent={w.sortedSent}
                  byId={byId}
                  strips={w.strips}
                  newsBy={w.newsBy}
                  now={now}
                  feeOf={w.feeOf}
                  onOpenDeal={(s) => {
                    w.markListingSeen(s);
                    setListingId(s.requestId);
                  }}
                  onOpen={setListingId}
                />
              )}
              {tab === 'office' && (
                <OfficeTab
                  ws={ws}
                  nextWeekLabel={w.nextWeekLabel}
                  historyOpen={historyOpen}
                  onToggleHistory={() => setHistoryOpen((v) => !v)}
                  onMoreCredits={() => openMoreCredits('OFFICE')}
                  past={ws.sent
                    .map((s) => ({ s, status: sentStatus(s, byId.get(s.requestId) ?? null, now) }))
                    .filter(({ s, status }) => listingBucket(status, w.strips.get(s.requestId)?.tone ?? null, s.sentAt, now) === 'PAST')
                    .sort((a, b) => b.s.sentAt.localeCompare(a.s.sentAt))}
                  perf={monthPerformance({ sent: ws.sent, byId, dealsFor: w.dealsFor, feeOf: w.feeOf, now: new Date(now) })}
                  endorsed={topReviewChips(reviewChipCounts(ws.sent, w.dealsFor))}
                />
              )}
              {/* 문의하기 (중개사 자주 묻는 질문 + 양식, 대표님 2026-10-29) */}
              {tab === 'office' && <InquiryEntry role="BROKER" context={() => ({ phone: app?.phone ?? '', request: null })} />}

              {/* 테스트 스위처 (배포 전 제거) */}
              <QaSwitcher onPick={qa} approved />
            </main>

            {/* 하단 탭바 */}
            <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface-card border-t border-border-default" aria-label={t.navLabel}>
              <div className="max-w-md mx-auto grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
                {TABS.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    aria-current={tab === key ? 'page' : undefined}
                    data-testid={`tab-${key}-button`}
                    className={`h-16 flex flex-col items-center justify-center gap-1 text-[12px] font-bold ${tab === key ? 'text-brand' : 'text-text-tertiary'}`}
                  >
                    <span className="relative">
                      <Icon className="w-6 h-6" aria-hidden />
                      {/* 내 매물: 지금 할 일 개수 */}
                      {key === 'listings' && w.badgeCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-status-risk text-white text-[12px] font-bold leading-[18px] text-center"
                          data-testid="todo-badge"
                        >
                          {w.badgeCount}
                        </span>
                      )}
                    </span>
                    {t.tabs[key]}
                  </button>
                ))}
              </div>
            </nav>
          </>
        )}

        {status !== 'APPROVED' && (
          <div className="px-4 pb-10">
            <QaSwitcher onPick={qa} approved={false} />
          </div>
        )}
      </div>

      {openItem && openRequest && app && (
        <FeedRequestSheet
          key={openItem.requestId}
          item={openItem}
          defaultStrengths={app.strengths}
          max={slots}
          block={sendBlock({ request: openRequest, sent: ws.sent, wallet: ws.wallet, now: new Date(now), blocking: w.blockingIds.length })}
          onSend={(strengths) => {
            void w.sendRequest(openRequest, strengths).then((sent) => {
              if (!sent) return;
              setOpenId(null);
              setToast(t.detail.sentToast);
            });
          }}
          onClose={() => setOpenId(null)}
        />
      )}

      {listingSent && listingRequest && (
        <DealPage
          key={listingSent.requestId}
          request={listingRequest}
          sent={listingSent}
          deals={w.dealsFor(listingSent.requestId)}
          now={now}
          calendarSavedAt={w.calendarSavedAt(listingSent)}
          onOwnerCheck={(how) => w.confirmOwnerFor(listingSent, how)}
          onPostAd={(url) => w.postAdFor(listingSent, url)}
          onReportFake={() => w.reportFakeFor(listingSent)}
          onDelay={(reason) => w.setDelayFor(listingSent, reason)}
          onReport={(step: ReportStep, priceManwon?: number) => void w.addDealEvent(listingSent, { kind: 'REPORT', step, ...(priceManwon ? { priceManwon } : {}) })}
          onSaveDates={(next) => void w.saveDatesFor(listingSent, next)}
          onAdRemoved={() => w.removeAdFor(listingSent)}
          onCalendarSaved={() => w.setSavedCal((m) => markCalendarSaved(m, listingSent.requestId, listingSent.offerId, new Date()))}
          today={w.today}
          onSaveVisit={(date, hour) => w.saveVisitFor(listingSent, date, hour)}
          onCancelVisit={(id) => void w.commitVisits(listingSent.requestId, (v) => cancelVisit(v, id, { offerId: listingSent.offerId }, new Date()))}
          onAckVisit={(id) => void w.commitVisits(listingSent.requestId, (v) => ackCanceled(v, id, { offerId: listingSent.offerId }))}
          onClose={() => setListingId(null)}
        />
      )}

      {creditSheet && (
        <CreditSheet
          balance={ws.wallet.balance}
          refillLabel={w.nextWeekLabel}
          onMoreCredits={() => {
            setCreditSheet(false);
            openMoreCredits('CREDIT_SHEET');
          }}
          onHistory={() => {
            setCreditSheet(false);
            setHistoryOpen(true);
            setTab('office');
          }}
          onClose={() => setCreditSheet(false)}
        />
      )}

      {editStrengths && app && (
        <StrengthsEditSheet
          strengths={app.strengths}
          conditions={app.conditions ?? []}
          max={slots}
          onSave={(next) => {
            const updated = { ...app, ...next };
            w.setApp(updated);
            w.saveApplication(updated);
            setEditStrengths(false);
            setToast(t.office.edit.saved);
          }}
          onClose={() => setEditStrengths(false)}
        />
      )}

      {moreFrom && (
        <MoreCreditsSheet
          onSubmit={(a) => w.answerMoreCredits(a)}
          onClose={() => setMoreFrom(null)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 px-4 pointer-events-none" role="status">
          <p className="max-w-md mx-auto px-4 py-3 rounded-xl bg-text-primary text-surface-card text-[13px] font-bold text-center break-keep">{toast}</p>
        </div>
      )}
    </div>
  );
}
