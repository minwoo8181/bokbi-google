import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deviceOf, discountPctOf, hoursSince, pageOf, pageRole, priceBand, savedManwonOf } from '../derive';
import { serverSendAllowed, type SendEnv } from '../remote';
import { actorHash, hashSecret, insertEvents, prepareBatch, toRow } from '../serverStore';
import { buildEvent } from '../store';
import { EVENT_NAMES, type EventName, type EventProps } from '../events';

const now = new Date('2026-11-02T03:00:00Z');
const SECRET = 'test-secret-0123456789';
const UUID = '6f9619ff-8b86-4d11-b42d-00c04fc964ff';
const ev = (name: EventName, props: EventProps, over: Record<string, unknown> = {}) => ({
  ...buildEvent(name, props, { id: 'e1', at: now, actorId: 'anon-1', sessionId: 's-1' }),
  ...over,
});

describe('화면 값 → 기록 칸', () => {
  it('주소 → 화면 종류 (번호 빼고), 관리자는 기록 안 함', () => {
    expect(pageOf('/')).toBe('HOME');
    expect(pageOf('/analysis/16')).toBe('ANALYSIS');
    expect(pageOf('/my-requests/')).toBe('MY_REQUESTS');
    expect(pageOf('/agent')).toBe('AGENT');
    expect(pageOf('/agent/register')).toBe('AGENT_REGISTER');
    expect(pageOf('/agent/terms')).toBe('AGENT_TERMS');
    expect(pageOf('/my-info')).toBe('MY_INFO');
    expect(pageOf('/login')).toBe('LOGIN');
    expect(pageOf('/legal/terms')).toBe('OTHER');
    expect(pageOf('/admin')).toBeNull();
    expect(pageOf('/admin/brokers')).toBeNull();
    expect(pageRole('AGENT_TERMS')).toBe('broker');
    expect(pageRole('ANALYSIS')).toBe('owner');
  });

  it('기기: 768부터 태블릿, 1024부터 PC', () => {
    expect([360, 767, 768, 1023, 1024, 1920].map(deviceOf)).toEqual(['PHONE', 'PHONE', 'TABLET', 'TABLET', 'DESKTOP', 'DESKTOP']);
  });

  it('희망가 구간·할인율·시간·아낀 복비', () => {
    expect([29_999, 30_000, 59_999, 60_000, 90_000, 120_000].map(priceBand)).toEqual(['UNDER_3', '3_TO_6', '3_TO_6', '6_TO_9', '9_TO_12', 'OVER_12']);
    expect(discountPctOf(3_500_000, 5_000_000)).toBe(30);
    expect(discountPctOf(6_000_000, 5_000_000)).toBe(0);
    expect(discountPctOf(1, 0)).toBeNull();
    expect(hoursSince('2026-11-01T03:00:00Z', now)).toBe(24);
    expect(hoursSince('2026-11-03T03:00:00Z', now)).toBe(0);
    expect(hoursSince(null, now)).toBeNull();
    expect(savedManwonOf(5_000_000, 3_500_000)).toBe(150);
    expect(savedManwonOf(1, 2)).toBe(0);
  });
});

describe('서버로 보낼지 (대표님: 관리자·개발·자동 시험 제외)', () => {
  const ok: SendEnv = { production: true, backend: 'supabase', hostname: 'bokbi.kr', webdriver: false, noTrack: false };
  it('배포 빌드 + Supabase + 실제 주소일 때만', () => {
    expect(serverSendAllowed(ok)).toBe(true);
    expect(serverSendAllowed({ ...ok, production: false })).toBe(false);
    expect(serverSendAllowed({ ...ok, backend: 'local' })).toBe(false);
    for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'bokbi.localhost', 'app.test']) expect(serverSendAllowed({ ...ok, hostname })).toBe(false);
    expect(serverSendAllowed({ ...ok, webdriver: true })).toBe(false);
    expect(serverSendAllowed({ ...ok, noTrack: true })).toBe(false);
  });
});

describe('서버 저장 (가명 해시)', () => {
  it('사람 id는 원문 없이 HMAC 해시, 같은 사람은 같은 해시', () => {
    const h = actorHash('anon-1', SECRET);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(actorHash('anon-1', SECRET)).toBe(h);
    expect(actorHash('anon-2', SECRET)).not.toBe(h);
    expect(actorHash('anon-1', 'other-secret-0123456')).not.toBe(h);
    const row = toRow(ev('feed_view', {}), SECRET, now);
    expect(JSON.stringify(row)).not.toContain('anon-1');
    expect(row.actor_hash).toBe(h);
  });

  it('의뢰·카드 id는 서버 id(uuid)만, 시계가 하루 넘게 틀리면 서버 시각', () => {
    expect(toRow(ev('feed_view', {}, { requestId: 'BK-DEMO-0001', offerId: UUID }), SECRET, now)).toMatchObject({ request_id: null, offer_id: UUID });
    expect(toRow(ev('feed_view', {}, { at: '2020-01-01T00:00:00Z' }), SECRET, now).at).toBe(now.toISOString());
    expect(toRow(ev('feed_view', {}, { at: '2026-11-02T02:00:00Z' }), SECRET, now).at).toBe('2026-11-02T02:00:00.000Z');
  });

  it('묶음: 형식·개인정보 검사 다시, 관리자 기록·이상한 값은 버림, 최대 20개', () => {
    const good = ev('page_visit', { page: 'HOME', device: 'PHONE' });
    const pii = ev('sale_change', { action: 'PAUSE', reasonChip: '205동 2301호' });
    const admin = ev('admin_action', { action: 'CONTACTED' });
    const r = prepareBatch({ events: [good, pii, admin, null, 'x', { ...good, props: [] }] }, SECRET, now);
    expect(r.rows.map((x) => x.name)).toEqual(['page_visit']);
    expect(r.dropped).toBe(5);
    expect(prepareBatch({ events: Array.from({ length: 25 }, () => good) }, SECRET, now)).toMatchObject({ dropped: 5 });
    expect(prepareBatch({ events: Array.from({ length: 25 }, () => good) }, SECRET, now).rows).toHaveLength(20);
    expect(prepareBatch('nope', SECRET, now)).toEqual({ rows: [], dropped: 0 });
  });

  it('비밀값·서버 키가 없거나 스위치 local이면 저장 안 함', async () => {
    expect(hashSecret({ NEXT_PUBLIC_DATA_BACKEND: 'supabase', EVENTS_HASH_SECRET: SECRET })).toBe(SECRET);
    expect(hashSecret({ NEXT_PUBLIC_DATA_BACKEND: 'supabase', EVENTS_HASH_SECRET: 'short' })).toBeNull();
    expect(hashSecret({ NEXT_PUBLIC_DATA_BACKEND: 'local', EVENTS_HASH_SECRET: SECRET })).toBeNull();
    expect(await insertEvents([], { NEXT_PUBLIC_DATA_BACKEND: 'supabase', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBe('NOT_CONFIGURED');
    expect(await insertEvents([], { NEXT_PUBLIC_DATA_BACKEND: 'local', NEXT_PUBLIC_SUPABASE_URL: 'https://x', SUPABASE_SECRET_KEY: 'k' })).toBe('NOT_CONFIGURED');
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('모든 기록이 화면·서버 어딘가에 연결됨 (A7 "21곳 연결" 자동 확인)', () => {
  it('27개 이름 모두 track() 또는 recordServerEvent() 호출이 있음', () => {
    const code = sourceFiles(path.join(process.cwd(), 'src'))
      .filter((f) => !f.includes(`${path.sep}lib${path.sep}analytics${path.sep}`))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const missing = EVENT_NAMES.filter((n) => !new RegExp(`(track|recordServerEvent)\\(\\s*'${n}'`).test(code));
    expect(missing).toEqual([]);
  });
});

describe('서버 저장 파일은 서버에서만', () => {
  const importers = (mod: string) =>
    sourceFiles(path.join(process.cwd(), 'src'))
      .filter((f) => readFileSync(f, 'utf8').includes(`from '@/lib/${mod}'`))
      .map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/'));

  it('serverStore를 부르는 곳은 api 경로뿐 (화면 코드에서 부르지 않음)', () => {
    const users = importers('analytics/serverStore');
    expect(users.length).toBeGreaterThan(0);
    expect(users.filter((f) => !f.startsWith('src/app/api/'))).toEqual([]);
  });

  it('서버 키 클라이언트를 부르는 곳은 서버 파일뿐 (행동 기록 저장·가입 서버 액션, A4)', () => {
    expect(importers('supabase/serviceClient').sort()).toEqual([
      'src/app/actions/data.ts',
      'src/app/agent/register/actions.ts',
      'src/lib/analytics/serverStore.ts',
      'src/lib/notify/server.ts',
    ]);
    // 알림 서버 연결도 서버 파일에서만
    expect(importers('notify/server').sort()).toEqual(['src/app/actions/data.ts', 'src/app/api/admin/push-tick/route.ts']);
    for (const f of ['src/app/actions/data.ts', 'src/app/agent/register/actions.ts'])
      expect(readFileSync(path.join(process.cwd(), f), 'utf8').startsWith("'use server'")).toBe(true);
  });
});
