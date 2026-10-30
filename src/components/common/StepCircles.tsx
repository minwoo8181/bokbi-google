'use client';

/**
 * 단계 이름이 있는 동그라미 진행 표시 (2026-10-27 대표님 시안): 지난 단계 ✓(진한 색) · 지금 단계 파란 숫자 · 남은 단계 회색.
 * 매칭 요청 창(ModalStepper)과 내 의뢰 위쪽(RequestHero)이 같이 쓴다. current가 labels 수보다 크면 모두 ✓
 */
import React from 'react';
import { Check } from 'lucide-react';

export default function StepCircles({ labels, current, ariaLabel }: { labels: readonly string[]; current: number; ariaLabel: string }) {
  return (
    <ol className="flex items-start px-1" aria-label={ariaLabel}>
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <li aria-hidden className={`flex-1 h-0.5 mt-[11px] mx-1 rounded-full ${n <= current ? (n === current ? 'bg-brand' : 'bg-text-primary') : 'bg-border-default'}`} />
            )}
            <li className="flex flex-col items-center gap-1 w-11 flex-shrink-0" aria-current={state === 'current' ? 'step' : undefined}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-extrabold tabular-nums border-[1.5px] ${
                  state === 'done'
                    ? 'bg-text-primary border-text-primary text-surface-card'
                    : state === 'current'
                      ? 'bg-brand border-brand text-white'
                      : 'bg-surface-card border-border-default text-text-tertiary'
                }`}
              >
                {state === 'done' ? <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden /> : n}
              </span>
              <span
                className={`text-[12px] whitespace-nowrap ${
                  state === 'current' ? 'text-brand font-extrabold' : state === 'done' ? 'text-text-primary font-bold' : 'text-text-tertiary font-medium'
                }`}
              >
                {label}
              </span>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
