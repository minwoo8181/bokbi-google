import { describe, expect, it } from 'vitest';
import { createLocalRepos, memoryStore } from '@/lib/data/local';
import { BROKER_CONSENTS_KEY, consentsToAdd, parseConsentRecords } from '../signupConsents';

const at = new Date('2026-11-02T03:00:00Z');

describe('가입 동의 기록 (A6)', () => {
  it('같은 약관 버전·항목은 한 번만, 새 버전이면 다시, 순서는 이용약관·수집·제공', () => {
    expect(consentsToAdd([], ['PROVIDE', 'TERMS', 'COLLECT', 'TERMS'], 'v1')).toEqual(['TERMS', 'COLLECT', 'PROVIDE']);
    const done = [{ key: 'TERMS' as const, termsVersion: 'v1' }];
    expect(consentsToAdd(done, ['TERMS', 'COLLECT'], 'v1')).toEqual(['COLLECT']);
    expect(consentsToAdd(done, ['TERMS'], 'v2')).toEqual(['TERMS']);
    expect(consentsToAdd([], ['TERMS'], ' ')).toEqual([]);
  });

  it('깨진 저장값은 버림', () => {
    expect(parseConsentRecords('{oops')).toEqual([]);
    expect(parseConsentRecords(JSON.stringify([{ key: 'TERMS', termsVersion: 'v1', at: 'x' }, { key: 'NOPE', termsVersion: 'v1', at: 'x' }, null]))).toHaveLength(1);
  });

  it('브라우저 저장소: 인증을 두 번 해도 3줄, 버전이 바뀌면 3줄 더', async () => {
    const store = memoryStore();
    const repos = createLocalRepos({ store, baseRequests: () => [] });
    await repos.applications.recordConsents(['TERMS', 'COLLECT', 'PROVIDE'], 'v1', at);
    await repos.applications.recordConsents(['TERMS', 'COLLECT', 'PROVIDE'], 'v1', at);
    expect(parseConsentRecords(store.get(BROKER_CONSENTS_KEY))).toHaveLength(3);
    await repos.applications.recordConsents(['TERMS', 'COLLECT', 'PROVIDE'], 'v2', at);
    expect(parseConsentRecords(store.get(BROKER_CONSENTS_KEY)).map((r) => r.termsVersion)).toEqual(['v1', 'v1', 'v1', 'v2', 'v2', 'v2']);
  });
});
