/**
 * Send SMS Hook 서명 확인 (lib/sms/webhook.ts): 맞는 서명만 통과, 본문 변조·시간 어긋남·다른 비밀값 거절, 비밀값 교체 중 둘 다 통과
 */
import { describe, expect, it } from 'vitest';
import { bytesToBase64 } from '@/lib/data/supabase/crypto';
import { parseHookSecrets, signWebhook, verifyWebhook, WEBHOOK_TOLERANCE_SEC } from '../webhook';

const rawKey = () => bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
const now = 1_793_000_000;
const body = JSON.stringify({ user: { phone: '821012345678' }, sms: { otp: '123456' } });

describe('문자 훅 서명 확인', () => {
  it('Standard Webhooks 명세의 공식 시험 값과 같은 서명', async () => {
    const keys = parseHookSecrets('whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw');
    const payload = '{"test": 2432232314}';
    expect(await signWebhook(payload, 'msg_p5jXN8AQM9LWM0D4loKWxJek', 1614265330, keys[0])).toBe('v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=');
  });

  it('Supabase 형식 비밀값(v1,whsec_…)으로 만든 서명은 통과', async () => {
    const raw = rawKey();
    const [key] = parseHookSecrets(`v1,whsec_${raw}`);
    const signature = await signWebhook(body, 'msg_1', now, key);
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature }, [key], now)).toEqual({ ok: true });
  });

  it('본문을 한 글자라도 바꾸거나 id를 바꾸면 거절', async () => {
    const [key] = parseHookSecrets(`v1,whsec_${rawKey()}`);
    const signature = await signWebhook(body, 'msg_1', now, key);
    expect(await verifyWebhook(body.replace('123456', '654321'), { id: 'msg_1', timestamp: String(now), signature }, [key], now)).toEqual({ ok: false, error: 'BAD_SIGNATURE' });
    expect(await verifyWebhook(body, { id: 'msg_2', timestamp: String(now), signature }, [key], now)).toEqual({ ok: false, error: 'BAD_SIGNATURE' });
  });

  it('다른 비밀값·시간 어긋남·헤더 빠짐·비밀값 없음', async () => {
    const [key] = parseHookSecrets(`v1,whsec_${rawKey()}`);
    const [other] = parseHookSecrets(`v1,whsec_${rawKey()}`);
    const signature = await signWebhook(body, 'msg_1', now, key);
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature }, [other], now)).toEqual({ ok: false, error: 'BAD_SIGNATURE' });
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature }, [key], now + WEBHOOK_TOLERANCE_SEC + 1)).toEqual({ ok: false, error: 'STALE' });
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: null, signature }, [key], now)).toEqual({ ok: false, error: 'MISSING_HEADERS' });
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature }, [], now)).toEqual({ ok: false, error: 'NO_SECRET' });
  });

  it('비밀값 교체 중: 새·옛 비밀값 어느 쪽 서명도 통과, 헤더에 서명 여러 개도', async () => {
    const a = rawKey();
    const b = rawKey();
    const keys = parseHookSecrets(`v1,whsec_${a}|v1,whsec_${b}`);
    expect(keys).toHaveLength(2);
    const sigOld = await signWebhook(body, 'msg_1', now, keys[1]);
    expect(await verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature: `v1,garbage ${sigOld}` }, keys, now)).toEqual({ ok: true });
  });
});
