import { describe, expect, it } from 'vitest';
import registryJson from '@/data/brokers/dasan-offices.json';
import { type BrokerRegistryEntry, matchBrokerOffice } from '../registry';
import { LOCK_MAX_FAILS, LOCK_MS, isLocked, makeConfirmCode, recordFail, toSignupCheck } from '../signup';

const registry = registryJson.offices as BrokerRegistryEntry[];

describe('toSignupCheck', () => {
  it('화면으로 가는 값에 대표자 이름·전체 전화번호가 없다 (명단 336곳 전체)', () => {
    for (const e of registry) {
      const check = toSignupCheck(matchBrokerOffice({ regNo: e.regNo, ceo: e.ceo, office: e.office }, registry));
      // 상호는 신청자가 직접 입력한 값이라 그대로 보여준다 (상호 안에 번호를 넣은 곳 5곳 포함). 그 밖의 값만 검사
      const json = JSON.stringify({ ...check, office: undefined });
      expect(json, e.office).not.toContain(e.ceo);
      for (const p of [e.phone, ...e.altPhones]) if (p) expect(json, e.office).not.toContain(p);
    }
  });

  it('번호 유무와 상관없이 화면으로 가는 값의 모양이 같다 (안내 문구 한 가지)', () => {
    const withPhone = registry.find((e) => e.status === '영업중' && e.phoneSource === 'listed')!;
    const noPhone = registry.find((e) => e.status === '영업중' && e.phone === null)!;
    const keys = (e: BrokerRegistryEntry) => Object.keys(toSignupCheck(matchBrokerOffice(e, registry))).sort();
    expect(keys(withPhone)).toEqual(keys(noPhone));
  });

  it('실패는 오류 코드만', () => {
    expect(toSignupCheck({ status: 'NOT_FOUND' })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('실패 잠금', () => {
  it(`${LOCK_MAX_FAILS}번 틀리면 잠기고 ${LOCK_MS / 60000}분 뒤 풀린다`, () => {
    let rec = undefined as ReturnType<typeof recordFail> | undefined;
    for (let i = 0; i < LOCK_MAX_FAILS - 1; i++) rec = recordFail(rec, 1000 + i);
    expect(isLocked(rec, 2000)).toBe(false);
    rec = recordFail(rec, 2000);
    expect(isLocked(rec, 2000)).toBe(true);
    expect(isLocked(rec, 1000 + LOCK_MS)).toBe(false);
    expect(recordFail(rec, 1000 + LOCK_MS)).toEqual({ count: 1, since: 1000 + LOCK_MS });
  });
});

describe('makeConfirmCode', () => {
  it('4자리, 같은 숫자 4개는 건너뛴다', () => {
    const seq = [0, 0.11111, 0.4827];
    let i = 0;
    expect(makeConfirmCode(() => seq[i++])).toBe('4827');
    expect(makeConfirmCode(() => 0.0042)).toBe('0042');
  });

  it('무작위 1000번 모두 형식이 맞다', () => {
    for (let n = 0; n < 1000; n++) {
      const c = makeConfirmCode(Math.random);
      expect(c).toMatch(/^\d{4}$/);
      expect(c).not.toMatch(/^(\d)\1{3}$/);
    }
  });
});
