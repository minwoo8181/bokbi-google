'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ExternalLink, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { checkDealPrice, dealFeeWon } from '@/lib/deal/dealFee';
import DealPriceField from '@/components/common/DealPriceField';
import type { DelayReason, OwnerRequest } from '@/lib/requests/types';
import type { SentRequest } from '@/lib/broker/feed';
import { myOffer } from '@/lib/broker/listing';
import { dealDateEvents } from '@/lib/calendar';
import {
  cardStrip,
  checkReport,
  consequences,
  dealPhase,
  dealState,
  nextAction,
  timeline,
  type DealDates,
  type ReportStep,
  type RequestDeals,
} from '@/lib/deal/deal';
import type { VisitRejectReason } from '@/lib/requests/showing';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, formatDateKo } from '@/components/my-requests/format';
import DealTimeline from './DealTimeline';
import DealNextCard, { AdForm, telHref } from './DealNextCard';
import DealDatesSheet from './DealDatesSheet';
import DealHero, { DEAL_SECTION_TITLE } from './DealHero';
import AgreementReceipt from './AgreementReceipt';
import { CARD_ACTION } from '@/components/common/cardStyles';
import { dealStep } from '@/lib/deal/dealStep';
import VisitScheduleSection from './VisitScheduleSection';
import { useContactReveal } from '@/components/data/useContactReveal';

const t = SITE_CONTENT.brokerDeal;
const l = SITE_CONTENT.brokerAgent.listing;
const press = 'active:scale-96 transition-transform duration-fast ease-out-soft';

interface DealPageProps {
  request: OwnerRequest;
  sent: SentRequest;
  deals: RequestDeals;
  now: number;
  today: string;
  calendarSavedAt: string | null;
  onOwnerCheck: (how: 'CONFIRMED' | 'CALL_CONFIRMED') => void;
  onPostAd: (url: string) => void;
  onReportFake: () => void;
  onDelay: (reason: DelayReason) => void;
  /** 가계약·계약은 실제 거래금액(만 원)을 함께 */
  onReport: (step: ReportStep, priceManwon?: number) => void;
  onSaveDates: (next: DealDates) => void;
  onAdRemoved: () => void;
  onCalendarSaved: () => void;
  onSaveVisit: (date: string, hour: number) => VisitRejectReason | null;
  onCancelVisit: (visitId: string) => void;
  onAckVisit: (visitId: string) => void;
  onClose: () => void;
}

type Sheet = 'NONE' | 'DATES' | 'VISITS' | 'AD' | 'FAKE' | { report: ReportStep };

/**
 * 중개사 거래 페이지 (그릴링 2026-10-25): 집 정보 한 줄 → 기록 → 지금 할 일 → 자주 쓰는 것.
 * 규칙은 src/lib/deal/deal.ts. 다른 사람에게 영향을 주는 보고는 확인 창에서 결과를 먼저 보여 준다
 */
export default function DealPage(p: DealPageProps) {
  const { request, sent, deals, now } = p;
  const offer = myOffer(request, sent);
  const ctx = { request, deals, offerId: sent.offerId };
  const state = dealState(deals[sent.offerId] ?? []);
  const phase = dealPhase(ctx);
  const opts = { calendarSavedAt: p.calendarSavedAt, ownerChecked: !!sent.ownerCheck };
  const next = nextAction(ctx, 'BROKER', new Date(now), opts);
  const strip = cardStrip(ctx, 'BROKER', new Date(now), opts);
  const [sheet, setSheet] = useState<Sheet>('NONE');
  const [datesNotice, setDatesNotice] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  /** 가계약·계약 알림에 넣는 실제 거래금액 (만 원, 처음엔 확정 금액 또는 희망가) */
  const [price, setPrice] = useState<number | null>(state.priceManwon ?? request.askingPriceManwon);
  const feeWon = dealFeeWon(request, state.priceManwon);
  // 동·호수·연락처는 열람으로만 (페이지 진입 1번, 열람 기록). 아래 카드·방문 일정은 이 값을 받아 씀
  const revealed = useContactReveal(request, 'MATCHED_BROKER', true);
  const contact = revealed.contact;
  const dongHo = revealed.dongHo ?? request.maskedDongHo;
  const tenant = request.occupancy === 'TENANT';
  const pyeong = request.pyeongLabel.split(' · ')[0];
  const calendarEvents = dealDateEvents({ requestId: request.id, offerId: sent.offerId }, state.dates, {
    complexName: request.complexName,
    pyeongLabel: pyeong,
    dongHo,
    phone: contact?.ownerPhone ?? '',
  });
  /** 내가 낸 허위 매물 신고 (반려되면 평소대로, fakeReport.ts) */
  const myReport = offer?.fakeReport?.status ?? null;
  const closed = phase === 'CLOSED_ELSEWHERE' || phase === 'RELEASED' || phase === 'BROKEN' || phase === 'DONE' || myReport === 'PENDING' || myReport === 'CONFIRMED';

  /** 보고 버튼: 날짜가 모자라면 날짜 시트부터, 아니면 확인 창 */
  const report = (step: ReportStep) => {
    const reject = checkReport(phase, state, step);
    if (reject === 'NEED_CONTRACT_DATE' || reject === 'NEED_BALANCE_DATE') {
      setDatesNotice(fill(t.dates.needFirst, { field: t.fields[reject === 'NEED_CONTRACT_DATE' ? 'CONTRACT' : 'BALANCE'] }));
      setSheet('DATES');
      return;
    }
    if (reject) return;
    setSheet({ report: step });
  };

  const reportSheet = typeof sheet === 'object' ? sheet.report : null;
  const withPrice = reportSheet === 'PROVISIONAL' || reportSheet === 'CONTRACT';
  const priceReject = withPrice ? checkDealPrice(price, request.askingPriceManwon) : null;
  const lines = reportSheet ? consequences({ who: 'BROKER', kind: 'REPORT', step: reportSheet }, ctx, new Date(now)) : [];
  const lineText = (key: (typeof lines)[number]['key'], vars: Record<string, string | number> = {}) => {
    if (key === 'CHECK_DATES') {
      const contract = vars.contract ? formatDateKo(String(vars.contract)) : '';
      return vars.balance
        ? fill(t.consequences.CHECK_DATES, { contract, balance: formatDateKo(String(vars.balance)) })
        : fill(t.consequences.CHECK_DATES_NO_BALANCE, { contract });
    }
    return fill(t.consequences[key], vars);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-page overflow-y-auto" role="dialog" aria-modal="true" aria-label={request.complexName} data-testid="listing-panel">
      <div className="max-w-md mx-auto min-h-full px-4 pb-10">
        <header className="sticky top-0 z-10 -mx-4 px-2 h-14 flex items-center bg-surface-page">
          <button type="button" onClick={p.onClose} aria-label={l.back} className={`w-11 h-11 flex items-center justify-center text-text-primary ${press}`}>
            <ChevronLeft className="w-6 h-6" aria-hidden />
          </button>
          <h1 className="text-[17px] font-bold text-text-primary truncate">{request.complexName}</h1>
        </header>

        {/* 대표님 2026-10-27 A안: 머리 카드(구분선 아래 집 정보 한 줄 + 전화, 나머지는 펼치기) → 지금 할 일 → 합의 확인서 → 기록 → 자주 쓰는 것 */}
        <DealHero strip={strip} step={dealStep(phase, state, !!offer?.ad)} viewer="BROKER">
          <div data-testid="deal-info">
            <p className="text-[13px] font-medium text-text-secondary" data-testid="deal-info-fee">
              {request.tradeType} · {pyeong} ·{' '}
              {state.priceManwon === null
                ? formatWon(request.commissionWon)
                : fill(SITE_CONTENT.dealPrice.infoLine, { price: formatPriceTenThousand(state.priceManwon), fee: formatWon(feeWon) })}
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="min-w-0 text-[15px] font-bold text-text-primary break-keep" data-testid="deal-address">
                {dongHo}
                {contact?.ownerName && <span className="font-medium text-text-secondary"> · {l.owner} {contact.ownerName}</span>}
              </p>
              {contact?.ownerPhone && (
                <a href={telHref(contact.ownerPhone)} className={`shrink-0 h-11 px-4 rounded-xl bg-brand-light text-brand-hover text-[13px] font-bold inline-flex items-center gap-1 ${press}`}>
                  <Phone className="w-4 h-4" aria-hidden />
                  {l.call}
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              aria-expanded={infoOpen}
              data-testid="deal-info-toggle"
              className="mt-1 h-10 inline-flex items-center gap-1 text-[13px] font-bold text-text-tertiary"
            >
              {infoOpen ? t.info.less : t.info.more}
              <ChevronDown className={`w-4 h-4 transition-transform duration-base ease-out-soft ${infoOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {infoOpen && (
              <div className="divide-y divide-border-light animate-rise-in">
                {tenant && contact?.tenantPhone && (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <p className="text-[15px] font-bold text-text-primary">
                      {l.tenant} {contact.tenantPhone}
                    </p>
                    <a href={telHref(contact.tenantPhone)} className={`shrink-0 h-11 px-4 rounded-xl bg-surface-subtle text-text-primary text-[13px] font-bold inline-flex items-center gap-1 ${press}`}>
                      <Phone className="w-4 h-4" aria-hidden />
                      {l.call}
                    </a>
                  </div>
                )}
                {contact?.visitMemo && (
                  <div className="py-2">
                    <p className="text-[12px] font-medium text-text-tertiary">{l.visitMemo}</p>
                    <p className="text-[13px] font-medium text-text-primary break-keep">{contact.visitMemo}</p>
                  </div>
                )}
                {contact?.optionMemo && (
                  <div className="py-2">
                    <p className="text-[12px] font-medium text-text-tertiary">{l.optionMemo}</p>
                    <p className="text-[13px] font-medium text-text-primary break-keep">{contact.optionMemo}</p>
                  </div>
                )}
                <p className="py-2 text-[12px] font-medium text-text-tertiary break-keep">{l.revealedSub}</p>
              </div>
            )}
          </div>
        </DealHero>

        <h2 className={DEAL_SECTION_TITLE}>{t.nextLabel}</h2>
        <DealNextCard
          next={next}
          phase={phase}
          request={request}
          ownerPhone={contact?.ownerPhone ?? ''}
          delayReason={offer?.delayNote?.reason ?? null}
          fakeReport={myReport}
          calendarEvents={calendarEvents}
          on={{
            ownerCheck: p.onOwnerCheck,
            reportFake: () => setSheet('FAKE'),
            postAd: p.onPostAd,
            delay: p.onDelay,
            report,
            openDates: () => {
              setDatesNotice(null);
              setSheet('DATES');
            },
            openVisits: () => setSheet('VISITS'),
            adRemoved: p.onAdRemoved,
            calendarSaved: p.onCalendarSaved,
          }}
        />

        <h2 className={DEAL_SECTION_TITLE}>{t.receipt.title}</h2>
        <AgreementReceipt agreed={request} priceManwon={state.priceManwon} pendingPriceManwon={state.pendingPriceManwon} />

        <h2 className={DEAL_SECTION_TITLE}>{t.timelineTitle}</h2>
        <DealTimeline items={timeline(ctx)} now={now} bare />

        {/* 자주 쓰는 것: 카드 이동 버튼과 같은 연한 파랑 (진한 버튼은 지금 할 일 하나) */}
        {!closed && (
          <section data-testid="deal-shortcuts">
            <h2 className={DEAL_SECTION_TITLE}>{t.shortcuts.title}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSheet('VISITS')} data-testid="deal-shortcut-visits" className={CARD_ACTION}>
                {t.shortcuts.visits}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatesNotice(null);
                  setSheet('DATES');
                }}
                data-testid="deal-shortcut-dates"
                className={CARD_ACTION}
              >
                {t.shortcuts.dates}
              </button>
              <Link href={`/agent/terms?request=${encodeURIComponent(request.id)}`} data-testid="listing-terms" className={CARD_ACTION}>
                {t.shortcuts.terms}
              </Link>
              {offer?.ad && (
                <button type="button" onClick={() => setSheet('AD')} className={CARD_ACTION}>
                  {t.shortcuts.adLink}
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* 보고 확인 창: 무슨 일이 생기는지 먼저 (중개사 쪽엔 다른 중개사 이야기 없음) */}
      <ActionSheet
        open={!!reportSheet}
        title={reportSheet ? t.reportSheet.title[reportSheet] : ''}
        confirmLabel={t.reportSheet.confirm}
        cancelLabel={t.reportSheet.cancel}
        confirmDisabled={priceReject !== null}
        onConfirm={() => {
          if (!reportSheet || priceReject) return;
          p.onReport(reportSheet, withPrice && price !== null ? price : undefined);
          setSheet('NONE');
        }}
        onCancel={() => setSheet('NONE')}
        tone={reportSheet === 'BROKEN' ? 'risk' : 'brand'}
        testId="deal-report-sheet"
      >
        <ul className="space-y-2">
          {lines.map((x) => (
            <li key={x.key} className="text-[15px] font-medium text-text-secondary break-keep flex gap-2">
              <span aria-hidden className="text-text-tertiary">·</span>
              {lineText(x.key, x.vars)}
            </li>
          ))}
        </ul>
        {/* 가계약·계약: 실제 거래금액 → 합의 비율로 다시 계산한 복비 (집주인이 맞아요로 확인) */}
        {withPrice && <DealPriceField agreed={request} value={price} onChange={setPrice} />}
      </ActionSheet>

      {sheet === 'DATES' && (
        <DealDatesSheet
          current={state.dates}
          today={p.today}
          notice={datesNotice}
          onSave={(d) => {
            p.onSaveDates(d);
            setSheet('NONE');
          }}
          onClose={() => setSheet('NONE')}
        />
      )}

      <ActionSheet open={sheet === 'VISITS'} title={t.shortcuts.visits} cancelLabel={t.reportSheet.cancel} onCancel={() => setSheet('NONE')} testId="deal-visits-sheet">
        {offer && (
          <VisitScheduleSection
            request={request}
            dongHo={dongHo}
            contact={contact}
            offerId={offer.id}
            today={p.today}
            now={now}
            onSave={p.onSaveVisit}
            onCancel={p.onCancelVisit}
            onAck={p.onAckVisit}
          />
        )}
      </ActionSheet>

      <ActionSheet open={sheet === 'AD'} title={l.ad.title} cancelLabel={t.reportSheet.cancel} onCancel={() => setSheet('NONE')}>
        {offer?.ad && (
          <a href={offer.ad.url} target="_blank" rel="noopener noreferrer" className="h-11 px-4 rounded-xl bg-status-good-light text-[var(--status-good-strong)] text-[13px] font-bold inline-flex items-center gap-1">
            {l.ad.openLink}
            <ExternalLink className="w-4 h-4" aria-hidden />
          </a>
        )}
        <AdForm
          onPostAd={(url) => {
            p.onPostAd(url);
            setSheet('NONE');
          }}
        />
      </ActionSheet>

      <ActionSheet
        open={sheet === 'FAKE'}
        testId="fake-sheet"
        tone="risk"
        title={l.fakeSheet.title}
        confirmLabel={l.fakeSheet.confirm}
        cancelLabel={l.fakeSheet.cancel}
        onConfirm={() => {
          setSheet('NONE');
          p.onReportFake();
        }}
        onCancel={() => setSheet('NONE')}
      >
        <p className="text-[15px] font-medium text-text-secondary break-keep whitespace-pre-line">{l.fakeSheet.body}</p>
      </ActionSheet>
    </div>
  );
}
