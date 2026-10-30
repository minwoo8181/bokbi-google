'use client';

/**
 * 매칭 요청 창 진행 표시 (2026-10-27 대표님 최종 시안): 단계 이름이 있는 동그라미 6개.
 * 지난 단계 ✓(진한 색) · 지금 단계 파란 숫자 · 남은 단계 회색. 완료 화면은 모두 ✓ (모양은 common/StepCircles)
 */
import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { STEP_INDEX } from '@/lib/requests/modalStep';
import StepCircles from '@/components/common/StepCircles';
import type { ModalStep } from '../types';

export default function ModalStepper({ step }: { step: ModalStep }) {
  const labels = SITE_CONTENT.matchingModal.stepperLabels;
  const current = STEP_INDEX[step];
  const aria = SITE_CONTENT.matchingModal.stepperAria
    .replace('{n}', String(Math.min(current, labels.length)))
    .replace('{total}', String(labels.length));
  return <StepCircles labels={labels} current={current} ariaLabel={aria} />;
}
