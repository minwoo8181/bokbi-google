import React from 'react';
import { LAB_CONTENT } from '@/config/labContent';

const STEPS = LAB_CONTENT.keeps.progress.steps;

/**
 * 🔖 킵 K3 (2026-10-30, 출처 삼쩜삼 홈 "신청 전 · 진행 중 …" 막대): 복비 진행 단계 막대.
 * 얇은 회색 막대 위 지금 단계까지 파랑 + 아래 단계 이름 4칸(지금 단계만 파랑 굵게). current = 0부터
 */
export default function KeepProgressSteps({ current = 0 }: { current?: number }) {
  return (
    <div data-keep="K3" aria-label={`${STEPS.join(' → ')} 중 ${STEPS[current]}`}>
      <div className="h-1 rounded-full bg-border-light overflow-hidden">
        <div className="h-full rounded-full bg-brand" style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="mt-2 grid grid-cols-4 text-[12px] text-text-tertiary">
        {STEPS.map((s, k) => (
          <li
            key={s}
            aria-current={k === current ? 'step' : undefined}
            className={`${k === current ? 'font-bold text-brand-hover' : ''} ${k === STEPS.length - 1 ? 'text-right' : k > 0 ? 'text-center' : ''}`}
          >
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
