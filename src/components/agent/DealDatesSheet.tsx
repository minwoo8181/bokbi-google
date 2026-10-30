'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { checkDealDates, DATE_FIELDS, type DateField, type DealDates } from '@/lib/deal/deal';
import ActionSheet from '@/components/my-requests/ActionSheet';

const t = SITE_CONTENT.brokerDeal;

interface DealDatesSheetProps {
  current: DealDates;
  today: string;
  /** 시트를 연 이유 (예: 계약 보고 전 계약일이 필요) */
  notice?: string | null;
  onSave: (next: DealDates) => void;
  onClose: () => void;
}

/** 거래 날짜: 계약일 / 중도금일(없어요) / 잔금일. 정해진 것만 넣어도 되고, 바뀐 칸만 기록에 남는다 */
export default function DealDatesSheet({ current, today, notice, onSave, onClose }: DealDatesSheetProps) {
  const [draft, setDraft] = useState<DealDates>(current);
  const error = checkDealDates(current, draft, today);
  const set = (f: DateField, v: string | null) => setDraft((d) => ({ ...d, [f]: v }));

  return (
    <ActionSheet
      open
      title={t.dates.title}
      confirmLabel={t.dates.save}
      cancelLabel={t.dates.cancel}
      confirmDisabled={error !== null}
      onConfirm={() => onSave(draft)}
      onCancel={onClose}
      testId="deal-dates-sheet"
    >
      {notice && <p className="mb-2 text-[13px] font-bold text-brand break-keep">{notice}</p>}
      <p className="text-[13px] font-medium text-text-tertiary">{t.dates.sub}</p>
      <div className="mt-3 space-y-3">
        {DATE_FIELDS.map((f) => (
          <label key={f} className="block">
            <span className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-text-secondary">{t.fields[f]}</span>
              {f === 'MIDDLE' && (
                <button
                  type="button"
                  onClick={() => set('MIDDLE', null)}
                  aria-pressed={!draft.MIDDLE}
                  className={`h-9 px-3 rounded-full text-[12px] font-bold active:scale-96 transition-transform duration-fast ease-out-soft ${
                    !draft.MIDDLE ? 'bg-brand-light text-brand-hover' : 'bg-surface-subtle text-text-secondary'
                  }`}
                >
                  {t.dates.none}
                </button>
              )}
            </span>
            <input
              type="date"
              value={draft[f] ?? ''}
              min={today}
              onChange={(e) => set(f, e.target.value || null)}
              data-testid={`deal-date-${f.toLowerCase()}`}
              className="mt-1 w-full min-w-0 h-12 px-3 rounded-xl bg-surface-subtle text-[15px] text-text-primary"
            />
          </label>
        ))}
      </div>
      {error && error !== 'NO_CHANGE' && (
        <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert" data-testid="deal-dates-error">
          {t.dates.errors[error]}
        </p>
      )}
    </ActionSheet>
  );
}
