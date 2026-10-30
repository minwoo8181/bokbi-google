import { describe, expect, it } from 'vitest';
import { addWithdrawRequest, maskPhone, parsePrivacyRequests, PRIVACY_DUE_DAYS, samePhone, withdrawBlock } from '../myInfo';

const now = new Date('2026-10-29T10:00:00+09:00');

describe('내 정보 관리 규칙', () => {
  it('휴대폰 가림: 가운데 뒤 두 자리', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-12**-5678');
    expect(maskPhone('01012345678')).toBe('010-12**-5678');
    expect(maskPhone('011-123-4567')).toBe('011-1**-4567');
  });

  it('같은 번호 비교는 숫자만, 10자리 미만은 같다고 보지 않음', () => {
    expect(samePhone('010-1234-5678', '01012345678')).toBe(true);
    expect(samePhone('010-1234-5678', '010-1234-5679')).toBe(false);
    expect(samePhone('', '')).toBe(false);
  });

  it('진행 중인 의뢰가 있으면 탈퇴 전에 막는다', () => {
    expect(withdrawBlock({ activeRequests: 1 })).toBe('ACTIVE_REQUEST');
    expect(withdrawBlock({ activeRequests: 0 })).toBeNull();
  });

  it(`탈퇴 요청은 처리 기한 ${PRIVACY_DUE_DAYS}일, 같은 번호가 기한 안이면 한 건만`, () => {
    const first = addWithdrawRequest([], { phone: '010-1234-5678', now });
    expect(first.added).toBe(true);
    expect(first.list[0]).toMatchObject({ kind: 'WITHDRAW', phone: '01012345678', dueAt: '2026-11-08T01:00:00.000Z' });
    expect(addWithdrawRequest(first.list, { phone: '01012345678', now }).added).toBe(false);
    // 다른 번호는 따로, 기한이 지나면 새로
    expect(addWithdrawRequest(first.list, { phone: '010-9999-0000', now }).list).toHaveLength(2);
    expect(addWithdrawRequest(first.list, { phone: '01012345678', now: new Date(now.getTime() + 11 * 86_400_000) }).added).toBe(true);
  });

  it('저장값 읽기: 깨진 항목·예전 정정 요청은 버림', () => {
    const ok = addWithdrawRequest([], { phone: '01012345678', now }).list;
    expect(parsePrivacyRequests([...ok, { kind: 'CORRECT', phone: '1', at: 'x', dueAt: 'y' }, null, 3])).toEqual(ok);
    expect(parsePrivacyRequests('nope')).toEqual([]);
  });
});
