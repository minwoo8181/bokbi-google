import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bearerMatches, POST } from '../route';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('서버 키는 두 곳만: 웹 푸시 발송 경로(2026-10-29 A안) + 서버 키 클라이언트(행동 기록 A7·가입 A4)', () => {
  it('src에서 SUPABASE_SECRET_KEY를 읽는 파일은 이 두 파일뿐', () => {
    const users = sourceFiles(path.join(process.cwd(), 'src')).filter((f) => readFileSync(f, 'utf8').includes('SUPABASE_SECRET_KEY'));
    expect(users.map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/')).sort()).toEqual([
      'src/app/api/admin/push-tick/route.ts',
      'src/lib/supabase/serviceClient.ts',
    ]);
  });
});

const call = (auth?: string) => POST(new Request('http://localhost/api/admin/push-tick', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

afterEach(() => vi.unstubAllEnvs());

describe('bearerMatches', () => {
  it('"Bearer 비밀값"만 통과', () => {
    expect(bearerMatches('Bearer s3cret', 's3cret')).toBe(true);
    expect(bearerMatches('Bearer s3cre', 's3cret')).toBe(false);
    expect(bearerMatches('s3cret', 's3cret')).toBe(false);
    expect(bearerMatches(null, 's3cret')).toBe(false);
  });
});

describe('POST /api/admin/push-tick', () => {
  it('비밀값이 설정되지 않았으면 503 (아무도 못 부름)', async () => {
    vi.stubEnv('PUSH_TICK_SECRET', '');
    expect((await call('Bearer ')).status).toBe(503);
  });

  it('비밀값이 틀리거나 없으면 401, 서버 키 단계까지 가지 않음', async () => {
    vi.stubEnv('PUSH_TICK_SECRET', 'tick-secret');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
  });

  it('비밀값은 맞지만 서버 키·웹 푸시 키가 없으면 503', async () => {
    vi.stubEnv('PUSH_TICK_SECRET', 'tick-secret');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect((await call('Bearer tick-secret')).status).toBe(503);
  });
});
