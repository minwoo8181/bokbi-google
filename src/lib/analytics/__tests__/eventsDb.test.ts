import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { bootDb, pgliteDb } from '@/lib/data/__tests__/pgliteDb';
import { EVENT_NAMES, EVENT_SPECS, rolesOf, type EventName, type EventProps } from '../events';
import { prepareBatch } from '../serverStore';
import { buildEvent } from '../store';

const now = new Date('2026-11-02T03:00:00Z');
const SECRET = 'test-secret-0123456789';

/** 명세에서 맞는 예시 props (필수 칸만) */
function sampleProps(name: EventName): EventProps {
  const out: EventProps = {};
  for (const [k, p] of Object.entries(EVENT_SPECS[name].props) as [string, { type: string; optional?: true; values?: readonly string[]; min?: number }][]) {
    if (p.optional) continue;
    out[k] = p.type === 'int' || p.type === 'number' ? Math.max(1, p.min ?? 1) : p.type === 'boolean' ? true : p.type === 'enum' ? p.values![0] : 'id_1';
  }
  return out;
}

let pg: PGlite;
beforeAll(async () => {
  pg = await bootDb();
}, 60_000);

describe('행동 기록 → Supabase events (PGlite, A7)', () => {
  it('서버가 만든 줄은 표에 그대로 들어감: 관리자 기록 빼고 26개 이름 모두, 사람 id 원문 없음', async () => {
    const events = EVENT_NAMES.map((n, i) => buildEvent(n, sampleProps(n), { id: `e${i}`, at: now, actorId: 'anon-raw-1', sessionId: 's-1', role: rolesOf(n)[0] }));
    const { rows, dropped } = prepareBatch({ events: events.slice(0, 20) }, SECRET, now);
    const rest = prepareBatch({ events: events.slice(20) }, SECRET, now);
    expect(dropped + rest.dropped).toBe(1); // admin_action
    const all = [...rows, ...rest.rows];
    expect(all).toHaveLength(26);
    const service = pgliteDb(pg, { uid: null, service: true });
    const r = await service.insert('events', all as unknown as Record<string, unknown>[]);
    expect(r.error).toBeNull();
    const saved = await pg.query<{ n: number; raw: number }>(`select count(*)::int as n, count(*) filter (where actor_hash like '%anon-raw%')::int as raw from public.events`);
    expect(saved.rows[0]).toEqual({ n: 26, raw: 0 });
  });

  it('로그인 전 브라우저는 표에 직접 못 씀 (서버 경로만)', async () => {
    const { rows } = prepareBatch({ events: [buildEvent('page_visit', { page: 'HOME', device: 'PHONE' }, { id: 'x', at: now, actorId: 'a', sessionId: 's' })] }, SECRET, now);
    const anon = pgliteDb(pg, { uid: null });
    expect((await anon.insert('events', rows as unknown as Record<string, unknown>[])).error).not.toBeNull();
  });
});
