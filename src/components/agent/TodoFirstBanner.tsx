'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { CardStrip } from '@/lib/deal/deal';
import { fill } from '@/components/my-requests/format';
import UrgentAlert from '@/components/common/UrgentAlert';
import { stripText } from './DealStrip';

const t = SITE_CONTENT.brokerAgent.todoFirst;

/**
 * 새 의뢰 맨 위 긴급 알림: 기한이 지난 할 일이 있으면 요청 보내기가 잠긴다 (대표님 2026-10-26).
 * 2026-10-27: 흰 줄로 바꿨다가 "급해 보여야 빨리 한다"로 빨간 상자로 되돌림 (공용 UrgentAlert).
 * 내 매물·거래 페이지는 잠그지 않는다 — 그 일을 하러 가는 길이라서
 */
export default function TodoFirstBanner({ items, onGo }: { items: { requestId: string; complexName: string; strip: CardStrip }[]; onGo: (requestId: string) => void }) {
  return (
    <UrgentAlert
      testId="todo-first"
      title={fill(t.title, { n: items.length })}
      reason={t.sub}
      goLabel={t.go}
      items={items.map((it) => ({ key: it.requestId, label: `${it.complexName} · ${stripText(it.strip).label}`, onClick: () => onGo(it.requestId) }))}
    />
  );
}
