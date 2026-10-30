'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Lock, Star } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatWon } from '@/lib/utils';
import type { BrokerApplication } from '@/lib/broker/application';
import { kstDateKey, WEEKLY_CREDITS } from '@/lib/broker/credits';
import type { SentRequest, SentStatus } from '@/lib/broker/feed';
import type { BrokerWorkspace } from '@/lib/broker/mockMarket';
import { BASE_STRENGTH_SLOTS, BONUS_SLOT_REVIEWS } from '@/lib/broker/strengthSlots';
import { PROMISE_TIER_MIN, promiseLevel, promiseTier } from '@/lib/requests/stage';
import { fill, formatDateKo, SECTION_COUNT } from '@/components/my-requests/format';
import StatusPill from '@/components/common/StatusPill';
import PromiseLevel from '@/components/common/PromiseLevel';
import type { MonthPerformance } from '@/lib/broker/monthPerformance';
import MoreCreditsButton from './MoreCreditsButton';

const t = SITE_CONTENT.brokerAgent;

/**
 * 내 사무소 머리 = 프로필 카드 하나 (대표님 2026-10-27 A안, 집주인 현황판과 같은 틀):
 * 사무소 이름 → 대표·전화·등록번호 → 잘하는 점 칩(후기 10개면 1칸 더)·가능 조건 → 구분선 아래 약속 레벨·후기
 */
export function OfficeHeader({
  app,
  slots,
  kept,
  reviews,
  onEditStrengths,
}: {
  app: BrokerApplication;
  slots: number;
  kept: number;
  reviews: { count: number; average: number | null };
  onEditStrengths: () => void;
}) {
  return (
    <header className="px-4 pt-5 pb-1" data-testid="office-header">
      <section className="rounded-2xl bg-surface-card overflow-hidden">
        <div className="p-5">
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight break-keep">{app.office}</h1>
          <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">
            {[app.ceo ? fill(t.office.ceo, { name: app.ceo }) : null, app.phone || null].filter(Boolean).join(' · ')}
          </p>
          <p className="text-[12px] font-medium text-text-tertiary">{fill(t.office.regNo, { regNo: app.regNo })}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="office-strengths">
            {app.strengths.map((c) => (
              <span key={c} className="h-8 px-3 rounded-full bg-surface-subtle text-[13px] font-bold text-text-secondary inline-flex items-center">
                {c}
              </span>
            ))}
            {app.strengths.length < slots && slots > BASE_STRENGTH_SLOTS && (
              <span className="h-8 px-3 rounded-full border border-dashed border-brand text-[12px] font-bold text-brand inline-flex items-center">{t.detail.slotEmpty}</span>
            )}
            {slots === BASE_STRENGTH_SLOTS && (
              <span className="h-8 px-3 rounded-full border border-dashed border-brand bg-brand-light text-[12px] font-bold text-brand-hover inline-flex items-center gap-1" data-testid="strength-locked">
                <Lock className="w-3.5 h-3.5" aria-hidden />
                {fill(t.office.strengthsLocked, { n: BONUS_SLOT_REVIEWS })}
              </span>
            )}
            <button type="button" onClick={onEditStrengths} data-testid="strengths-edit" className="h-11 px-3 text-[13px] font-bold text-brand active:scale-96 transition-transform duration-fast ease-out-soft">
              {t.office.strengthsEdit}
            </button>
          </div>
          {/* 가능 조건: 잘하는 점과 같은 시트에서 고쳐서 바로 아래 한 줄 */}
          {(app.conditions?.length ?? 0) > 0 && (
            <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep" data-testid="office-conditions">
              <span className="font-bold text-text-primary">{t.office.conditionsTitle}</span> {app.conditions!.join(' · ')}
            </p>
          )}
        </div>
        <LevelRow kept={kept} reviews={reviews} />
      </section>
    </header>
  );
}

/** 약속 레벨: 실제 거래 기록으로만 (약속 이행 = 합의 복비 그대로 + 중개사가 날짜를 직접 알림, settle.ts). 레벨 = promiseTier + 1 */
function LevelRow({ kept, reviews }: { kept: number; reviews: { count: number; average: number | null } }) {
  const tier = promiseTier(kept);
  const nextMin = tier === 3 ? null : PROMISE_TIER_MIN[tier];
  return (
    <div className="px-5 py-4 border-t border-border-light" data-testid="office-level">
      <div className="flex items-center justify-between gap-2">
        <PromiseLevel level={promiseLevel(kept)} size="md" />
        <span className="text-[12px] font-medium text-text-tertiary inline-flex items-center gap-1" data-testid="office-rating">
          <Star className="w-3.5 h-3.5" aria-hidden />
          {reviews.average === null ? t.office.ratingNone : fill(t.office.rating, { avg: reviews.average.toFixed(1), n: reviews.count })}
        </span>
      </div>
      {nextMin !== null && (
        <div className="mt-3 h-1.5 rounded-full bg-surface-subtle overflow-hidden" aria-hidden>
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, Math.round((kept / nextMin) * 100))}%` }} />
        </div>
      )}
      <p className="mt-2 text-[13px] font-bold text-text-secondary break-keep">
        {nextMin === null ? t.office.levelMax : fill(t.office.levelNext, { n: nextMin - kept, lv: tier + 2 })}
      </p>
      <p className="text-[12px] font-medium text-text-tertiary break-keep">{fill(t.office.levelRule, { kept })}</p>
    </div>
  );
}

interface OfficeTabProps {
  ws: BrokerWorkspace;
  nextWeekLabel: string;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onMoreCredits: () => void;
  /** 끝난 보낸 요청, 보낸 날부터 30일 (pastRequests.listingBucket = PAST), 최신순 */
  past: { s: SentRequest; status: SentStatus }[];
  /** 이번 달 내 성과 (lib/broker/monthPerformance) */
  perf: MonthPerformance;
  /** 집주인이 인정한 장점: 후기 칩 많이 고른 순 */
  endorsed: Array<[string, number]>;
}

/** 이번 달 내 성과(보냄 → 고름 → 계약 + 계약 보수) + 집주인이 인정한 장점 (대표님 2026-10-29 A안) */
function PerformanceCard({ perf, endorsed }: { perf: MonthPerformance; endorsed: Array<[string, number]> }) {
  const p = t.office.performance;
  const cells: [string, number][] = [
    [p.sent, perf.sent],
    [p.picked, perf.picked],
    [p.contracted, perf.contracted],
  ];
  return (
    <div className="p-4 rounded-2xl bg-surface-card" data-testid="office-performance">
      <div className="grid grid-cols-3 gap-2 text-center">
        {cells.map(([label, n], i) => (
          <div key={label} className={`py-3 rounded-xl ${i === 2 ? 'bg-brand-subtle' : 'bg-surface-page'}`}>
            <span className={`block text-[20px] font-bold tabular-nums ${i === 2 ? 'text-brand-hover' : 'text-text-primary'}`}>{n}</span>
            <span className={`block text-[12px] font-medium ${i === 2 ? 'text-brand-hover' : 'text-text-secondary'}`}>{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] font-medium text-text-secondary">{perf.contracted > 0 ? fill(p.fee, { won: formatWon(perf.feeWon) }) : p.feeNone}</p>
      <div className="mt-3 pt-3 border-t border-border-light" data-testid="office-endorsed">
        <p className="text-[13px] font-bold text-text-primary">{t.office.endorsedTitle}</p>
        {endorsed.length === 0 ? (
          <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{t.office.endorsedEmpty}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {endorsed.map(([chip, n]) => (
              <span key={chip} className="h-8 px-3 rounded-full bg-status-good-light text-[13px] font-bold text-[var(--status-good-strong)] inline-flex items-center gap-1">
                {chip} <span className="tabular-nums">{fill(t.office.endorsedCount, { n })}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 섹션 제목: 개수 칩은 제목 바로 옆(다른 화면과 같게), right는 오른쪽 끝(크레딧 잔액) */
function SectionTitle({ title, count, right }: { title: string; count?: number; right?: React.ReactNode }) {
  return (
    <h2 className="pt-3 px-1 flex items-center justify-between gap-2 text-[17px] font-bold text-text-primary">
      <span className="flex items-center gap-2">
        {title}
        {count ? <span className={SECTION_COUNT}>{count}</span> : null}
      </span>
      {right}
    </h2>
  );
}

/** 내 사무소 탭 본문 (대표님 2026-10-27, 2026-10-29 성과 추가): 이번 달 내 성과·인정한 장점 → 복비 특약 → 크레딧(내역은 접어 둠) → 지난 요청(30일). 섹션 제목은 카드 밖 */
export default function OfficeTab({ ws, nextWeekLabel, historyOpen, onToggleHistory, onMoreCredits, past, perf, endorsed }: OfficeTabProps) {
  return (
    <section className="space-y-2" data-testid="tab-office">
      <SectionTitle title={t.office.sections.performance} />
      <PerformanceCard perf={perf} endorsed={endorsed} />

      <SectionTitle title={t.office.sections.terms} />
      <Link href="/agent/terms" data-testid="office-terms" className="p-4 rounded-2xl bg-surface-card flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[15px] font-bold text-text-primary">{SITE_CONTENT.brokerTerms.officeMenu}</span>
          <span className="block text-[13px] font-medium text-text-tertiary break-keep">{SITE_CONTENT.brokerTerms.officeMenuSub}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" aria-hidden />
      </Link>

      <SectionTitle
        title={t.office.sections.credits}
        right={<span className="text-[20px] font-extrabold text-brand tabular-nums">{fill(t.office.creditsBalance, { n: ws.wallet.balance })}</span>}
      />
      <div className="p-4 rounded-2xl bg-surface-card" data-testid="office-credits">
        <p className="text-[13px] font-medium text-text-secondary break-keep">
          {fill(ws.wallet.balance >= WEEKLY_CREDITS ? t.office.creditsRuleFull : t.office.creditsRule, { date: nextWeekLabel, n: WEEKLY_CREDITS })}
        </p>
        <MoreCreditsButton onClick={onMoreCredits} />
        {/* 내역은 기본으로 접어 둔다 (대표님 2026-10-26) */}
        {ws.wallet.events.length === 0 ? (
          <p className="mt-3 text-[13px] font-medium text-text-tertiary">{t.office.historyEmpty}</p>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleHistory}
              aria-expanded={historyOpen}
              data-testid="history-toggle"
              className="mt-2 w-full h-11 flex items-center justify-between text-[13px] font-bold text-text-secondary"
            >
              {fill(t.office.historyMore, { n: ws.wallet.events.length })}
              <ChevronDown className={`w-4 h-4 transition-transform duration-fast ease-out-soft ${historyOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {historyOpen && <CreditHistory ws={ws} />}
          </>
        )}
      </div>

      <SectionTitle title={t.office.sections.past} count={past.length} />
      <PastRequestsCard past={past} />

      {/* 내 정보 관리 (열람·정정·탈퇴, 대표님 2026-10-29) */}
      <Link href="/my-info" data-testid="office-my-info" className="mt-2 min-h-11 flex items-center justify-center text-[13px] font-medium text-text-tertiary underline">
        {SITE_CONTENT.myInfo.link}
      </Link>
    </section>
  );
}

/** 지난 요청: 내 매물에서 빠진 끝난 요청. 단지·요청 날짜·상태 알약 (대표님 2026-10-27) */
function PastRequestsCard({ past }: { past: { s: SentRequest; status: SentStatus }[] }) {
  return (
    <div className="px-4 py-3 rounded-2xl bg-surface-card" data-testid="office-past">
      {past.length === 0 ? (
        <p className="py-1 text-[13px] font-medium text-text-tertiary">{t.office.pastEmpty}</p>
      ) : (
        <ul className="divide-y divide-border-light" data-testid="past-list">
          {past.map(({ s, status }) => (
            <li key={s.requestId} className="min-h-11 py-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-text-primary break-keep">{s.snapshot.complexName}</span>
                <span className="block text-[12px] font-medium text-text-tertiary break-keep">
                  {s.snapshot.tradeType} · {s.snapshot.pyeongLabel.split(' · ')[0]} · {fill(t.office.pastSent, { date: formatDateKo(kstDateKey(new Date(s.sentAt))) })}
                </span>
              </span>
              <StatusPill tone="DONE">{t.listings.status[status]}</StatusPill>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{t.office.pastNote}</p>
    </div>
  );
}

/** 크레딧 내역 (최신순): 어느 의뢰였는지 보낸 요청 기록의 단지·평형·받는 금액을 붙인다 */
function CreditHistory({ ws }: { ws: BrokerWorkspace }) {
  return (
    <ul className="divide-y divide-border-light" data-testid="credit-history">
      {[...ws.wallet.events].reverse().map((e, i) => {
        const snap = e.requestId ? ws.sent.find((s) => s.requestId === e.requestId)?.snapshot : null;
        return (
          <li key={`${e.at}-${i}`} className="min-h-11 py-2 flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0">
              <span className="block font-bold text-text-primary">{e.kind === 'REFUND' && e.reason ? t.office.refundReason[e.reason] : t.office.history[e.kind]}</span>
              <span className="block text-[12px] font-medium text-text-tertiary break-keep">
                {formatDateKo(kstDateKey(new Date(e.at)))}
                {snap && ` · ${fill(t.office.historyDetail, { complex: snap.complexName, pyeong: snap.pyeongLabel, won: formatWon(snap.commissionWon) })}`}
              </span>
            </span>
            <span className={`shrink-0 font-bold tabular-nums ${e.amount > 0 ? 'text-brand' : 'text-text-secondary'}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</span>
          </li>
        );
      })}
    </ul>
  );
}
