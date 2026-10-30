'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface UrgentAlertItem {
  key: string;
  label: string;
  /** 둘째 줄 (어느 집·어느 부동산) */
  sub?: string;
  onClick: () => void;
}

/**
 * 빨강 할 일 긴급 알림 상자 (대표님 2026-10-27: 흐름이 멈추는 일은 급해 보여야 빨리 한다).
 * 연한 빨강 상자 + 빨간 제목 + 이유 한 줄 + 할 일 목록(누르면 그 일로) + 빨간 주 버튼 하나(맨 위 할 일로).
 * 중개사 새 의뢰·내 매물, 집주인 내 의뢰가 함께 쓴다. 노랑(곧 할 일)은 흰 줄 그대로
 */
export default function UrgentAlert({ title, reason, items, goLabel, testId }: { title: string; reason?: string; items: UrgentAlertItem[]; goLabel: string; testId: string }) {
  if (items.length === 0) return null;
  return (
    <section className="p-4 rounded-2xl bg-status-risk-light animate-rise-in" data-testid={testId} role="status">
      <p className="text-[15px] font-bold text-[var(--status-risk-strong)] break-keep">{title}</p>
      {reason && <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{reason}</p>}
      <ul className="mt-2">
        {items.map((it) => (
          <li key={it.key} className="border-t border-surface-card first:border-t-0">
            <button
              type="button"
              onClick={it.onClick}
              data-testid={`${testId}-item`}
              className="w-full min-h-11 py-2 flex items-center justify-between gap-2 text-left active:scale-[0.99] transition-transform duration-fast ease-out-soft"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-text-primary break-keep">{it.label}</span>
                {it.sub && <span className="block text-[12px] font-medium text-text-secondary truncate">{it.sub}</span>}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-text-tertiary" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={items[0].onClick}
        data-testid={`${testId}-go`}
        className="mt-2 w-full h-11 rounded-xl bg-status-risk text-white text-[15px] font-bold inline-flex items-center justify-center gap-1 active:scale-96 transition-transform duration-fast ease-out-soft"
      >
        {goLabel}
        <ChevronRight className="w-4 h-4" aria-hidden />
      </button>
    </section>
  );
}
