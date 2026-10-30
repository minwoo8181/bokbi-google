'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { MAX_MATCH } from '@/lib/requests/stage';
import type { BrokerOffer } from '@/lib/requests/types';
import AnonOfferCard from './AnonOfferCard';

const t = SITE_CONTENT.myRequests;

interface ReceivingSectionProps {
  offers: BrokerOffer[];
  currentYear: number;
  selected: string[];
  onToggle: (offerId: string) => void;
  onOpenReviews: (o: BrokerOffer) => void;
  onChangeFee: () => void;
  onCancel: () => void;
}

/** ① 요청 받는 중: 도착한 익명 요청 카드 (최대 3곳 선택) + 복비 바꿔 다시 요청·요청 취소 */
export default function ReceivingSection({ offers, currentYear, selected, onToggle, onOpenReviews, onChangeFee, onCancel }: ReceivingSectionProps) {
  return (
    <section className="space-y-3" data-testid="stage-receiving">
      <div className="pt-3 px-1">
        <h2 className="text-[17px] font-bold text-text-primary">{t.receiving.sectionTitle}</h2>
        <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.receiving.selectHint}</p>
      </div>
      {offers.length === 0 ? (
        <div className="p-5 rounded-2xl bg-surface-card text-center">
          <p className="text-[15px] font-bold text-text-primary">{t.receiving.empty}</p>
          <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.receiving.emptySub}</p>
        </div>
      ) : (
        offers.map((o) => (
          <AnonOfferCard
            key={o.id}
            offer={o}
            currentYear={currentYear}
            selected={selected.includes(o.id)}
            disabled={selected.length >= MAX_MATCH}
            onToggle={() => onToggle(o.id)}
            onOpenReviews={() => onOpenReviews(o)}
          />
        ))
      )}
      <div className="flex justify-center gap-4">
        <button type="button" onClick={onChangeFee} data-testid="fee-change" className="h-11 text-[13px] font-bold text-text-secondary">
          {t.receiving.changeFee}
        </button>
        <button type="button" onClick={onCancel} className="h-11 text-[13px] font-bold text-text-tertiary">
          {t.receiving.cancelRequest}
        </button>
      </div>
    </section>
  );
}
