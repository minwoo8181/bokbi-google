'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { adState } from '@/lib/requests/stage';
import type { BrokerOffer, OwnerRequest } from '@/lib/requests/types';
import type { ShowingAvailability } from '@/lib/requests/showing';
import type { CardStrip, TimelineItem } from '@/lib/deal/deal';
import { ownerVisitEvent } from '@/lib/calendar';
import AddToCalendarButton from '@/components/common/AddToCalendarButton';
import DealNewsRow from '@/components/agent/DealNewsRow';
import { stripText } from '@/components/agent/DealStrip';
import { ChevronRight } from 'lucide-react';
import { CARD_HIDDEN_STRIPS, STATUS_DOT } from '@/components/common/StatusPill';
import { CARD_ACTION } from '@/components/common/cardStyles';
import { fill, SECTION_COUNT } from './format';
import AdRemovalCard from './AdRemovalCard';
import MatchedBrokerCard from './MatchedBrokerCard';
import ShowingScheduleCard from './ShowingScheduleCard';
import SaleStatusCard from './SaleStatusCard';

const t = SITE_CONTENT.myRequests;

export interface OwnerStripRow {
  offer: BrokerOffer;
  strip: CardStrip;
  news: TimelineItem[];
}

interface InProgressSectionProps {
  view: OwnerRequest;
  now: number;
  today: string;
  /** 열람한 세입자 전화 (화면 진입 때 1번, 없으면 '') */
  tenantPhone: string;
  /** 매칭 중개사 카드 (할 일·새 소식이 있는 카드가 위) */
  rows: OwnerStripRow[];
  matched: BrokerOffer[];
  removal: { done: number; total: number } | null;
  /** 광고 내림 확인 카드 아래 한 줄 (다른 곳과 진행 / 잠시 멈춤) */
  removalSub?: string;
  lockedLabel: string | null;
  onRelease: (o: BrokerOffer) => void;
  onOpenOffice: (o: BrokerOffer) => void;
  onOpenDeal: (offerId: string) => void;
  onShowingChange: (showing: ShowingAvailability) => void;
  onCancelVisit: (id: string) => void;
  onAckCanceled: (id: string) => void;
  sale: Omit<React.ComponentProps<typeof SaleStatusCard>, 'paused' | 'lockedUntilLabel' | 'matched' | 'agreed'>;
}

/** ② 진행중: 광고 내림 확인 → 매칭 중개사 카드(색 띠·새 소식) → 방문 일정 → 판매 상태 */
export default function InProgressSection({
  view,
  now,
  today,
  tenantPhone,
  rows,
  matched,
  removal,
  removalSub = t.deal.adRemovalSub,
  lockedLabel,
  onRelease,
  onOpenOffice,
  onOpenDeal,
  onShowingChange,
  onCancelVisit,
  onAckCanceled,
  sale,
}: InProgressSectionProps) {
  /** 새 소식 줄 오른쪽 버튼: 최신 소식이 앞으로의 방문이면 캘린더에 저장 */
  const newsAction = (o: BrokerOffer, news: TimelineItem[]) => {
    const top = news[0];
    if (!top || top.kind !== 'VISIT' || top.canceled || top.date < today) return null;
    return (
      <AddToCalendarButton
        event={ownerVisitEvent(top, { officeName: o.disclosure.officeName, officePhone: o.disclosure.phone, complexName: view.complexName })}
        testId="news-calendar"
      />
    );
  };
  return (
    <section className="space-y-3" data-testid="stage-in-progress">
      {/* 다른 곳으로 정리됐거나 잠시 멈췄을 때 중개사들의 광고 내림 확인 */}
      <AdRemovalCard removal={removal} sub={removalSub} />
      {/* 7일 잠금 안내는 판매 상태 스위치 옆 한 곳에만 */}
      <h2 id="owner-brokers" className="pt-3 px-1 flex items-center gap-2 text-[17px] font-bold text-text-primary scroll-mt-4">
        {t.inProgress.brokersTitle}
        <span className={SECTION_COUNT}>
          {fill(t.inProgress.brokersCount, { n: rows.length })}
        </span>
      </h2>
      {rows.map(({ offer: o, strip, news }) => {
        const { label } = stripText(strip);
        return (
          // 새 소식이 있는 카드는 맨 위 + 테두리 강조. 할 일(빨강·노랑)은 위 "지금 확인할 일"에만 (2026-10-27)
          <div
            key={o.id}
            className={`rounded-2xl bg-surface-card overflow-hidden transition-shadow duration-base ease-out-soft ${news.length > 0 ? 'ring-2 ring-brand' : ''}`}
            data-tone={strip.tone}
            data-has-news={news.length > 0}
          >
            <MatchedBrokerCard offer={o} ad={adState(o, view, now)} onRelease={() => onRelease(o)} onOpenDetail={() => onOpenOffice(o)} />
            <DealNewsRow news={news} viewer="OWNER" now={now} action={newsAction(o, news)} />
            <div className="px-5 pb-5 pt-2">
              {/* 위 섹션·광고 알약과 겹치지 않는 진행 상태만 한 줄 (계약일·가계약·멈춤 등) */}
              {!CARD_HIDDEN_STRIPS.has(strip.key) && strip.tone !== 'ACTION' && (
                <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-text-secondary break-keep" data-testid={`card-status-${o.order}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[strip.tone]}`} aria-hidden />
                  {label}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpenDeal(o.id)}
                data-testid={`owner-deal-open-${o.order}`}
                className={CARD_ACTION}
              >
                {t.inProgress.dealButton}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
      {!view.paused && (
        <ShowingScheduleCard
          occupancy={view.occupancy}
          availability={view.showing}
          visits={view.visits}
          offers={view.offers}
          complexName={view.complexName}
          tenantPhone={tenantPhone}
          today={today}
          onChange={onShowingChange}
          onCancelVisit={onCancelVisit}
          onAckCanceled={onAckCanceled}
        />
      )}
      <SaleStatusCard paused={!!view.paused} lockedUntilLabel={lockedLabel} matched={matched} agreed={view} {...sale} />
    </section>
  );
}
