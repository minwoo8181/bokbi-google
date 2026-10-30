'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { stripText } from '@/components/agent/DealStrip';
import { TodoRow } from '@/components/agent/AgentTodoSection';
import UrgentAlert from '@/components/common/UrgentAlert';
import type { OwnerTodoItem } from '@/lib/deal/ownerTodo';
import type { BrokerOffer } from '@/lib/requests/types';
import { fill, SECTION_COUNT } from './format';

const t = SITE_CONTENT.myRequests.todo;

/**
 * 내 의뢰 할 일 (대표님 2026-10-27): 빨강(집주인이 답할 일·24시간 안 방문)은 맨 위 긴급 알림 상자,
 * 노랑(먼 방문·다가오는 계약일)은 "곧 확인할 일" 흰 줄(오른쪽 끝만 노랑). 누르면 그 중개사 거래 페이지.
 * 집주인은 막지 않고 크게 안내만 — 가끔 들어오는 사람이라 막히면 떠난다 (2026-10-26). 할 일이 없으면 둘 다 숨김
 */
export default function OwnerTodoSection({
  items,
  offers,
  onOpen,
}: {
  items: OwnerTodoItem[];
  offers: BrokerOffer[];
  /** 누른 줄 (바뀐 희망가 알리기 줄은 알리기 창, 나머지는 그 중개사 거래 페이지) */
  onOpen: (item: OwnerTodoItem) => void;
}) {
  const officeOf = (it: OwnerTodoItem) => offers.find((o) => o.id === it.offerId)?.disclosure.officeName ?? '';
  const now = items.filter((i) => i.level === 'NOW');
  const soon = items.filter((i) => i.level === 'SOON');
  if (items.length === 0) return null;
  return (
    <>
      {/* 빨강 = 긴급 알림 상자 (2026-10-27 대표님: 급해 보여야 흐름이 돈다). 집주인은 막는 규칙이 없어 잠금 문구 없음 */}
      <UrgentAlert
        testId="owner-urgent"
        title={fill(t.urgentTitle, { n: now.length })}
        reason={t.urgentReason}
        goLabel={t.urgentGo}
        items={now.map((it, i) => ({ key: `${it.offerId}-${it.strip.key}-${i}`, label: stripText(it.strip).label, sub: officeOf(it), onClick: () => onOpen(it) }))}
      />
      {soon.length > 0 && (
    <section className="space-y-2" data-testid="owner-todo">
      {/* 노랑 = 곧 확인할 일: 흰 줄 + 오른쪽 끝 노랑, 개수는 무채색 칩 */}
      <h2 className="pt-3 px-1 flex items-center gap-2 text-[17px] font-bold text-text-primary">
        {t.sectionTitle}
        <span className={SECTION_COUNT} data-testid="owner-todo-count">
          {fill(t.sectionCount, { n: soon.length })}
        </span>
      </h2>
      <div className="space-y-2">
        {soon.map((it, i) => (
          <TodoRow key={`${it.offerId}-${it.strip.key}-${i}`} strip={it.strip} level="SOON" sub={officeOf(it)} onClick={() => onOpen(it)} testId="owner-todo-item" />
        ))}
      </div>
    </section>
      )}
    </>
  );
}
