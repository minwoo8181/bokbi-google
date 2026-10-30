'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import PromiseLevel from '@/components/common/PromiseLevel';
import { maskVariant } from '@/lib/requests/blindMask';
import { endorsementCount, ownerEndorsedChips, trustBadges } from '@/lib/requests/stage';
import type { BrokerOffer } from '@/lib/requests/types';
import { fill } from './format';

interface AnonOfferCardProps {
  offer: BrokerOffer;
  currentYear: number;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onOpenReviews: () => void;
}

/**
 * 매칭 전 익명 요청 카드 (헤이딜러식 블러 상호).
 * 가려진 상호는 실제 이름이 아니라 가짜 글자를 블러 처리한 것 — 길이는 요청 id로 3가지 중 하나 (글자 수로 짐작 못 하게).
 * 카드 어디를 눌러도 선택, 오른쪽 위 동그라미 체크가 상태 표시 겸 키보드용 버튼.
 * 파랑 = 우리가 확인한 배지, 회색 = 중개사가 고른 잘하는 점
 */
export default function AnonOfferCard({ offer, currentYear, selected, disabled, onToggle, onOpenReviews }: AnonOfferCardProps) {
  const t = SITE_CONTENT.myRequests.receiving;
  const sc = SITE_CONTENT.brokerStrengths.card;
  const b = trustBadges(offer, currentYear);
  const locked = disabled && !selected;
  const toggle = () => {
    if (!locked) onToggle();
  };

  const verified: string[] = [];
  if (b.ageBand) verified.push(t.ageBand[b.ageBand]);
  if (b.agentBand) verified.push(t.agentBand[b.agentBand]);
  if (offer.distanceBand) verified.push(t.distanceBand[offer.distanceBand]);
  if (b.firstDeal) verified.push(t.firstDeal);

  return (
    <article
      data-testid={`offer-card-${offer.order}`}
      onClick={toggle}
      className={`p-5 rounded-2xl bg-surface-card border-2 transition-colors ${selected ? 'border-brand' : 'border-transparent'} ${
        locked ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-bold text-text-primary min-w-0 truncate" data-testid={`offer-name-${offer.order}`}>
              <span className="sr-only">{t.maskedNameSr}</span>
              <span className="inline-block blur-[5px] select-none pointer-events-none" aria-hidden>
                {t.maskFillers[maskVariant(offer.id)]}
              </span>{' '}
              {t.maskedName}
            </h3>
          </div>
          <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.lockedNote}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          disabled={locked}
          aria-pressed={selected}
          aria-label={selected ? t.selectedButton : t.selectButton}
          data-testid={`offer-select-${offer.order}`}
          className="flex-shrink-0 -m-2 w-11 h-11 flex items-center justify-center"
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              selected ? 'bg-brand text-white' : locked ? 'border-2 border-border-default bg-surface-subtle' : 'border-2 border-text-disabled'
            }`}
          >
            {selected && <Check className="w-4 h-4 stroke-[3]" aria-hidden />}
          </span>
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="확인된 정보">
        {verified.map((v) => (
          <li key={v} className="px-2 py-1 rounded-md bg-brand-light text-brand-hover text-[13px] font-bold">
            {v}
          </li>
        ))}
        {b.promise && (
          <li>
            <PromiseLevel level={(b.promise.tier + 1) as 2 | 3 | 4} suffix={fill(t.promise, { kept: b.promise.kept })} testId={`offer-promise-${offer.order}`} />
          </li>
        )}
        {b.review && (
          <li>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReviews();
              }}
              data-testid={`offer-reviews-${offer.order}`}
              className="inline-flex items-center px-2 py-1 rounded-md bg-brand-light text-brand-hover text-[13px] font-bold"
            >
              {b.review.average !== null
                ? fill(t.reviewAverage, { average: b.review.average.toFixed(1), count: b.review.count })
                : fill(t.reviewCount, { count: b.review.count })}
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          </li>
        )}
      </ul>

      {offer.strengths.length > 0 && (
        <div className="mt-3">
          <p className="text-[13px] font-bold text-text-secondary">{t.strengthsTitle}</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label={sc.selfNote}>
            {offer.strengths.map((s) => {
              const n = endorsementCount(s, offer.review.chipCounts, SITE_CONTENT.brokerStrengths.endorsedBy);
              return (
                <li key={s} className="px-2 py-1 rounded-md bg-surface-subtle text-text-secondary text-[13px] font-medium">
                  {s}
                  {n > 0 && <span className="ml-1 font-bold text-brand">{fill(sc.endorsed, { n })}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {(offer.conditions?.length ?? 0) > 0 && (
        <p className="mt-2 text-[13px] font-medium text-text-secondary break-keep" data-testid="offer-conditions">
          <span className="font-bold text-text-primary">{sc.conditions}</span> {offer.conditions!.join(' · ')}
        </p>
      )}
      <EndorsedChips offer={offer} />
    </article>
  );
}

/** 집주인이 인정한 장점: 처음엔 접힘, 펼치면 후기 칩 많이 고른 순 5개 + 개수 (3곳 나란히 비교용, 대표님 2026-10-29) */
function EndorsedChips({ offer }: { offer: BrokerOffer }) {
  const t = SITE_CONTENT.myRequests.receiving;
  const [open, setOpen] = useState(false);
  const chips = ownerEndorsedChips(offer.review.chipCounts, offer.strengths, SITE_CONTENT.brokerStrengths.endorsedBy);
  if (chips.length === 0) return null;
  return (
    <div className="mt-3 pt-1 border-t border-border-light" data-testid={`offer-endorsed-${offer.order}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-full min-h-[44px] flex items-center justify-between text-[13px] font-bold text-text-secondary"
      >
        {fill(t.endorsedTitle, { n: chips.length })}
        <span className="inline-flex items-center gap-1 text-brand">
          {open ? t.endorsedCollapse : t.endorsedExpand}
          <ChevronDown className={`w-4 h-4 transition-transform duration-fast ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && (
        <ul className="pb-1 flex flex-wrap gap-2">
          {chips.map(([c, n]) => (
            <li key={c} className="px-2 py-1 rounded-md bg-surface-subtle text-text-secondary text-[13px] font-medium">
              {c}
              <span className="ml-1 font-bold text-brand tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
