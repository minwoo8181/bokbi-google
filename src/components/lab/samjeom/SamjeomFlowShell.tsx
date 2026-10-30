'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { LAB_CONTENT } from '@/config/labContent';
import { STEP_INDEX } from '@/lib/requests/modalStep';
import CloseButton from '@/components/common/CloseButton';
import type { ModalStep } from '@/components/analysis/types';

const t = LAB_CONTENT.samjeom.flow;
const LABELS = SITE_CONTENT.matchingModal.stepperLabels;

/**
 * design-lab 삼쩜삼 매칭 요청 = 신고 흐름 (레퍼런스: 삼쩜삼 종합소득세 단계 화면).
 * 아래 시트 대신 전체 화면: ← 이전 단계 · ✕ 닫기 → 얇은 진행 막대 + "n / 6 단계 이름" → 맥락 한 줄 → 단계 본문(큰 질문).
 * 단계 안 입력·검사·제출은 원래 Step*.tsx 그대로, 버튼 줄은 globals.css(.lab-flow)가 화면 바닥에 붙인다
 */
export default function SamjeomFlowShell({
  step,
  context,
  onBack,
  onClose,
  children,
}: {
  step: ModalStep;
  context: string;
  /** 첫 단계면 닫기와 같다 */
  onBack: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const n = STEP_INDEX[step];
  const done = step === 'COMPLETE';
  const current = Math.min(n, LABELS.length);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="matching-modal-title" className="fixed inset-0 z-50 bg-surface-card">
      <div className="lab-flow h-full max-w-[440px] mx-auto flex flex-col">
        <div className="h-14 px-2 flex items-center justify-between flex-shrink-0">
          {done ? (
            <span className="w-11" aria-hidden />
          ) : (
            <button type="button" onClick={onBack} aria-label={t.back} className="w-11 h-11 flex items-center justify-center text-text-primary">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <CloseButton testId="modal-close-btn" onClick={onClose} />
        </div>

        {!done && (
          <div className="px-5 flex-shrink-0" data-testid="modal-stepper">
            <div
              className="h-1 rounded-full bg-border-light overflow-hidden"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={LABELS.length}
              aria-valuenow={current}
              aria-label={SITE_CONTENT.matchingModal.stepperAria.replace('{n}', String(current)).replace('{total}', String(LABELS.length))}
            >
              <div className="h-full rounded-full bg-brand transition-[width] duration-base ease-out-soft" style={{ width: `${(current / LABELS.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-[13px]">
              <span className="font-bold text-brand-hover">{LABELS[current - 1]}</span>{' '}
              <span className="text-text-tertiary tabular-nums">{t.progress.replace('{n}', String(current)).replace('{total}', String(LABELS.length))}</span>
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-6">
          <p className="mb-2 text-[13px] text-text-tertiary truncate">{context}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
