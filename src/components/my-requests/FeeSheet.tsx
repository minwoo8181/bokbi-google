'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { clampFee, FEE_STEPS, MIN_FEE_WON } from '@/lib/requests/stage';
import { draftRows, type ResumeStep, type SavedRequest } from '@/lib/requests/requestDraft';
import ActionSheet from './ActionSheet';
import { fill } from './format';

interface FeeSheetProps {
  open: boolean;
  /** CHANGE: 매칭 전 복비 바꾸기(취소하고 다시 등록) / RETRY: 끝난 의뢰 다시 요청 */
  mode: 'CHANGE' | 'RETRY';
  currentFeeWon: number;
  legalMaxWon: number;
  aptId: string | null;
  /** 저장된 요청서. 없으면 복비만 바꿀 수 있다 */
  draft: SavedRequest | null;
  onSubmit: (feeWon: number) => void;
  /** 항목 수정 → 분석 화면 매칭 모달의 그 단계로 */
  onEdit: (step: ResumeStep, feeWon: number) => void;
  onClose: () => void;
}

/** 다시 요청 요약 (A안): 복비(±10만·±1만) + 요청서 한눈에 + 바뀐 항목만 수정 */
export default function FeeSheet({ open, mode, currentFeeWon, legalMaxWon, aptId, draft, onSubmit, onEdit, onClose }: FeeSheetProps) {
  const t = SITE_CONTENT.myRequests.feeSheet;
  const [fee, setFee] = useState(currentFeeWon);
  useEffect(() => {
    if (open) setFee(currentFeeWon);
  }, [open, currentFeeWon]);

  const atMin = fee <= MIN_FEE_WON;
  const atMax = fee >= legalMaxWon;
  const rows = draft ? draftRows(draft, formatPriceTenThousand, { occupancy: t.occupancy, noOptions: t.noOptions }) : [];

  return (
    <ActionSheet
      open={open}
      testId="fee-sheet"
      title={mode === 'CHANGE' ? t.titleChange : t.titleRetry}
      confirmLabel={mode === 'CHANGE' ? t.submitChange : t.submitRetry}
      confirmDisabled={mode === 'CHANGE' && fee === currentFeeWon}
      cancelLabel={t.cancel}
      onCancel={onClose}
      onConfirm={() => onSubmit(fee)}
    >
      <p className="text-[13px] font-bold text-text-tertiary">{t.feeLabel}</p>
      <p className="text-center text-[26px] font-extrabold text-text-primary tabular-nums" data-testid="fee-sheet-value">
        {formatWon(fee)}
      </p>
      {/* 10만·1만 단위 (대표님 요청 2026-10-25) */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {FEE_STEPS.map((step) => {
          const blocked = step < 0 ? atMin || fee + step < MIN_FEE_WON : atMax;
          return (
            <button
              key={step}
              type="button"
              disabled={blocked}
              onClick={() => setFee((f) => clampFee(f + step, legalMaxWon))}
              className="h-12 rounded-xl bg-surface-subtle text-text-primary text-[15px] font-bold disabled:text-text-tertiary"
            >
              {step < 0 ? '−' : '+'}
              {Math.abs(step) / 10_000}만
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[13px] font-medium text-text-tertiary tabular-nums">
        {fill(t.base, { fee: formatWon(currentFeeWon), max: formatWon(legalMaxWon) })}
      </p>

      {/* 요청서 한눈에: 대부분은 그대로, 바뀐 항목만 수정 */}
      <div className="mt-5 pt-4 border-t border-border-light" data-testid="draft-rows">
        <p className="text-[13px] font-bold text-text-tertiary">{t.sectionTitle}</p>
        {rows.length === 0 ? (
          <p className="mt-2 text-[13px] font-medium text-text-secondary break-keep">{t.noDraft}</p>
        ) : (
          <ul className="mt-1 divide-y divide-border-light">
            {rows.map((r) => (
              <li key={r.key} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex gap-3 items-baseline">
                  <span className="w-12 flex-shrink-0 text-[13px] font-medium text-text-tertiary">{t.rows[r.key]}</span>
                  <span className="text-[15px] font-bold text-text-primary break-keep">{r.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(r.step, fee)}
                  data-testid={`draft-edit-${r.key}`}
                  className="flex-shrink-0 h-11 px-2 text-[13px] font-bold text-brand"
                >
                  {t.edit}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[13px] font-medium text-text-secondary break-keep">{mode === 'CHANGE' ? t.noticeChange : t.noticeRetry}</p>
      {aptId && (
        <p className="mt-2 flex items-center flex-wrap gap-x-1 text-[13px] font-medium text-text-tertiary">
          {t.restartLine}
          <Link href={`/analysis/${aptId}`} className="inline-flex items-center min-h-[44px] font-bold text-text-secondary">
            {t.restartLink}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        </p>
      )}
    </ActionSheet>
  );
}
