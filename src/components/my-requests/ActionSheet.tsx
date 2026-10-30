'use client';

import React, { useEffect } from 'react';
import CloseButton from '@/components/common/CloseButton';

const SECONDARY = 'flex-1 h-13 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold inline-flex items-center justify-center gap-2';

interface ActionSheetProps {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  /** 없으면 아래 버튼 줄 없음 (읽기용 시트, 닫기는 오른쪽 위 X) */
  confirmLabel?: string;
  /** 바깥 어두운 곳(누르면 닫힘)의 읽기 이름. 화면 버튼으로는 보이지 않음 — 닫기는 오른쪽 위 X(common.close) */
  cancelLabel: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  tone?: 'brand' | 'risk';
  testId?: string;
  /** 아래 줄 왼쪽 보조 행동 (연한 파랑). 예: 해제 창의 "전화해 보기" */
  secondary?: { label: string; onClick?: () => void; href?: string; icon?: React.ReactNode };
}

/**
 * 하단 시트: 되돌릴 수 없는 동작 확인, 선택지 고르기, 요약 보기.
 * 닫기는 모든 창에서 오른쪽 위 X 하나 (대표님 2026-10-27) — 아래 줄은 행동 버튼만(보조 연한 파랑 + 결정 진한 색).
 * 바깥 어두운 곳·Esc로도 닫힌다
 */
export default function ActionSheet({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmDisabled = false,
  tone = 'brand',
  testId,
  secondary,
}: ActionSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
      <button type="button" aria-label={cancelLabel} onClick={onCancel} className="absolute inset-0 bg-black/60 cursor-default" />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-card px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-[20px] font-extrabold text-text-primary tracking-tight whitespace-pre-line break-keep">{title}</h2>
          <CloseButton onClick={onCancel} testId={testId ? `${testId}-close` : undefined} className="-mt-2 -mr-2" />
        </div>
        {children && <div className="mt-3">{children}</div>}
        {((confirmLabel && onConfirm) || secondary) && (
        <div className="mt-6 flex gap-2">
          {secondary &&
            (secondary.href ? (
              <a href={secondary.href} onClick={secondary.onClick} data-testid={testId ? `${testId}-secondary` : undefined} className={SECONDARY}>
                {secondary.icon}
                {secondary.label}
              </a>
            ) : (
              <button type="button" onClick={secondary.onClick} data-testid={testId ? `${testId}-secondary` : undefined} className={SECONDARY}>
                {secondary.icon}
                {secondary.label}
              </button>
            ))}
          {confirmLabel && onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              data-testid={testId ? `${testId}-confirm` : undefined}
              className={`flex-1 h-13 rounded-xl text-white text-[15px] font-bold disabled:bg-border-default disabled:text-text-tertiary ${
                tone === 'risk' ? 'bg-status-risk' : 'bg-brand'
              }`}
            >
              {confirmLabel}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

/** 시트 안의 하나 고르기 칩 */
export function ChoiceChips({ options, value, onChange }: { options: readonly string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={`h-10 px-4 rounded-full text-[13px] font-bold transition-colors ${
            value === o ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
