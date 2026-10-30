/**
 * Supabase 마이그레이션 자동 시험 (PGlite = Node 안의 진짜 Postgres). 운영·브랜치 DB에 닿지 않는다.
 * 순서: tests/shim.sql(Supabase 흉내) → migrations/* → tests/lint.sql → tests/seed.sql → tests/permissions.sql
 * 1) 권한 표 48칸 + 쓰기·제약 시나리오 전부 통과 2) 보안 점검 WARN·ERROR 0 3) DB check 목록 = 앱 상태 목록
 */
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { DB_CHECKS } from '../dbEnums';
import { eq, inList } from '../supabase/port';
import { agentCountBand, officeAgeBand } from '@/lib/requests/stage';
import { bootDb, MIGRATIONS, pgliteDb, readSql as sql } from './pgliteDb';

interface ResultRow {
  section: string;
  name: string;
  expected: string;
  actual: string | null;
  pass: boolean;
}
interface LintRow {
  level: string;
  name: string;
  detail: string;
}

let db: PGlite;
let results: ResultRow[];
let lint: LintRow[];

beforeAll(async () => {
  db = await bootDb();
  await db.exec(sql('tests/lint.sql'));
  lint = (await db.query<LintRow>('select level, name, detail from tests.lint')).rows;
  await db.exec(sql('tests/seed.sql'));
  await db.exec(sql('tests/permissions.sql'));
  results = (await db.query<ResultRow>('select section, name, expected, actual, pass from tests.results order by seq')).rows;
}, 120_000);

describe('Supabase 마이그레이션 (PGlite)', () => {
  it('마이그레이션 12개를 순서대로 적용한다 (8·9번째 = 관리자 웹 푸시 받는 기기·자동 발송, 10번째 = 행동 기록 이름 5개, 11번째 = 중개사 가입 서버화, 12번째 = 사무소 실적 저장, 2026-10-29)', () => {
    expect(MIGRATIONS).toHaveLength(12);
  });

  it('권한 표 8줄 × 6명 = 48칸 모두 설계대로', () => {
    const cells = results.filter((r) => r.section === '권한 표');
    expect(cells).toHaveLength(48);
    expect(cells.filter((r) => !r.pass)).toEqual([]);
  });

  it('쓰기·제약·파기 시나리오 모두 통과', () => {
    const scenarios = results.filter((r) => r.section !== '권한 표');
    expect(scenarios.length).toBeGreaterThanOrEqual(100);
    expect(scenarios.filter((r) => !r.pass)).toEqual([]);
    console.info(`[db] 권한 표 48칸 + 시나리오 ${scenarios.length}개 = ${results.length}개 통과`);
  });

  it('보안 점검 WARN·ERROR 0 (INFO는 의도한 연락처 표 하나)', () => {
    expect(lint.filter((l) => l.level !== 'INFO')).toEqual([]);
    expect(lint).toEqual([{ level: 'INFO', name: 'rls_enabled_no_policy', detail: 'pii.request_contacts' }]);
  });

  it('보안 점검은 문제를 실제로 잡는다 (일부러 연 표·함수)', async () => {
    await db.exec(`
      create table public.lint_probe (id int);
      create function public.lint_probe_fn() returns int language sql as 'select 1';
    `);
    await db.exec(sql('tests/lint.sql'));
    const found = (await db.query<LintRow>('select level, name, detail from tests.lint')).rows.filter((l) => l.detail.includes('lint_probe'));
    expect(found.map((l) => l.name).sort()).toEqual(['anon_can_execute', 'anon_table_privilege', 'authenticated_can_delete', 'function_search_path_mutable', 'rls_disabled']);
    await db.exec('drop table public.lint_probe; drop function public.lint_probe_fn();');
  });

  it('DB check 목록 = 앱 상태 목록', async () => {
    const names = DB_CHECKS.map((c) => c.constraint);
    const rows = (
      await db.query<{ conname: string; def: string }>('select conname, pg_get_constraintdef(oid) as def from pg_constraint where conname = any($1)', [names])
    ).rows;
    expect(rows.map((r) => r.conname).sort()).toEqual([...names].sort());
    for (const c of DB_CHECKS) {
      const def = rows.find((r) => r.conname === c.constraint)!.def;
      // `x = ANY (ARRAY['A'::text, …])` 묶음 중 하나가 앱 목록과 같아야 한다
      const arrays = [...def.matchAll(/ARRAY\[(.*?)\]/g)].map((m) =>
        m[1].split(',').map((s) => {
          const t = s.trim().replace(/::[a-z ]+$/i, '');
          return t.startsWith("'") ? t.slice(1, -1) : Number(t);
        }),
      );
      const want = [...c.values].map(String).sort();
      expect(
        arrays.some((a) => JSON.stringify(a.map(String).sort()) === JSON.stringify(want)),
        `${c.constraint}: ${def}`,
      ).toBe(true);
    }
  });

  it('DB 포트 어댑터: 사람별 권한·함수 결과 모양·오류 코드', async () => {
    const ownerA = pgliteDb(db, { uid: '00000000-0000-0000-0000-0000000000a1' });
    const brokerM = pgliteDb(db, { uid: '00000000-0000-0000-0000-0000000000c1' });
    const brokerO = pgliteDb(db, { uid: '00000000-0000-0000-0000-0000000000c2' });
    const anon = pgliteDb(db, { uid: null });
    // 행 집합 함수 = 배열, 값 함수 = 값
    const cards = await ownerA.rpc<{ offer_id: string }[]>('owner_offer_cards', { p_request: '20000000-0000-0000-0000-000000000001' });
    expect(cards.error).toBeNull();
    expect(cards.data).toHaveLength(2);
    // M: 이번 주 3개 + 후기·허위 매물로 돌려받은 2개 (permissions.sql 시나리오 뒤)
    expect(await brokerM.rpc('grant_weekly_credits')).toEqual({ data: 5, error: null });
    // 함수가 낸 앱 오류 코드는 message 그대로, 권한 없음은 42501
    const dup = await brokerO.rpc('send_request', { p_request: '20000000-0000-0000-0000-000000000001', p_strengths: ['가격 조율을 잘해요'] });
    expect(dup.error?.message).toBe('ALREADY_SENT');
    expect((await brokerM.update('profiles', { role: 'admin' }, [eq('id', '00000000-0000-0000-0000-0000000000c1')])).error?.code).toBe('42501');
    expect((await anon.rpc('send_request', { p_request: '20000000-0000-0000-0000-000000000001', p_strengths: [] })).error?.code).toBe('42501');
    // RLS: 중개사는 내 카드만, in 필터
    const mine = await brokerM.select<{ office_id: string }>('offers', { columns: 'office_id' });
    expect(new Set(mine.data?.map((r) => r.office_id))).toEqual(new Set(['10000000-0000-0000-0000-0000000000c1']));
    const some = await ownerA.select<{ id: string }>('requests', { columns: 'id', filters: [inList('id', ['20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'])] });
    expect(some.data?.map((r) => r.id)).toEqual(['20000000-0000-0000-0000-000000000001']);
  });

  it('집주인 카드의 개설 연도·인원 구간 = 앱 구간 규칙', async () => {
    const year = Number(new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 4));
    const offices = (await db.query<{ open_year: number | null; agent_count: number | null; reg_no: string }>(
      `select open_year, agent_count, reg_no from public.broker_offices where reg_no in ('TEST-M', 'TEST-O')`,
    )).rows;
    // 사람 바꾸기는 트랜잭션 안에서만 유지된다
    const cards = await db.transaction(async (tx) => {
      await tx.exec(`select tests.become('owner_a')`);
      const r = await tx.query<{ office_age_band: string | null; agent_count_band: string | null; card_order: number }>(
        `select office_age_band, agent_count_band, card_order from public.owner_offer_cards('20000000-0000-0000-0000-000000000001') order by card_order`,
      );
      await tx.exec(`select tests.unbecome()`);
      return r.rows;
    });
    const byOrder = { 1: offices.find((o) => o.reg_no === 'TEST-M')!, 2: offices.find((o) => o.reg_no === 'TEST-O')! } as const;
    expect(cards).toHaveLength(2);
    for (const c of cards) {
      const o = byOrder[c.card_order as 1 | 2];
      expect(c.office_age_band).toBe(officeAgeBand(o.open_year, year));
      expect(c.agent_count_band).toBe(agentCountBand(o.agent_count));
    }
  });
});
