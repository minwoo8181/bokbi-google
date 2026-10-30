'use client';

import React from 'react';
import { CalendarDays, ChevronRight, FileCheck, Megaphone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { AgentTodoItem, AgentTodoLevel } from '@/lib/broker/agentTodo';
import type { CardStrip } from '@/lib/deal/deal';
import type { SentRequest } from '@/lib/broker/feed';
import { fill, SECTION_COUNT } from '@/components/my-requests/format';
import UrgentAlert from '@/components/common/UrgentAlert';
import { stripText } from './DealStrip';

const t = SITE_CONTENT.brokerAgent.listings;

/** 오른쪽 끝 1/5에만 색 (집주인 OwnerTodoSection과 같은 줄 모양). 빨강 = 지금, 노랑 = 곧 */
const FADE = { NOW: 'from-status-risk-light', SOON: 'from-status-caution-light' } as const;
const VISIT_KEYS = new Set(['VISIT_SOON', 'VISIT_ON']);
const AD_KEYS = new Set(['AD_LEFT', 'AD_SOON', 'AD_OVERDUE', 'REMOVE_AD', 'REMOVE_AD_PAUSED', 'REMOVE_AD_LATE']);

/** 할 일 섹션 제목 + 개수 칩 (빨강 할 일이 있으면 빨간 배지 하나, 아니면 무채색) */
export function TodoTitle({ title, n, red }: { title: string; n: number; red: boolean }) {
  return (
    <h2 className="pt-3 px-1 flex items-center gap-2 text-[17px] font-bold text-text-primary">
      {title}
      <span className={red ? `${SECTION_COUNT} !bg-status-risk !border-status-risk !text-white` : SECTION_COUNT} data-testid="agent-todo-count">
        {fill(t.sectionCount, { n })}
      </span>
    </h2>
  );
}

/** 할 일 한 줄: 흰 줄 + 무채색 아이콘·글자 + 오른쪽 끝에만 색 (내 매물 지금 할 일 · 새 의뢰 먼저 끝낼 일 공용) */
export function TodoRow({ strip, level, sub, onClick, testId }: { strip: CardStrip; level: AgentTodoLevel; sub: string; onClick: () => void; testId: string }) {
  const { label, right } = stripText(strip);
  const Icon = VISIT_KEYS.has(strip.key) ? CalendarDays : AD_KEYS.has(strip.key) ? Megaphone : FileCheck;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      data-level={level}
      className="relative w-full min-h-16 px-3 py-3 rounded-2xl bg-surface-card overflow-hidden flex items-center gap-3 text-left active:scale-[0.99] transition-transform duration-fast ease-out-soft"
    >
      <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-surface-subtle text-text-secondary">
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-text-primary break-keep">
          {label}
          {right && <span className="ml-2 text-[13px] font-bold text-text-secondary tabular-nums">{right}</span>}
        </span>
        <span className="mt-1 block text-[13px] font-medium text-text-tertiary truncate">{sub}</span>
      </span>
      <span aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l ${FADE[level]} to-transparent`} />
      <ChevronRight className="relative w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
    </button>
  );
}

/** 할 일 둘째 줄: 단지 · 거래 종류 평형 */
const subOf = (s: SentRequest) => `${s.snapshot.complexName} · ${s.snapshot.tradeType} ${s.snapshot.pyeongLabel}`;

/** 내 매물 빨강 할 일 = 맨 위 긴급 알림 상자 (대표님 2026-10-27). 기한 지난 일(잠금 대상)이 있을 때만 잠금 이유 줄 */
export function AgentUrgentAlert({ items, blocking, onOpen }: { items: (AgentTodoItem & { s: SentRequest })[]; blocking: boolean; onOpen: (s: SentRequest) => void }) {
  const now = items.filter((i) => i.level === 'NOW');
  return (
    <UrgentAlert
      testId="agent-urgent"
      title={fill(t.urgentTitle, { n: now.length })}
      reason={blocking ? t.urgentLock : undefined}
      goLabel={t.urgentGo}
      items={now.map((it) => ({ key: it.requestId, label: stripText(it.strip).label, sub: subOf(it.s), onClick: () => onOpen(it.s) }))}
    />
  );
}

/** 내 매물 노랑 "곧 할 일" (흰 줄 + 오른쪽 끝 노랑). 누르면 그 집 거래 페이지. 없으면 섹션째 숨김 */
export default function AgentTodoSection({ items, onOpen }: { items: (AgentTodoItem & { s: SentRequest })[]; onOpen: (s: SentRequest) => void }) {
  const soon = items.filter((i) => i.level === 'SOON');
  if (soon.length === 0) return null;
  return (
    <section className="space-y-2" data-testid="agent-todo">
      <TodoTitle title={t.todoTitle} n={soon.length} red={false} />
      <div className="space-y-2">
        {soon.map((it) => (
          <TodoRow
            key={it.requestId}
            strip={it.strip}
            level={it.level}
            sub={subOf(it.s)}
            onClick={() => onOpen(it.s)}
            testId="agent-todo-item"
          />
        ))}
      </div>
    </section>
  );
}
