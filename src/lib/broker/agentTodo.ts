/**
 * 중개사 내 매물 "지금 할 일" 섹션 (대표님 2026-10-27, 집주인 ownerTodo와 같은 틀).
 * 빨강 NOW = 색 띠 RISK(기한 지남 — 새 요청 잠금 대상 포함)·ACTION(내가 할 일). 탭 배지 개수와 같다
 * 노랑 SOON = 색 띠 CAUTION(24시간 안: 광고 기한 임박·방문 등)
 * 새 규칙 없음 — 카드마다 이미 고른 cardStrip(가장 급한 띠)만 쓴다. 순서는 받은 목록 순서(listRank 정렬)를 지키되 빨강 먼저
 */
import type { CardStrip } from '@/lib/deal/deal';

export type AgentTodoLevel = 'NOW' | 'SOON';

export interface AgentTodoItem {
  requestId: string;
  level: AgentTodoLevel;
  strip: CardStrip;
}

export function agentTodoItems(rows: { requestId: string; strip: CardStrip }[]): AgentTodoItem[] {
  const out: AgentTodoItem[] = [];
  for (const { requestId, strip } of rows) {
    if (strip.tone === 'RISK' || strip.tone === 'ACTION') out.push({ requestId, level: 'NOW', strip });
    else if (strip.tone === 'CAUTION') out.push({ requestId, level: 'SOON', strip });
  }
  return [...out.filter((x) => x.level === 'NOW'), ...out.filter((x) => x.level === 'SOON')];
}
