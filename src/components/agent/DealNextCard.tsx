'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { normalizeNaverListingInput } from '@/lib/requests/naverListing';
import type { DelayReason, FakeReportStatus, OwnerRequest } from '@/lib/requests/types';
import type { CalendarEvent } from '@/lib/calendar';
import type { DealPhase, NextAction, ReportStep } from '@/lib/deal/deal';
import AddToCalendarButton from '@/components/common/AddToCalendarButton';
import { fill, formatDateKo } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerDeal;
const l = SITE_CONTENT.brokerAgent.listing;
const DELAY_REASONS: DelayReason[] = ['PHOTO', 'TODAY', 'OWNER_CHECK'];
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

const press = 'active:scale-96 transition-transform duration-fast ease-out-soft';
const primary = `w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold ${press}`;
const secondary = `w-full h-12 rounded-xl bg-surface-subtle text-text-primary text-[15px] font-bold ${press}`;
const quiet = `w-full h-11 text-[13px] font-bold text-text-tertiary ${press}`;

/** 네이버 광고 링크 입력 (지금 할 일 카드와 바로가기 시트에서 같이 씀) */
export function AdForm({ onPostAd }: { onPostAd: (url: string) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const submit = () => {
    const url = normalizeNaverListingInput(input);
    if (!url) return setError(true);
    setError(false);
    setInput('');
    onPostAd(url);
  };
  return (
    <>
      <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">{l.ad.sub}</p>
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError(false);
        }}
        inputMode="url"
        placeholder={l.ad.placeholder}
        aria-label={l.ad.title}
        data-testid="ad-input"
        className="mt-2 w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-4 font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand"
      />
      {error && (
        <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert">
          {l.ad.invalid}
        </p>
      )}
      <button type="button" onClick={submit} disabled={!input.trim()} data-testid="ad-submit" className={`mt-3 ${primary} disabled:bg-surface-subtle disabled:text-text-tertiary`}>
        {l.ad.submit}
      </button>
    </>
  );
}

interface DealNextCardProps {
  next: NextAction;
  phase: DealPhase;
  request: OwnerRequest;
  /** 열람한 집주인 전화 (거래 페이지가 1번 열람해 내려 줌, 없으면 '') */
  ownerPhone: string;
  delayReason: DelayReason | null;
  /** 내가 낸 허위 매물 신고 (운영팀 확인 중·허위 맞음·아님, fakeReport.ts) */
  fakeReport: FakeReportStatus | null;
  calendarEvents: CalendarEvent[];
  on: {
    ownerCheck: (how: 'CONFIRMED' | 'CALL_CONFIRMED') => void;
    reportFake: () => void;
    postAd: (url: string) => void;
    delay: (reason: DelayReason) => void;
    report: (step: ReportStep) => void;
    openDates: () => void;
    openVisits: () => void;
    adRemoved: () => void;
    calendarSaved: () => void;
  };
}

/** 지금 할 일 카드 한 장 (deal.ts nextAction). 카드 종류가 바뀌면 아래에서 올라온다 */
export default function DealNextCard({ next, phase, request, ownerPhone, delayReason, fakeReport, calendarEvents, on }: DealNextCardProps) {
  const [differ, setDiffer] = useState(false);
  const reports = next.reports ?? [];
  const reportLabel = (s: ReportStep) => (s === 'CONTRACT' && phase === 'MATCHED' ? t.buttons.contractDirect : s === 'PROVISIONAL' ? t.buttons.provisional : t.buttons[s === 'CONTRACT' ? 'contract' : s === 'BALANCE' ? 'balance' : 'broken']);
  const brokenLink = reports.includes('BROKEN') && (
    <button type="button" onClick={() => on.report('BROKEN')} data-testid="deal-report-broken" className={`mt-1 ${quiet}`}>
      {t.buttons.broken}
    </button>
  );

  let tone = 'text-brand';
  // "지금 할 일"은 카드 밖 섹션 제목에 (2026-10-27), 카드 위 작은 글자는 남은 시간·상황만
  let kicker = '';
  let title = '';
  let sub = '';
  let body: React.ReactNode = null;

  // 확인 중·허위 맞음은 이 카드만. 반려되면 평소 할 일(소유자 확인부터)로 돌아가고 위에 결과 한 줄
  const halted = fakeReport === 'PENDING' || fakeReport === 'CONFIRMED';
  if (halted) {
    title = l.reported[fakeReport];
    if (fakeReport === 'PENDING') sub = l.reported.pendingSub;
  } else
    switch (next.kind) {
      case 'OWNER_CHECK':
        if (fakeReport === 'REJECTED') {
          kicker = l.reported.REJECTED;
          tone = 'text-status-good';
        }
        title = l.ownerCheck.title;
        sub = l.ownerCheck.notice;
        body = (
          <>
            <button type="button" onClick={() => on.ownerCheck('CONFIRMED')} data-testid="owner-confirm" className={`mt-3 ${primary}`}>
              {l.ownerCheck.confirm}
            </button>
            {!differ ? (
              <button type="button" onClick={() => setDiffer(true)} data-testid="owner-differ" className={`mt-1 flex items-center justify-center gap-1 ${quiet}`}>
                {l.ownerCheck.differ}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <div className="mt-3 p-4 rounded-xl bg-surface-subtle" data-testid="owner-differ-box">
                <p className="text-[15px] font-bold text-text-primary break-keep">{l.ownerCheck.callGuide}</p>
                <div className="mt-3 flex gap-2">
                  {ownerPhone && (
                    <a href={telHref(ownerPhone)} className={`flex-1 h-12 rounded-xl bg-surface-card text-text-primary text-[15px] font-bold inline-flex items-center justify-center gap-1 ${press}`}>
                      <Phone className="w-4 h-4" aria-hidden />
                      {l.ownerCheck.callOwner}
                    </a>
                  )}
                  <button type="button" onClick={() => on.ownerCheck('CALL_CONFIRMED')} data-testid="owner-call-done" className={`flex-1 h-12 rounded-xl bg-brand text-white text-[15px] font-bold ${press}`}>
                    {l.ownerCheck.callDone}
                  </button>
                </div>
                {/* 신고는 한 번만 (반려된 뒤 다시 신고 불가) */}
                {!fakeReport && (
                  <button type="button" onClick={on.reportFake} data-testid="report-fake" className="mt-2 w-full h-11 text-[12px] font-bold text-text-tertiary underline">
                    {l.ownerCheck.fake}
                  </button>
                )}
              </div>
            )}
          </>
        );
        break;
      case 'POST_AD': {
        title = t.next.POST_AD.title;
        const state = next.vars.state as 'OVERDUE' | 'PAUSED' | undefined;
        kicker = state ? t.next.POST_AD[state] : fill(t.next.POST_AD.left, { h: next.vars.h });
        tone = state === 'OVERDUE' || (typeof next.vars.h === 'number' && next.vars.h <= 6) ? 'text-[var(--status-risk-strong)]' : 'text-brand';
        // 잠시 멈춘 동안은 광고를 올리지 않는다 (다시 시작한 시각부터 48시간)
        if (state === 'PAUSED') {
          sub = t.next.POST_AD.pausedSub;
          break;
        }
        body = (
          <>
            <AdForm onPostAd={on.postAd} />
            {state === 'OVERDUE' && (
              <div className="mt-4" data-testid="delay-note">
                <p className="text-[13px] font-bold text-text-primary">{l.delay.title}</p>
                <p className="text-[12px] font-medium text-text-tertiary break-keep">{delayReason ? l.delay.sent : l.delay.sub}</p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
                  {DELAY_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={delayReason === r}
                      onClick={() => on.delay(r)}
                      className={`h-10 px-4 rounded-full text-[13px] font-bold ${press} ${delayReason === r ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`}
                    >
                      {l.delay.reasons[r]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        );
        break;
      }
      case 'VISITS_AND_DEAL':
      case 'CALL_OWNER': {
        const denied = next.kind === 'CALL_OWNER';
        title = denied ? t.next.CALL_OWNER.title : t.next.VISITS_AND_DEAL.title;
        sub = denied ? t.next.CALL_OWNER.sub : t.next.VISITS_AND_DEAL.sub;
        if (denied) tone = 'text-[var(--status-risk-strong)]';
        body = (
          <div className="mt-3 space-y-2">
            {denied && ownerPhone && (
              <a href={telHref(ownerPhone)} className={`${secondary} inline-flex items-center justify-center gap-1`}>
                <Phone className="w-4 h-4" aria-hidden />
                {t.buttons.callOwner}
              </a>
            )}
            {!denied && (
              <button type="button" onClick={on.openVisits} data-testid="deal-open-visits" className={secondary}>
                {t.buttons.visit}
              </button>
            )}
            {reports
              .filter((s) => s !== 'BROKEN')
              .map((s, i) => (
                <button key={s} type="button" onClick={() => on.report(s)} data-testid={`deal-report-${s.toLowerCase()}`} className={i === 0 ? primary : secondary}>
                  {denied && next.vars.step === s ? t.buttons.reportAgain[s] : reportLabel(s)}
                </button>
              ))}
            {brokenLink}
          </div>
        );
        break;
      }
      case 'WAIT_OWNER':
        // "집주인 확인을 기다리고 있어요"는 머리 카드 제목에 이미 있음 (2026-10-27)
        title = t.next.WAIT_OWNER.title[next.vars.step as ReportStep];
        break;
      case 'SET_DATES':
        if (next.vars.declared === 'PROVISIONAL' || next.vars.declared === 'CONTRACT') kicker = t.next.SET_DATES.declared[next.vars.declared];
        title = t.next.SET_DATES.title;
        sub = t.next.SET_DATES.sub;
        body = (
          <>
            <button type="button" onClick={on.openDates} data-testid="deal-open-dates" className={`mt-3 ${primary}`}>
              {t.buttons.setDates}
            </button>
            {brokenLink}
          </>
        );
        break;
      case 'SAVE_CALENDAR': {
        title = t.next.SAVE_CALENDAR.title;
        const parts = (['contract', 'middle', 'balance'] as const)
          .filter((k) => next.vars[k])
          .map((k) => `${t.fields[k === 'contract' ? 'CONTRACT' : k === 'middle' ? 'MIDDLE' : 'BALANCE']} ${formatDateKo(String(next.vars[k]))}`);
        sub = `${parts.join(' · ')}\n${t.next.SAVE_CALENDAR.sub}`;
        body = (
          <div className="mt-3 flex flex-col gap-2">
            <AddToCalendarButton events={calendarEvents} onSaved={on.calendarSaved} variant="solid" label={SITE_CONTENT.calendar.saveAll} testId="deal-calendar" />
            <button type="button" onClick={on.openDates} className={quiet}>
              {t.buttons.changeDates}
            </button>
          </div>
        );
        break;
      }
      case 'UNTIL_CONTRACT':
      case 'UNTIL_BALANCE': {
        const c = t.next[next.kind];
        kicker = fill(t.dday, { n: next.vars.dday });
        title = fill(c.title, { date: formatDateKo(String(next.vars.date)) });
        sub = c.sub;
        tone = 'text-status-good';
        body = (
          <>
            <button type="button" onClick={on.openDates} className={`mt-3 ${secondary}`}>
              {t.buttons.changeDates}
            </button>
            {brokenLink}
          </>
        );
        break;
      }
      case 'CONTRACT_DAY':
      case 'BALANCE_DAY': {
        const d = Number(next.vars.dday);
        const c = t.next[next.kind];
        title = d < 0 ? c.passed : d === 0 ? c[0] : c[1];
        kicker = formatDateKo(String(next.vars.date));
        tone = d < 0 ? 'text-[var(--status-risk-strong)]' : 'text-text-primary';
        if (d < 0) sub = t.next.dayPassedSub;
        const docs = next.docs ? t.docs[request.tradeType][next.docs] : null;
        body = (
          <>
            {docs && (
              <div className="mt-3 p-4 rounded-xl bg-surface-subtle" data-testid="deal-docs">
                <p className="text-[13px] font-bold text-text-primary">{t.docs.title}</p>
                <p className="text-[12px] font-medium text-text-tertiary">{t.docs.note}</p>
                {(
                  [
                    [t.docs.tell, docs.tell],
                    [t.docs.check, docs.check],
                  ] as const
                ).map(([head, list]) => (
                  <div key={head} className="mt-2">
                    <p className="text-[12px] font-bold text-text-secondary">{head}</p>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {list.map((x) => (
                        <li key={x} className="h-7 px-3 rounded-full bg-surface-card text-[12px] font-medium text-text-primary inline-flex items-center">
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2">
              {reports
                .filter((s) => s !== 'BROKEN')
                .map((s) => (
                  <button key={s} type="button" onClick={() => on.report(s)} data-testid={`deal-report-${s.toLowerCase()}`} className={primary}>
                    {reportLabel(s)}
                  </button>
                ))}
              <button type="button" onClick={on.openDates} className={secondary}>
                {t.buttons.changeDates}
              </button>
            </div>
            {brokenLink}
          </>
        );
        break;
      }
      case 'REMOVE_AD': {
        // 24시간 기한과 이유를 처음부터 (대표님 2026-10-26: 지나면 허위 매물로 신고될 수 있음, 지나면 새 요청 잠금)
        const h = typeof next.vars.h === 'number' ? next.vars.h : null;
        kicker = h === 0 ? t.next.REMOVE_AD.late : h !== null ? fill(t.next.REMOVE_AD.left, { h }) : '';
        tone = h === 0 || (h !== null && h <= 6) ? 'text-[var(--status-risk-strong)]' : 'text-brand';
        title = next.vars.paused ? t.next.REMOVE_AD.pausedTitle : t.next.REMOVE_AD.title;
        sub = t.next.REMOVE_AD.why;
        body = (
          <>
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-text-tertiary break-keep text-pretty" data-testid="deal-remove-lock">
              {t.next.REMOVE_AD.lockNote}
            </p>
            <button type="button" onClick={on.adRemoved} data-testid="deal-ad-removed" className={`mt-3 ${primary}`}>
              {t.buttons.adRemoved}
            </button>
          </>
        );
        break;
      }
      case 'CREDIT_RETURNED':
        kicker = SITE_CONTENT.brokerDeal.strip.DONE;
        tone = 'text-status-good';
        title = t.next.CREDIT_RETURNED.title;
        sub = t.next.CREDIT_RETURNED.sub;
        break;
      case 'WAIT_REVIEW':
      case 'CLOSED':
      case 'RELEASED':
      case 'ENDED_BROKEN':
        kicker = '';
        title = t.next[next.vars.fake ? 'CLOSED_FAKE' : next.kind].title;
        sub = t.next[next.vars.fake ? 'CLOSED_FAKE' : next.kind].sub;
        tone = 'text-text-tertiary';
        break;
      default:
        title = t.next.VISITS_AND_DEAL.title;
    }

  const done = next.kind === 'WAIT_REVIEW' || next.kind === 'CREDIT_RETURNED';
  return (
    <section key={`${next.kind}-${fakeReport ?? ''}`} className="p-4 rounded-2xl bg-surface-card border-2 border-brand-light animate-rise-in" data-testid="deal-next" data-kind={halted ? 'REPORTED' : next.kind}>
      {kicker && <p className={`text-[12px] font-bold ${tone}`}>{kicker}</p>}
      <h2 className="mt-1 text-[17px] font-bold text-text-primary break-keep flex items-center gap-2">
        {done && <CheckCircle2 className="w-5 h-5 text-status-good" aria-hidden />}
        {title}
      </h2>
      {sub && <p className="mt-1 text-[13px] font-medium leading-relaxed text-text-secondary whitespace-pre-line break-keep text-pretty">{sub}</p>}
      {body}
    </section>
  );
}
