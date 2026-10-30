'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import type { OwnerRequest } from '@/lib/requests/types';
import { fill } from './format';

interface RequestSummaryDetailProps {
  request: OwnerRequest;
  /** 열람한 동·호수 (매칭 확정 뒤 화면 진입 때 1번). null이면 가려진 값 */
  dongHo: string | null;
}

/**
 * 나의 매칭 요청 펼친 내용 (2026-10-27 대표님: 따로 있던 카드를 현황판 안 접기/펴기로 합침).
 * 현황판 아래 "나의 매칭 요청" 줄을 누르면 열린다. 동·호수는 매칭 확정 전에는 가려진 값
 */
export default function RequestSummaryDetail({ request, dongHo }: RequestSummaryDetailProps) {
  const t = SITE_CONTENT.myRequests.summary;
  const saved = request.legalMaxWon - request.commissionWon;

  return (
    // 제목·단지 이름은 바로 위 "나의 매칭 요청" 줄에 있어 여기서는 나머지만
    <div className="space-y-2" data-testid="request-summary-detail">
      <p className="text-[13px] font-medium text-text-secondary break-keep">
        {request.pyeongLabel} · {request.tradeType} · {dongHo ?? request.maskedDongHo} · {request.floorLabel}
      </p>
      <div className="pt-2 flex justify-between items-baseline">
        <span className="text-[13px] font-medium text-text-secondary">{t.askingPrice}</span>
        <span className="text-[15px] font-bold text-text-primary tabular-nums">{formatPriceTenThousand(request.askingPriceManwon)}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[13px] font-medium text-text-secondary">{t.commission}</span>
        <span className="text-[17px] font-extrabold text-brand tabular-nums">{formatWon(request.commissionWon)}</span>
      </div>
      {saved > 0 && (
        <p className="text-right text-[13px] font-medium text-text-tertiary">{fill(t.savedLine, { amount: formatWon(saved) })}</p>
      )}
    </div>
  );
}
