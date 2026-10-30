import { describe, expect, it } from 'vitest';
import { createLocalAuth } from '../local';

describe('휴대폰 인증 흉내 (local)', () => {
  const auth = createLocalAuth();

  it('휴대폰 번호면 보내기 성공, 아니면 BAD_PHONE', async () => {
    expect(await auth.sendCode('010-1234-5678')).toEqual({ ok: true, value: undefined });
    expect(await auth.sendCode('02-123-4567')).toEqual({ ok: false, error: 'BAD_PHONE' });
  });

  it('숫자 6자리면 통과(국제 형식 번호), 아니면 WRONG_CODE', async () => {
    expect(await auth.verifyCode('010-1234-5678', '123456')).toEqual({ ok: true, value: { id: 'local-+821012345678', phone: '+821012345678' } });
    expect(await auth.verifyCode('010-1234-5678', '12345a')).toEqual({ ok: false, error: 'WRONG_CODE' });
  });

  it('세션 없음', async () => {
    expect(await auth.currentUser()).toBeNull();
  });
});
