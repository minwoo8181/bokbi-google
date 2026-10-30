/**
 * 문자 훅 경로 (app/api/auth/sms-hook): 서명 없는 요청 거절, Solapi 키 전엔 503, 키가 있으면 문자 한 통 + 문구 길이
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITE_CONTENT } from '@/config/siteContent';
import { bytesToBase64 } from '@/lib/data/supabase/crypto';
import { POST } from '@/app/api/auth/sms-hook/route';
import { parseHookSecrets, signWebhook } from '../webhook';

const secret = `v1,whsec_${bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))}`;
const body = JSON.stringify({ user: { id: 'u1', phone: '821012345678' }, sms: { otp: '482913' } });

async function signedRequest(b = body) {
  const ts = Math.floor(Date.now() / 1000);
  const signature = await signWebhook(b, 'msg_1', ts, parseHookSecrets(secret)[0]);
  return new Request('http://localhost/api/auth/sms-hook', {
    method: 'POST',
    body: b,
    headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': String(ts), 'webhook-signature': signature },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('문자 훅 경로', () => {
  it('비밀값이 설정 안 됐으면 503', async () => {
    vi.stubEnv('SEND_SMS_HOOK_SECRET', '');
    expect((await POST(await signedRequest())).status).toBe(503);
  });

  it('서명 없거나 틀린 요청은 401 (문자 폭탄 막기)', async () => {
    vi.stubEnv('SEND_SMS_HOOK_SECRET', secret);
    expect((await POST(new Request('http://localhost/x', { method: 'POST', body }))).status).toBe(401);
    const req = await signedRequest();
    const tampered = new Request(req.url, { method: 'POST', headers: req.headers, body: body.replace('482913', '000000') });
    expect((await POST(tampered)).status).toBe(401);
  });

  it('서명은 맞지만 Solapi 키 전이면 503 (배포 전엔 테스트 번호만 씀)', async () => {
    vi.stubEnv('SEND_SMS_HOOK_SECRET', secret);
    const res = await POST(await signedRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { http_code: 503, message: 'sms provider not configured' } });
  });

  it('키가 있으면 받는 번호(국내 형식)로 인증번호 문자 한 통, 성공 응답 {}', async () => {
    vi.stubEnv('SEND_SMS_HOOK_SECRET', secret);
    vi.stubEnv('SOLAPI_API_KEY', 'k');
    vi.stubEnv('SOLAPI_API_SECRET', 's');
    vi.stubEnv('SOLAPI_SENDER', '02-1234-5678');
    const sent: unknown[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ failedMessageList: [] }), { status: 200 });
    });
    const res = await POST(await signedRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    expect(sent).toEqual([{ messages: [{ to: '01012345678', from: '0212345678', text: SITE_CONTENT.sms.otp.replace('{code}', '482913') }] }]);
  });

  it('인증번호 문자는 단문(90바이트) 안에', () => {
    const text = SITE_CONTENT.sms.otp.replace('{code}', '000000');
    const bytes = [...text].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x7f ? 2 : 1), 0);
    expect(bytes).toBeLessThanOrEqual(90);
  });
});
