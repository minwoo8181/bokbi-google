'use client';

import React, { useState } from 'react';
import { ChevronDown, Phone, X } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import {
  activeBlocked,
  addBlockedRange,
  bookingsInRange,
  canceledNotices,
  canToggleOff,
  checkBlockedRange,
  DAY_PARTS,
  partHourRanges,
  removeBlockedRange,
  splitVisits,
  summarizeWeekly,
  toggleWeekly,
  type BlockedRange,
  type ShowingAvailability,
  type VisitBooking,
  type Weekday,
} from '@/lib/requests/showing';
import { ownerVisitEvent } from '@/lib/calendar';
import type { BrokerOffer, Occupancy } from '@/lib/requests/types';
import AddToCalendarButton from '@/components/common/AddToCalendarButton';
import ActionSheet from './ActionSheet';
import { fill, formatDateKo } from './format';

interface ShowingScheduleCardProps {
  occupancy: Occupancy;
  availability: ShowingAvailability;
  visits: VisitBooking[];
  offers: BrokerOffer[];
  complexName: string;
  /** 세입자 거주 집: 집주인이 넣은 세입자 번호를 확인용으로 보여 줌 (대표님 2026-10-26) */
  tenantPhone?: string;
  today: string;
  onChange: (next: ShowingAvailability) => void;
  /** 전화를 걸면서 취소 (기록은 남는다) */
  onCancelVisit: (visitId: string) => void;
  /** 중개사가 취소한 일정의 "캘린더에서도 지워 주세요" 확인 */
  onAckCanceled: (visitId: string) => void;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** 월요일부터 (한국 달력 습관) */
const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** 24시간 → ['오전'|'낮'|'오후'|'저녁', 12시간 숫자]. 범위 끝 18시는 "오후 6시" (저녁은 18시에 시작하는 범위만) */
const hourKo = (h: number, isEnd = false): [string, number] => {
  const p = SITE_CONTENT.myRequests.inProgress.hourPeriod;
  if (h < 12) return [p.AM, h];
  if (h === 12) return [p.NOON, 12];
  return [h > 18 || (h === 18 && !isEnd) ? p.EVENING : p.PM, h - 12];
};

const rangeLabel = (r: BlockedRange) =>
  r.start === r.end ? formatDateKo(r.start) : `${formatDateKo(r.start)} ~ ${formatDateKo(r.end)}`;

/**
 * 방문 가능 시간: 방문 예약(매일 보는 것) → 매주 방문 시간(요약, 바꾸기로 펼침, 최소 1칸) → 안 되는 날(기간, 최대 7일).
 * 전체 끄기 스위치는 없다: 언제 볼 수 있는지가 항상 남게. 세입자 거주 집은 안내만
 */
export default function ShowingScheduleCard({
  occupancy,
  availability: a,
  visits,
  offers,
  complexName,
  tenantPhone,
  today,
  onChange,
  onCancelVisit,
  onAckCanceled,
}: ShowingScheduleCardProps) {
  const t = SITE_CONTENT.myRequests.inProgress;
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [editing, setEditing] = useState(false);
  const [lastSlotHint, setLastSlotHint] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<VisitBooking | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  if (occupancy === 'TENANT') {
    return (
      <section className="p-5 rounded-2xl bg-surface-card" data-testid="showing-tenant">
        <h2 className="text-[17px] font-bold text-text-primary">{t.showingTitle}</h2>
        <p className="mt-2 text-[15px] font-medium text-text-primary break-keep">{t.tenantNotice}</p>
        {tenantPhone && (
          <p className="mt-2 text-[15px] font-bold text-text-primary tabular-nums" data-testid="tenant-phone">
            {t.tenantPhoneLabel} {tenantPhone}
          </p>
        )}
        <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.tenantSub}</p>
      </section>
    );
  }

  const disclosureOf = (offerId: string) => offers.find((o) => o.id === offerId)?.disclosure;
  const officeOf = (offerId: string) => disclosureOf(offerId)?.officeName ?? '';
  const { upcoming, history } = splitVisits(visits, today);
  const notices = new Set(canceledNotices(visits, 'OWNER').map((v) => v.id));
  const visitLabel = (v: VisitBooking) => `${formatDateKo(v.date)} ${v.hour}시`;
  // 방문 가능 시간 칩: "평일 · 저녁 6~9시" (붙은 시간대는 한 범위로, partHourRanges)
  const chips = summarizeWeekly(a).map((g) => {
    const days = g.days === 'WEEKDAYS' ? t.weekdaysLabel : g.days === 'WEEKEND' ? t.weekendLabel : `${t.weekdays[g.days]}요일`;
    const range = partHourRanges(g.parts)
      .map(([s, e]) => {
        const [ps, hs] = hourKo(s);
        const [pe, he] = hourKo(e, true);
        return ps === pe ? `${ps} ${hs}~${he}시` : `${ps} ${hs}시~${pe} ${he}시`;
      })
      .join(', ');
    return fill(t.weeklyChip, { days, range });
  });
  const blocked = activeBlocked(a, today);
  const blockedVisitCount = blocked.reduce((n, r) => n + bookingsInRange(upcoming, r).length, 0);
  // 끝 날짜를 안 고르면 하루만 빼는 것으로 본다
  const draft = { start, end: end || start };
  const error = start ? checkBlockedRange(draft, today) : null;

  return (
    <section className="space-y-2" data-testid="showing-card">
      {/* 섹션 제목은 다른 섹션처럼 카드 밖 (2026-10-27) */}
      <h2 className="pt-3 px-1 text-[17px] font-bold text-text-primary">{t.showingTitle}</h2>
      <div className="p-5 rounded-2xl bg-surface-card space-y-5">
      <p className="-mt-1 text-[13px] font-medium text-text-tertiary break-keep">{t.showingSub}</p>

      {/* 방문 일정: 중개사가 전화로 정해 저장 → 캘린더에 저장하면 1시간 전 알림. 취소는 전화로 알리면서, 기록은 남김 */}
      <div>
        <h3 className="text-[15px] font-bold text-text-primary">{t.visitsTitle}</h3>
        {upcoming.length === 0 && notices.size === 0 ? (
          <p className="mt-2 text-[13px] font-medium text-text-tertiary">{t.visitsEmpty}</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {/* 중개사가 취소한 일정: 확인 전까지 위에 */}
            {history
              .filter((v) => notices.has(v.id))
              .map((v) => (
                <li key={v.id} className="p-3 rounded-xl bg-surface-subtle" data-testid="visit-canceled-notice">
                  <p className="text-[15px] font-bold text-text-tertiary line-through tabular-nums">{visitLabel(v)}</p>
                  <p className="text-[13px] font-medium text-text-tertiary truncate">{officeOf(v.offerId)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-[var(--status-risk-strong)] break-keep">{t.visitCanceledNotice}</p>
                    <button
                      type="button"
                      onClick={() => onAckCanceled(v.id)}
                      className="h-11 px-3 rounded-xl bg-surface-card text-text-secondary text-[13px] font-bold flex-shrink-0"
                    >
                      {t.visitAck}
                    </button>
                  </div>
                </li>
              ))}
            {/* 새 방문 일정 강조는 그 중개사 카드의 "새 소식" 줄로 옮김 (대표님 2026-10-26). 여기는 전체 일정 목록만 */}
            {upcoming.map((v) => {
              const d = disclosureOf(v.offerId);
              return (
                <li key={v.id} className="p-3 rounded-xl bg-surface-subtle" data-testid="visit-item">
                  <p className="text-[15px] font-bold text-text-primary tabular-nums">{visitLabel(v)}</p>
                  <p className="text-[13px] font-medium text-text-secondary truncate">{officeOf(v.offerId)}</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelTarget(v)}
                      data-testid="visit-cancel"
                      className="h-11 px-3 rounded-xl bg-surface-card text-text-secondary text-[13px] font-bold flex-shrink-0"
                    >
                      {t.visitCancel}
                    </button>
                    <AddToCalendarButton
                      event={ownerVisitEvent(v, { officeName: d?.officeName ?? '', officePhone: d?.phone ?? '', complexName })}
                      testId="visit-calendar"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {history.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
              data-testid="visit-history-toggle"
              className="h-11 inline-flex items-center gap-1 text-[13px] font-bold text-text-tertiary"
            >
              {fill(t.visitHistory, { n: history.length })}
              <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {historyOpen && (
              <ul className="divide-y divide-border-light" data-testid="visit-history">
                {history.map((v) => (
                  <li key={v.id} className="py-2">
                    <p className={`text-[13px] font-bold tabular-nums ${v.canceledAt ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>{visitLabel(v)}</p>
                    <p className="text-[12px] font-medium text-text-tertiary truncate">
                      {officeOf(v.offerId)} · {v.canceledAt
                        ? `${t.visitCanceled} · ${v.cancelReason === 'WITHDRAWN' ? t.visitCanceledWithdrawn : v.cancelReason === 'PAUSED' ? t.visitCanceledPaused : t.visitCanceledBy[v.canceledBy ?? 'OWNER']}`
                        : t.visitPast}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <ActionSheet
        open={!!cancelTarget}
        title={t.visitCancelSheet.title}
        confirmLabel={t.visitCancelSheet.confirm}
        cancelLabel={t.visitCancelSheet.close}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          const phone = disclosureOf(cancelTarget.offerId)?.phone ?? '';
          onCancelVisit(cancelTarget.id);
          setCancelTarget(null);
          if (phone) window.location.href = telHref(phone);
        }}
        tone="risk"
        testId="visit-cancel-sheet"
      >
        {cancelTarget && (
          <>
            <p className="text-[15px] font-bold text-text-primary tabular-nums">
              {visitLabel(cancelTarget)} · {officeOf(cancelTarget.offerId)}
            </p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary whitespace-pre-line break-keep">{t.visitCancelSheet.body}</p>
            <p className="mt-2 text-[13px] font-bold text-text-tertiary inline-flex items-center gap-1">
              <Phone className="w-4 h-4" aria-hidden />
              {disclosureOf(cancelTarget.offerId)?.phone}
            </p>
          </>
        )}
      </ActionSheet>

      {/* 매주 방문 시간: 평소엔 한 줄 요약, 바꾸기를 누르면 요일 표 (마지막 1칸은 끌 수 없음) */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-text-primary">{t.weeklyTitle}</h3>
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setLastSlotHint(false);
            }}
            data-testid="weekly-edit"
            className="h-11 px-1 text-[15px] font-bold text-brand"
          >
            {editing ? t.weeklyDone : t.weeklyEdit}
          </button>
        </div>
        {!editing ? (
          <ul className="mt-1 flex flex-wrap gap-2" data-testid="weekly-summary">
            {chips.map((c) => (
              <li key={c} className="h-8 px-3 rounded-full bg-brand-light text-brand-hover text-[13px] font-bold inline-flex items-center">
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="mt-1 grid grid-cols-[32px_repeat(3,1fr)] gap-2 items-center" data-testid="showing-grid">
              <span />
              {DAY_PARTS.map((p) => (
                <span key={p} className="text-center">
                  <span className="block text-[13px] font-bold text-text-secondary">{t.dayParts[p]}</span>
                  <span className="block text-[12px] font-medium text-text-tertiary">{t.dayPartHours[p]}</span>
                </span>
              ))}
              {WEEK_ORDER.map((d) => (
                <React.Fragment key={d}>
                  <span className={`text-[13px] font-bold ${d === 0 ? 'text-[var(--status-risk-strong)]' : 'text-text-secondary'}`}>{t.weekdays[d]}</span>
                  {DAY_PARTS.map((p) => {
                    const on = a.weekly[d][p];
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${t.weekdays[d]}요일 ${t.dayParts[p]}`}
                        onClick={() => {
                          if (!canToggleOff(a, d, p)) {
                            setLastSlotHint(true);
                            return;
                          }
                          setLastSlotHint(false);
                          onChange(toggleWeekly(a, d, p));
                        }}
                        className={`h-11 rounded-lg text-[13px] font-bold transition-colors ${
                          on ? 'bg-brand-light text-brand-hover' : 'bg-surface-subtle text-text-tertiary'
                        }`}
                      >
                        {on ? '가능' : ''}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            {lastSlotHint && (
              <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)]" role="alert" data-testid="last-slot-hint">
                {t.weeklyLastSlot}
              </p>
            )}
          </>
        )}
      </div>

      {/* 안 되는 날: 평소엔 한 줄, 누르면 날짜 칸 (2026-10-27). 기간(최대 7일), 끝나면 저절로 다시 열림 */}
      <div className="pt-4 border-t border-border-light">
        <button
          type="button"
          onClick={() => setBlockedOpen((v) => !v)}
          aria-expanded={blockedOpen}
          data-testid="blocked-toggle"
          className="w-full min-h-11 flex items-center justify-between gap-2 text-left"
        >
          <span className="text-[15px] font-bold text-text-primary">{t.blockedTitle}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-text-tertiary">
            {blocked.length === 0 ? t.blockedEmpty : fill(t.blockedRow, { n: blocked.length })}
            <ChevronDown className={`w-4 h-4 transition-transform ${blockedOpen ? 'rotate-180' : ''}`} aria-hidden />
          </span>
        </button>
        {blockedOpen && (
        <>
        <p className="mt-1 text-[13px] font-medium text-text-tertiary break-keep">{t.blockedHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            [t.blockedStart, start, setStart],
            [t.blockedEnd, end, setEnd],
          ].map(([label, value, set]) => (
            <label key={label as string} className="block min-w-0">
              <span className="text-[13px] font-bold text-text-secondary">{label as string}</span>
              <input
                type="date"
                value={value as string}
                min={(label === t.blockedEnd && start) || today}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
                className="mt-1 w-full min-w-0 h-11 px-2 rounded-xl bg-surface-subtle text-[15px] text-text-primary"
              />
            </label>
          ))}
        </div>
        {error && error !== 'EMPTY' && (
          <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert">
            {t.blockedErrors[error]}
          </p>
        )}
        <button
          type="button"
          disabled={!start || error !== null}
          onClick={() => {
            onChange(addBlockedRange(a, draft));
            setStart('');
            setEnd('');
          }}
          data-testid="blocked-add"
          className="mt-2 w-full h-11 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold disabled:bg-surface-subtle disabled:text-text-tertiary"
        >
          {t.blockedAdd}
        </button>
        </>
        )}
        {/* 빼 둔 기간은 접혀 있어도 보인다 (다시 열기 ×) */}
        {blocked.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {blocked.map((r) => (
              <li
                key={`${r.start}-${r.end}`}
                className="inline-flex items-center h-9 pl-3 pr-1 rounded-full bg-surface-subtle text-[13px] font-bold text-text-secondary"
              >
                {rangeLabel(r)}
                <button
                  type="button"
                  aria-label={`${rangeLabel(r)} 다시 열기`}
                  onClick={() => onChange(removeBlockedRange(a, r))}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {blockedVisitCount > 0 && (
          <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep">{fill(t.blockedHasVisit, { count: blockedVisitCount })}</p>
        )}
      </div>
      </div>
    </section>
  );
}
