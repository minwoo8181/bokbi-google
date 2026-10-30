'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { BrokerOffer, OwnerRequest } from '@/lib/requests/types';
import { dealDateEvents } from '@/lib/calendar';
import {
  cardStrip,
  consequences,
  dealState,
  FEE_NOTE_MAX,
  FEE_REASONS,
  nextAction,
  promiseKept,
  timeline,
  type DealDates,
  type FeeReason,
  type ReportStep,
  type RequestDeals,
} from '@/lib/deal/deal';
import { kstNow } from '@/lib/requests/showing';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { dealFeeWon, feeForPrice } from '@/lib/deal/dealFee';
import AddToCalendarButton from '@/components/common/AddToCalendarButton';
import DealTimeline from '@/components/agent/DealTimeline';
import DealHero, { DEAL_SECTION_TITLE } from '@/components/agent/DealHero';
import AgreementReceipt from '@/components/agent/AgreementReceipt';
import { dealStep } from '@/lib/deal/dealStep';
import DealDatesSheet from '@/components/agent/DealDatesSheet';
import ActionSheet from './ActionSheet';
import ReviewForm from './ReviewForm';
import { fill, formatDateKo } from './format';

const t = SITE_CONTENT.myRequests.deal;
const c = SITE_CONTENT.brokerDeal;
const press = 'active:scale-96 transition-transform duration-fast ease-out-soft';
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

interface OwnerDealPageProps {
  request: OwnerRequest;
  offer: BrokerOffer;
  deals: RequestDeals;
  now: number;
  calendarSavedAt: string | null;
  onAnswer: (step: ReportStep, ok: boolean) => void;
  onCalendarSaved: () => void;
  onOpenOffice: () => void;
  /** ⑥ 계약 완료 카드에서 옮긴 것: 합의 복비 확인, 날짜 대신 넣기, 후기 */
  onFeeAnswer: (kept: boolean, reason?: FeeReason, note?: string) => void;
  onOwnerDates: (next: DealDates) => void;
  onReview: (review: { stars: number; chips: string[] }) => void;
  onClose: () => void;
}

/**
 * 집주인 · 중개사별 거래 페이지 (④, 그릴링 2026-10-25): 사무소 → 기록 → 지금 할 일.
 * 중개사가 알린 것을 맞아요/아니에요로 확인. 다른 사람에게 영향을 주는 확인은 결과를 먼저 보여 준다 (consequences)
 * 방문 일정 저장·취소는 목록 화면의 방문 일정 카드에서 (여기는 기록에만)
 */
export default function OwnerDealPage({
  request,
  offer,
  deals,
  now,
  calendarSavedAt,
  onAnswer,
  onCalendarSaved,
  onOpenOffice,
  onFeeAnswer,
  onOwnerDates,
  onReview,
  onClose,
}: OwnerDealPageProps) {
  const ctx = { request, deals, offerId: offer.id };
  const opts = { calendarSavedAt };
  const at = new Date(now);
  const next = nextAction(ctx, 'OWNER', at, opts);
  const strip = cardStrip(ctx, 'OWNER', at, opts);
  const state = dealState(deals[offer.id] ?? []);
  const [answer, setAnswer] = useState<{ step: ReportStep; ok: boolean } | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  /** 복비 "아니에요" 사유 시트 */
  const [feeNoOpen, setFeeNoOpen] = useState(false);
  const [feeReason, setFeeReason] = useState<FeeReason | null>(null);
  const [feeNote, setFeeNote] = useState('');
  const d = offer.disclosure;
  const step = next.vars.step as ReportStep | undefined;
  const dateLabel = (v: string | number | undefined) => (v ? formatDateKo(String(v)) : '');

  const calendarEvents = () => {
    const events = deals[offer.id] ?? [];
    const dates = { CONTRACT: null, MIDDLE: null, BALANCE: null } as Record<'CONTRACT' | 'MIDDLE' | 'BALANCE', string | null>;
    for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) if (e.kind === 'DATE') dates[e.field] = e.date;
    return dealDateEvents({ requestId: request.id, offerId: offer.id }, dates, { complexName: request.complexName, pyeongLabel: '', dongHo: '', phone: d.phone, officeName: d.officeName }, 'OWNER');
  };

  let kicker = '';
  let title = '';
  let sub = '';
  let tone = 'text-brand';
  let body: React.ReactNode = null;
  switch (next.kind) {
    case 'CONFIRM':
      // "확인해 주세요"는 머리 카드 제목에 이미 있음 (2026-10-27)
      title = step ? t.next.CONFIRM.title[step] : '';
      if (step === 'CONTRACT' && next.vars.contract)
        sub = next.vars.balance
          ? fill(t.next.CONFIRM.dates, { contract: dateLabel(next.vars.contract), balance: dateLabel(next.vars.balance) })
          : `${c.fields.CONTRACT} ${dateLabel(next.vars.contract)}`;
      body = (
        <>
        {/* 중개사가 알린 실제 거래금액 → 합의 비율로 다시 계산한 복비 (맞아요 = 이 금액도 확인) */}
        {state.pendingPriceManwon !== null && (
          <p className="mt-2 p-3 rounded-xl bg-brand-light text-[13px] font-bold text-brand-hover break-keep tabular-nums" data-testid="owner-confirm-price">
            {(() => {
              const f = feeForPrice(request, state.pendingPriceManwon);
              return fill(SITE_CONTENT.dealPrice.confirmLine, { price: formatPriceTenThousand(f.priceManwon), fee: formatWon(f.feeWon), pct: f.ratioPct });
            })()}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => step && setAnswer({ step, ok: false })} data-testid="owner-answer-no" className={`flex-1 h-12 rounded-xl bg-surface-subtle text-text-secondary text-[15px] font-bold ${press}`}>
            {t.next.CONFIRM.no}
          </button>
          <button type="button" onClick={() => step && setAnswer({ step, ok: true })} data-testid="owner-answer-yes" className={`flex-[1.4] h-12 rounded-xl bg-brand text-white text-[15px] font-bold ${press}`}>
            {t.next.CONFIRM.yes}
          </button>
        </div>
        </>
      );
      break;
    case 'SAVE_CALENDAR': {
      kicker = t.next.SAVE_CALENDAR.kicker;
      title = (['contract', 'balance'] as const)
        .filter((k) => next.vars[k])
        .map((k) => `${c.fields[k === 'contract' ? 'CONTRACT' : 'BALANCE']} ${dateLabel(next.vars[k])}`)
        .join(' · ');
      sub = t.next.SAVE_CALENDAR.sub;
      body = (
        <div className="mt-3">
          <AddToCalendarButton events={calendarEvents()} onSaved={onCalendarSaved} variant="solid" label={SITE_CONTENT.calendar.saveAll} testId="owner-deal-calendar" />
        </div>
      );
      break;
    }
    case 'UNTIL_CONTRACT':
    case 'UNTIL_BALANCE':
      kicker = fill(c.dday, { n: next.vars.dday });
      title = fill(t.next[next.kind], { date: dateLabel(next.vars.date) });
      tone = 'text-status-good';
      break;
    case 'CONTRACT_DAY':
    case 'BALANCE_DAY': {
      const dd = Number(next.vars.dday);
      kicker = dateLabel(next.vars.date);
      title = dd < 0 ? t.next[next.kind].passed : dd === 0 ? t.next[next.kind][0] : t.next[next.kind][1];
      sub = dd < 0 ? t.next.dayPassedSub : t.next.dayRemind;
      tone = dd < 0 ? 'text-[var(--status-risk-strong)]' : 'text-text-primary';
      break;
    }
    case 'FEE_CHECK':
      kicker = t.next.FEE_CHECK.kicker;
      // 거래금액이 바뀌었으면 합의 비율로 다시 계산한 금액이 기준 (약속 이행 판정도 이 금액)
      title = fill(t.next.FEE_CHECK.title, { fee: formatWon(dealFeeWon(request, state.priceManwon)) });
      if (state.priceManwon !== null) {
        const f = feeForPrice(request, state.priceManwon);
        sub = fill(SITE_CONTENT.dealPrice.confirmLine, { price: formatPriceTenThousand(f.priceManwon), fee: formatWon(f.feeWon), pct: f.ratioPct });
      }
      body = (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setFeeNoOpen(true)} data-testid="fee-no" className={`flex-1 h-12 rounded-xl bg-surface-subtle text-text-secondary text-[15px] font-bold ${press}`}>
            {t.next.FEE_CHECK.no}
          </button>
          <button type="button" onClick={() => onFeeAnswer(true)} data-testid="fee-yes" className={`flex-[1.4] h-12 rounded-xl bg-brand text-white text-[15px] font-bold ${press}`}>
            {t.next.FEE_CHECK.yes}
          </button>
        </div>
      );
      break;
    case 'OWNER_SET_DATES':
      kicker = t.next.OWNER_SET_DATES.kicker;
      title = t.next.OWNER_SET_DATES.title;
      tone = 'text-[var(--status-risk-strong)]';
      body = (
        <button type="button" onClick={() => setDatesOpen(true)} data-testid="owner-set-dates" className={`mt-3 w-full h-12 rounded-xl bg-brand text-white text-[15px] font-bold ${press}`}>
          {t.next.OWNER_SET_DATES.button}
        </button>
      );
      break;
    case 'WRITE_REVIEW':
      kicker = t.next.WRITE_REVIEW.kicker;
      tone = 'text-status-good';
      title = t.next.WRITE_REVIEW.title;
      sub = t.next.WRITE_REVIEW.sub;
      body = <ReviewForm strengths={offer.strengths} onSubmit={onReview} />;
      break;
    case 'REVIEW_DONE':
      kicker = c.strip.DONE;
      tone = 'text-status-good';
      title = t.next.REVIEW_DONE.title;
      sub = t.next.REVIEW_DONE.sub;
      break;
    case 'CLOSED':
    case 'RELEASED':
    case 'ENDED_BROKEN':
      title = t.next[next.kind].title;
      sub = t.next[next.kind].sub;
      tone = 'text-text-tertiary';
      break;
    default:
      title = t.next.IN_PROGRESS.title;
      sub = t.next.IN_PROGRESS.sub;
  }

  const lines = answer
    ? consequences({ who: 'OWNER', kind: 'ANSWER', step: answer.step, ok: answer.ok }, ctx, at).map((l) => fill(c.consequences[l.key], l.vars ?? {}))
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-surface-page overflow-y-auto" role="dialog" aria-modal="true" aria-label={d.officeName} data-testid="owner-deal-page">
      <div className="max-w-md mx-auto min-h-full px-4 pb-10">
        <header className="sticky top-0 z-10 -mx-4 px-2 h-14 flex items-center bg-surface-page">
          <button type="button" onClick={onClose} aria-label={SITE_CONTENT.brokerAgent.listing.back} className={`w-11 h-11 flex items-center justify-center text-text-primary ${press}`}>
            <ChevronLeft className="w-6 h-6" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold text-text-primary truncate" data-testid="owner-deal-office">{d.officeName}</h1>
        </header>

        {/* 대표님 2026-10-27 A안: 머리 카드 → 지금 할 일 → 합의 확인서 → 기록 (중개사 거래 페이지와 같은 순서) */}
        <DealHero strip={strip} step={dealStep(state.phase, state, !!offer.ad)} viewer="OWNER">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onOpenOffice} className="min-w-0 h-11 inline-flex items-center gap-1 text-[15px] font-bold text-text-secondary">
              {t.officeDetail}
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
            {d.phone && (
              <a href={telHref(d.phone)} className={`shrink-0 h-11 px-4 rounded-xl bg-brand-light text-brand-hover text-[13px] font-bold inline-flex items-center gap-1 ${press}`}>
                <Phone className="w-4 h-4" aria-hidden />
                {t.call}
              </a>
            )}
          </div>
        </DealHero>

        <h2 className={DEAL_SECTION_TITLE}>{c.nextLabel}</h2>
        <section key={next.kind} className="p-4 rounded-2xl bg-surface-card border-2 border-brand-light animate-rise-in" data-testid="owner-deal-next" data-kind={next.kind}>
          {kicker && <p className={`text-[12px] font-bold ${tone}`}>{kicker}</p>}
          <h2 className="mt-1 text-[17px] font-bold text-text-primary break-keep flex items-center gap-2">
            {(next.kind === 'WRITE_REVIEW' || next.kind === 'REVIEW_DONE') && <CheckCircle2 className="w-5 h-5 text-status-good" aria-hidden />}
            {title}
          </h2>
          {sub && <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">{sub}</p>}
          {body}
        </section>
        {/* 복비 답을 한 뒤 한 줄 (약속 이행 기록 안내) */}
        {state.feeKept !== null && next.kind !== 'FEE_CHECK' && (
          <p className={`mt-2 px-1 text-[13px] font-medium break-keep ${state.feeKept ? 'text-status-good' : 'text-text-secondary'}`} data-testid="fee-note">
            {/* 약속 이행에 쌓이는 거래일 때만 그렇게 말한다 (집주인이 날짜를 넣었거나 직접 알린 계약은 안 쌓임) */}
            {state.feeKept
              ? promiseKept(state)
                ? t.next.FEE_THANKS
                : t.next.FEE_THANKS_NO_RECORD
              : state.feeReason === 'OVERCHARGED'
                ? SITE_CONTENT.myRequests.contracted.feeNoNotice
                : t.next.FEE_REASON.thanks}
          </p>
        )}

        <h2 className={DEAL_SECTION_TITLE}>{c.receipt.title}</h2>
        <AgreementReceipt agreed={request} priceManwon={state.priceManwon} pendingPriceManwon={state.pendingPriceManwon} />

        <h2 className={DEAL_SECTION_TITLE}>{c.timelineTitle}</h2>
        <DealTimeline items={timeline(ctx)} now={now} viewer="OWNER" bare />
      </div>

      <ActionSheet
        open={feeNoOpen}
        title={t.next.FEE_REASON.title}
        confirmLabel={t.next.FEE_REASON.submit}
        cancelLabel={t.next.FEE_REASON.cancel}
        confirmDisabled={!feeReason}
        onCancel={() => setFeeNoOpen(false)}
        onConfirm={() => {
          if (!feeReason) return;
          onFeeAnswer(false, feeReason, feeReason === 'OTHER' && feeNote.trim() ? feeNote.trim().slice(0, FEE_NOTE_MAX) : undefined);
          setFeeNoOpen(false);
        }}
        testId="fee-reason-sheet"
      >
        <p className="text-[13px] font-medium text-text-tertiary">{t.next.FEE_REASON.sub}</p>
        <div className="mt-3 space-y-2" role="radiogroup">
          {FEE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={feeReason === r}
              onClick={() => setFeeReason(r)}
              className={`w-full min-h-12 px-4 rounded-xl border-2 text-left text-[15px] font-bold transition-colors duration-base ease-out-soft ${
                feeReason === r ? 'border-brand bg-brand-light text-text-primary' : 'border-border-default text-text-secondary'
              }`}
            >
              {t.next.FEE_REASON.options[r]}
            </button>
          ))}
        </div>
        {feeReason === 'OTHER' && (
          <textarea
            value={feeNote}
            onChange={(e) => setFeeNote(e.target.value.slice(0, FEE_NOTE_MAX))}
            maxLength={FEE_NOTE_MAX}
            rows={2}
            placeholder={t.next.FEE_REASON.notePlaceholder}
            data-testid="fee-note-input"
            className="mt-2 w-full px-4 py-3 rounded-xl bg-surface-subtle text-[15px] text-text-primary resize-none animate-rise-in"
          />
        )}
        {feeReason === 'OVERCHARGED' && <p className="mt-2 text-[13px] font-medium text-text-secondary break-keep">{SITE_CONTENT.myRequests.contracted.feeNoNotice}</p>}
      </ActionSheet>

      {datesOpen && (
        <DealDatesSheet
          current={state.dates}
          today={kstNow(at).date}
          onSave={(d) => {
            onOwnerDates(d);
            setDatesOpen(false);
          }}
          onClose={() => setDatesOpen(false)}
        />
      )}

      <ActionSheet
        open={!!answer}
        title={answer ? (answer.ok ? t.answerSheet.title[answer.step] : t.answerSheet.noTitle) : ''}
        confirmLabel={answer?.ok ? t.answerSheet.yes : t.answerSheet.no}
        cancelLabel={t.answerSheet.cancel}
        tone={answer?.ok ? 'brand' : 'risk'}
        onConfirm={() => {
          if (answer) onAnswer(answer.step, answer.ok);
          setAnswer(null);
        }}
        onCancel={() => setAnswer(null)}
        testId="owner-answer-sheet"
      >
        <ul className="space-y-2">
          {lines.map((l) => (
            <li key={l} className="text-[15px] font-medium text-text-secondary break-keep flex gap-2">
              <span aria-hidden className="text-text-tertiary">·</span>
              {l}
            </li>
          ))}
        </ul>
      </ActionSheet>
    </div>
  );
}
