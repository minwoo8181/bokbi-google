import { describe, expect, it } from 'vitest';
import { actionsFor, appendAdminAction, isResolved, parseAdminLog, type AdminAction } from '../adminLog';

const act = (id: string, result: AdminAction['result'], at = `2026-11-02T0${id.length}:00:00Z`, target: AdminAction['target'] = 'FEE_OVERCHARGED'): AdminAction => ({
  id,
  at,
  target,
  requestId: 'R1',
  offerId: 'O1',
  result,
});
const add = (log: AdminAction[], a: AdminAction) => {
  const r = appendAdminAction(log, a);
  if (!r.ok) throw new Error(r.error);
  return r.log;
};

describe('관리자 처리 기록', () => {
  it('연락함은 여러 번, 확인·반려는 한 번만 (끝난 일은 다시 판정 안 됨)', () => {
    let log = add([], act('a', 'CONTACTED'));
    log = add(log, act('bb', 'CONTACTED'));
    expect(isResolved(log, 'FEE_OVERCHARGED', 'R1', 'O1')).toBe(false);
    log = add(log, act('ccc', 'CONFIRMED'));
    expect(isResolved(log, 'FEE_OVERCHARGED', 'R1', 'O1')).toBe(true);
    expect(appendAdminAction(log, act('dddd', 'REJECTED'))).toEqual({ ok: false, error: 'DECIDED' });
    // 끝난 뒤에도 연락 기록은 남길 수 있음
    expect(add(log, act('eeeee', 'CONTACTED'))).toHaveLength(4);
  });

  it('같은 id는 한 번만, 대상별로 나눠 오래된 것부터', () => {
    const log = add(add([], act('bb', 'CONTACTED')), act('a', 'CONTACTED', '2026-11-02T00:00:00Z', 'FAKE_REPORT'));
    expect(add(log, act('bb', 'CONTACTED'))).toBe(log);
    expect(actionsFor(log, 'FEE_OVERCHARGED', 'R1', 'O1').map((a) => a.id)).toEqual(['bb']);
    expect(actionsFor(log, 'FAKE_REPORT', 'R1', 'O1').map((a) => a.id)).toEqual(['a']);
  });

  it('저장된 값 읽기: 깨진 줄·모르는 결과는 버림', () => {
    const raw = JSON.stringify([act('a', 'CONTACTED'), { ...act('b', 'CONTACTED'), result: 'BAN' }, { id: 1 }, null]);
    expect(parseAdminLog(raw).map((a) => a.id)).toEqual(['a']);
    expect(parseAdminLog('{oops')).toEqual([]);
    expect(parseAdminLog(null)).toEqual([]);
  });
});
