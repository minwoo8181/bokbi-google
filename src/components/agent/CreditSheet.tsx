'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { WEEKLY_CREDITS } from '@/lib/broker/credits';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerAgent.creditSheet;

interface CreditSheetProps {
  balance: number;
  /** 다음 채움 날짜 (표시용, 예: 11월 2일 (월)) */
  refillLabel: string;
  onMoreCredits: () => void;
  onHistory: () => void;
  onClose: () => void;
}

/** 상단 "크레딧 n" 칩을 누르면: 쓰는 법·다음 채움 + 크레딧 더 받기·내역 (대표님 2026-10-26, 하루 남은 요청 줄은 2026-10-29 하루 제한과 함께 뺌) */
export default function CreditSheet({ balance, refillLabel, onMoreCredits, onHistory, onClose }: CreditSheetProps) {
  const row = 'mt-2 w-full h-12 px-4 rounded-xl bg-surface-subtle flex items-center justify-between text-[15px] font-bold text-text-primary active:scale-96 transition-transform duration-fast ease-out-soft';
  return (
    <ActionSheet open testId="credit-sheet" title={fill(t.title, { n: balance })} cancelLabel={t.close} onCancel={onClose}>
      <div className="-mt-1 space-y-1 text-[15px] font-medium text-text-secondary break-keep">
        <p>{t.perRequest}</p>
        <p>{fill(balance >= WEEKLY_CREDITS ? t.refillFull : t.refill, { date: refillLabel, n: WEEKLY_CREDITS })}</p>      </div>
      <div className="mt-4">
        <button type="button" onClick={onMoreCredits} data-testid="credit-sheet-more" className={row}>
          {SITE_CONTENT.brokerAgent.moreCredits.button}
          <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden />
        </button>
        <button type="button" onClick={onHistory} data-testid="credit-sheet-history" className={row}>
          {t.history}
          <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden />
        </button>
      </div>
    </ActionSheet>
  );
}
