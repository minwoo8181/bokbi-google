'use client';

import React from 'react';
import { ExternalLink, MapPin, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { AdState } from '@/lib/requests/stage';
import type { BrokerOffer } from '@/lib/requests/types';
import StatusPill from '@/components/common/StatusPill';
import { fill } from './format';

interface MatchedBrokerCardProps {
  offer: BrokerOffer;
  ad: AdState;
  onRelease: () => void;
  onOpenDetail: () => void;
}

/**
 * 매칭 확정 뒤 카드 위쪽 (2026-10-27 대표님 정리): 사무소 이름 + 위치 아이콘(누르면 지도·주소·전화·문자) + 전화 동그라미
 * + 광고 상태 알약. 켜고 끄는 스위치처럼 보이면 집주인이 광고를 조절한다고 오해해서, 상태만 보여 주고 광고 중일 때만 링크
 */
export default function MatchedBrokerCard({ offer, ad, onRelease, onOpenDetail }: MatchedBrokerCardProps) {
  const t = SITE_CONTENT.myRequests.inProgress;
  const d = offer.disclosure;
  return (
    <article className="p-5 pb-3 bg-surface-card" data-testid={`matched-${offer.order}`}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpenDetail} data-testid={`office-detail-${offer.order}`} className="min-w-0 text-left">
          <span className="flex items-center gap-1 text-[17px] font-bold text-text-primary break-keep">
            {d.officeName}
            <MapPin className="w-4 h-4 text-brand flex-shrink-0" aria-label={t.detail} />
          </span>
          {/* 목업에서 중개사 화면이 보낸 카드는 대표자·주소가 비어 있다 (명단은 서버에만) */}
          {(d.ceoName || d.address) && (
            <span className="mt-1 block text-[13px] font-medium text-text-tertiary break-keep">
              {[d.ceoName && `${d.ceoName} 대표`, d.address].filter(Boolean).join(' · ')}
            </span>
          )}
        </button>
        <a
          href={`tel:${d.phone}`}
          aria-label={`${d.officeName} ${t.call}`}
          className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-light text-brand-hover flex items-center justify-center"
        >
          <Phone className="w-5 h-5" />
        </a>
      </div>

      <div className="mt-3">
        {ad.kind === 'LIVE' && offer.ad && (
          <StatusPill tone="GOOD" href={offer.ad.url} testId={`ad-link-${offer.order}`}>
            {fill(t.adLive, { day: ad.day })} · {t.adView}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </StatusPill>
        )}
        {ad.kind === 'PENDING' && (
          <div>
            <StatusPill tone="WAIT">{fill(t.adPending, { hours: ad.hoursLeft })}</StatusPill>
            <p className="mt-2 pl-1 text-[13px] font-medium text-text-tertiary">{t.adPendingNote}</p>
          </div>
        )}
        {ad.kind === 'OVERDUE' && (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <StatusPill tone="RISK">{t.adOverdue}</StatusPill>
              {offer.delayNote && (
                <span className="mt-1 block pl-1 text-[13px] font-medium text-text-secondary break-keep" data-testid={`delay-note-${offer.order}`}>
                  {fill(t.delayNote, { reason: SITE_CONTENT.brokerAgent.listing.delay.reasons[offer.delayNote.reason] })}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={onRelease}
              data-testid={`release-${offer.order}`}
              className="h-11 px-3 rounded-xl border border-status-risk text-[var(--status-risk-strong)] text-[13px] font-bold flex-shrink-0"
            >
              {t.release}
            </button>
          </div>
        )}
        {ad.kind === 'CHECKING' && (
          <StatusPill tone="CAUTION" testId={`checking-${offer.order}`}>
            {t.adChecking}
          </StatusPill>
        )}
        {ad.kind === 'PAUSED' && <StatusPill tone="WAIT">{t.adPaused}</StatusPill>}
      </div>
    </article>
  );
}
