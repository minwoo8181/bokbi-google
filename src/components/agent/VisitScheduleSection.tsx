'use client';

import React, { useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import {
  bookableDates,
  brokerSlots,
  canceledNotices,
  MAX_UPCOMING_PER_OFFER,
  splitVisits,
  summarizeWeekly,
  visibleVisits,
  weekdayOf,
  type VisitBooking,
  type VisitRejectReason,
} from '@/lib/requests/showing';
import { brokerVisitEvent } from '@/lib/calendar';
import type { OwnerContact, OwnerRequest } from '@/lib/requests/types';
import AddToCalendarButton from '@/components/common/AddToCalendarButton';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, formatDateKo } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerAgent.listing.visit;
const days = SITE_CONTENT.myRequests.inProgress;
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

interface VisitScheduleSectionProps {
  request: OwnerRequest;
  /** 열람한 동·호수·연락처 (거래 페이지가 1번 열람해 내려 줌) */
  dongHo: string;
  contact: OwnerContact | null;
  offerId: string;
  today: string;
  /** 오늘 지난 시각을 막는 데 씀 */
  now: number;
  /** 검사 후 저장. 막히면 사유 */
  onSave: (date: string, hour: number) => VisitRejectReason | null;
  /** 전화를 걸면서 취소 (기록은 남는다) */
  onCancel: (visitId: string) => void;
  onAck: (visitId: string) => void;
}

/**
 * ⑤ 방문 일정 (대표님 2026-10-25): 집주인 방문 가능 시간을 보고 전화로 정한 뒤 저장 → 집주인 화면에 보임.
 * 양쪽 다 휴대폰 캘린더에 저장(알림은 캘린더가 대신). 다른 중개사 일정은 누구인지 없이 "다른 방문"만 (블라인드)
 */
export default function VisitScheduleSection({ request, dongHo, contact, offerId, today, now, onSave, onCancel, onAck }: VisitScheduleSectionProps) {
  const dates = bookableDates(today);
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(dates[0]);
  const [hour, setHour] = useState<number | null>(null);
  const [error, setError] = useState<VisitRejectReason | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VisitBooking | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const tenant = request.occupancy === 'TENANT';
  const callPhone = (tenant ? contact?.tenantPhone : contact?.ownerPhone) ?? '';
  const mine = visibleVisits(request.visits, { offerId });
  const { upcoming, history } = splitVisits(mine, today);
  const notices = new Set(canceledNotices(request.visits, { offerId }).map((v) => v.id));
  const paused = !!request.paused;

  const summary = summarizeWeekly(request.showing)
    .map((g) => {
      const d = g.days === 'WEEKDAYS' ? days.weekdaysLabel : g.days === 'WEEKEND' ? days.weekendLabel : `${days.weekdays[g.days]}요일`;
      return `${d} ${g.parts.map((p) => days.dayParts[p]).join('·')}`;
    })
    .join(' · ');
  const slots = brokerSlots(request.showing, request.visits, date, offerId, new Date(now));
  const visitLabel = (v: VisitBooking) => `${formatDateKo(v.date)} ${v.hour}시`;
  const calendarEvent = (v: VisitBooking) =>
    brokerVisitEvent(v, { complexName: request.complexName, pyeongLabel: request.pyeongLabel.split(' · ')[0], dongHo, phone: callPhone });

  const save = () => {
    if (hour === null) return;
    const reason = onSave(date, hour);
    setError(reason);
    if (!reason) {
      setPicking(false);
      setHour(null);
    }
  };

  const openPicker = () => {
    // 2개를 다 잡았으면 고르기 전에 알려 준다
    const limit = upcoming.length >= MAX_UPCOMING_PER_OFFER;
    setError(limit ? 'LIMIT' : null);
    if (!limit) setPicking(true);
  };

  return (
    <section className="mt-3 p-4 rounded-2xl bg-surface-card" data-testid="visit-section">
      <h2 className="text-[15px] font-bold text-text-primary">{t.title}</h2>

      {tenant ? (
        <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">{t.tenantGuide}</p>
      ) : (
        <div className="mt-1">
          <p className="text-[12px] font-medium text-text-tertiary">{t.availability}</p>
          <p className="text-[15px] font-bold text-text-primary break-keep" data-testid="visit-availability">
            {summary || t.availabilityEmpty}
          </p>
        </div>
      )}

      {callPhone && (
        <a
          href={telHref(callPhone)}
          className="mt-3 w-full h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold inline-flex items-center justify-center gap-1"
        >
          <Phone className="w-4 h-4" aria-hidden />
          {tenant ? t.callTenant : t.callOwner}
        </a>
      )}
      {/* 세입자 거주 집은 집주인 화면에 방문 일정이 없다 (세입자와 직접 정함) → 내 캘린더용 안내 */}
      <p className="mt-2 text-[12px] font-medium text-text-tertiary break-keep">{tenant ? t.tenantSaveGuide : t.guide}</p>

      {paused ? (
        <p className="mt-3 text-[13px] font-bold text-text-secondary break-keep" data-testid="visit-paused">
          {t.paused}
        </p>
      ) : !picking ? (
        <button type="button" onClick={openPicker} data-testid="visit-add" className="mt-3 w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold">
          {t.add}
        </button>
      ) : (
        <div className="mt-3 space-y-3" data-testid="visit-picker">
          <div>
            <p className="text-[13px] font-bold text-text-secondary">{t.pickDate}</p>
            <div className="mt-1 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.pickDate}>
              {dates.map((d, i) => {
                const on = d === date;
                const day = weekdayOf(d);
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setDate(d);
                      setHour(null);
                      setError(null);
                    }}
                    className={`h-13 rounded-xl flex flex-col items-center justify-center ${on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`}
                  >
                    <span className={`text-[12px] font-bold ${!on && day === 0 ? 'text-[var(--status-risk-strong)]' : ''}`}>{i === 0 ? t.today : `${days.weekdays[day]}요일`}</span>
                    <span className="text-[15px] font-extrabold tabular-nums">{Number(d.slice(8))}일</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold text-text-secondary">{t.pickHour}</p>
            <div className="mt-1 grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.pickHour} data-testid="visit-hours">
              {slots.map((s) => {
                const on = s.hour === hour;
                const disabled = s.state !== 'OPEN';
                return (
                  <button
                    key={s.hour}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    data-state={s.state}
                    onClick={() => {
                      setHour(s.hour);
                      setError(null);
                    }}
                    className={`h-13 rounded-xl flex flex-col items-center justify-center ${
                      on
                        ? 'bg-brand text-white'
                        : disabled
                          ? 'bg-surface-subtle text-text-tertiary'
                          : s.ownerOpen
                            ? 'bg-brand-light text-brand-hover'
                            : 'bg-surface-subtle text-text-secondary'
                    }`}
                  >
                    <span className="text-[15px] font-bold tabular-nums">{s.hour}시</span>
                    <span className="text-[12px] font-bold">
                      {s.state === 'TAKEN' ? t.taken : s.state === 'MINE' ? t.mine : s.state === 'OPEN' && s.ownerOpen ? t.ownerOpen : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPicking(false)} className="flex-1 h-13 rounded-xl bg-surface-subtle text-text-secondary text-[15px] font-bold">
              {t.cancelPick}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={hour === null}
              data-testid="visit-save"
              className="flex-[1.6] h-13 rounded-xl bg-brand text-white text-[15px] font-bold disabled:bg-surface-subtle disabled:text-text-tertiary"
            >
              {hour === null ? t.add : fill(t.save, { date: formatDateKo(date), hour })}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert" data-testid="visit-error">
          {t.errors[error]}
        </p>
      )}

      {/* 내 방문 */}
      <h3 className="mt-4 text-[13px] font-bold text-text-secondary">{t.mineTitle}</h3>
      {upcoming.length === 0 && notices.size === 0 ? (
        <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.empty}</p>
      ) : (
        <ul className="mt-1 space-y-2">
          {history
            .filter((v) => notices.has(v.id))
            .map((v) => (
              <li key={v.id} className="p-3 rounded-xl bg-surface-subtle" data-testid="broker-visit-canceled-notice">
                <p className="text-[15px] font-bold text-text-tertiary line-through tabular-nums">{visitLabel(v)}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[var(--status-risk-strong)] break-keep">{t.canceledNotice}</p>
                  <button
                    type="button"
                    onClick={() => onAck(v.id)}
                    className="h-11 px-3 rounded-xl bg-surface-card text-text-secondary text-[13px] font-bold flex-shrink-0"
                  >
                    {t.ack}
                  </button>
                </div>
              </li>
            ))}
          {upcoming.map((v) => (
            <li key={v.id} className="p-3 rounded-xl bg-surface-subtle" data-testid="broker-visit-item">
              <p className="text-[15px] font-bold text-text-primary tabular-nums">{visitLabel(v)}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(v)}
                  data-testid="broker-visit-cancel"
                  className="h-11 px-3 rounded-xl bg-surface-card text-text-secondary text-[13px] font-bold flex-shrink-0"
                >
                  {t.cancel}
                </button>
                <AddToCalendarButton event={calendarEvent(v)} testId="broker-visit-calendar" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
            className="h-11 inline-flex items-center gap-1 text-[13px] font-bold text-text-tertiary"
          >
            {fill(t.history, { n: history.length })}
            <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {historyOpen && (
            <ul className="divide-y divide-border-light">
              {history.map((v) => (
                <li key={v.id} className="py-2">
                  <p className={`text-[13px] font-bold tabular-nums ${v.canceledAt ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}>{visitLabel(v)}</p>
                  <p className="text-[12px] font-medium text-text-tertiary">
                    {v.canceledAt
                      ? `${t.canceled} · ${v.cancelReason === 'WITHDRAWN' ? t.canceledWithdrawn : v.cancelReason === 'PAUSED' ? t.canceledPaused : t.canceledBy[v.canceledBy ?? 'BROKER']}`
                      : t.past}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ActionSheet
        open={!!cancelTarget}
        title={t.cancelSheet.title}
        confirmLabel={t.cancelSheet.confirm}
        cancelLabel={t.cancelSheet.close}
        tone="risk"
        testId="broker-visit-cancel-sheet"
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          onCancel(cancelTarget.id);
          setCancelTarget(null);
          if (callPhone) window.location.href = telHref(callPhone);
        }}
      >
        {cancelTarget && (
          <>
            <p className="text-[15px] font-bold text-text-primary tabular-nums">{visitLabel(cancelTarget)}</p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary whitespace-pre-line break-keep">{t.cancelSheet.body}</p>
            {callPhone && (
              <p className="mt-2 text-[13px] font-bold text-text-tertiary inline-flex items-center gap-1">
                <Phone className="w-4 h-4" aria-hidden />
                {callPhone}
              </p>
            )}
          </>
        )}
      </ActionSheet>
    </section>
  );
}
