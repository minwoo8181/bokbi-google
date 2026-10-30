import { describe, expect, it } from 'vitest';
import { agentTodoItems } from '../agentTodo';
import type { CardStrip, StripKey, StripTone } from '@/lib/deal/deal';

const strip = (tone: StripTone, key: StripKey): CardStrip => ({ tone, key, vars: {} });

describe('agentTodoItems (내 매물 지금 할 일)', () => {
  it('빨강(RISK·ACTION)은 NOW, 노랑(CAUTION)은 SOON, 초록·회색은 넣지 않음', () => {
    const items = agentTodoItems([
      { requestId: 'a', strip: strip('RISK', 'AD_OVERDUE') },
      { requestId: 'b', strip: strip('ACTION', 'CONFIRM') },
      { requestId: 'c', strip: strip('CAUTION', 'VISIT_SOON') },
      { requestId: 'd', strip: strip('GOOD', 'VISIT_ON') },
      { requestId: 'e', strip: strip('DONE', 'CLOSED') },
    ]);
    expect(items.map((i) => [i.requestId, i.level])).toEqual([
      ['a', 'NOW'],
      ['b', 'NOW'],
      ['c', 'SOON'],
    ]);
  });

  it('빨강이 먼저, 같은 색 안에서는 받은 순서', () => {
    const items = agentTodoItems([
      { requestId: 'c1', strip: strip('CAUTION', 'AD_SOON') },
      { requestId: 'n1', strip: strip('ACTION', 'CALL_OWNER') },
      { requestId: 'c2', strip: strip('CAUTION', 'VISIT_SOON') },
      { requestId: 'n2', strip: strip('RISK', 'REMOVE_AD_LATE') },
    ]);
    expect(items.map((i) => i.requestId)).toEqual(['n1', 'n2', 'c1', 'c2']);
  });

  it('할 일이 없으면 빈 목록', () => {
    expect(agentTodoItems([])).toEqual([]);
    expect(agentTodoItems([{ requestId: 'x', strip: strip('GOOD', 'VISIT_ON') }])).toEqual([]);
  });
});
