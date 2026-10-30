/**
 * Solapi 문자 보내기 (lib/sms/solapi.ts) — 실제 발송 없이 가짜 fetch로 요청 모양·인증 헤더·실패 처리 확인
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SOLAPI_SEND_URL, sendSolapiSms, solapiAuthHeader, solapiConfig, solapiDate, toDomesticNumber } from '../solapi';

const cfg = { apiKey: 'NCSAYU7YDBXYORXC', apiSecret: 'test-secret', sender: '0212345678' };

describe('Solapi 문자 보내기', () => {
  it('설정: 키·비밀값·발신번호가 다 있어야 연결 (발신번호는 숫자만)', () => {
    expect(solapiConfig({ SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER: '02-1234-5678' })).toEqual({ apiKey: 'k', apiSecret: 's', sender: '0212345678' });
    expect(solapiConfig({ SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's' })).toBeNull();
  });

  it('번호: 국제 형식 → 국내 숫자', () => {
    expect(toDomesticNumber('+821012345678')).toBe('01012345678');
    expect(toDomesticNumber('821012345678')).toBe('01012345678');
    expect(toDomesticNumber('010-1234-5678')).toBe('01012345678');
  });

  it('인증 헤더: 문서 형식, 서명 = HMAC-SHA256(date+salt) 16진 (Node crypto와 같은 값)', async () => {
    const date = solapiDate(new Date('2019-07-01T00:41:48.123Z'));
    expect(date).toBe('2019-07-01T00:41:48Z');
    const expected = createHmac('sha256', cfg.apiSecret).update(date + 'jqsba2jxjnrjor').digest('hex');
    expect(await solapiAuthHeader(cfg, date, 'jqsba2jxjnrjor')).toBe(`HMAC-SHA256 apiKey=NCSAYU7YDBXYORXC, date=2019-07-01T00:41:48Z, salt=jqsba2jxjnrjor, signature=${expected}`);
  });

  it('요청: 발송 경로에 messages 한 통 (받는 번호 국내 형식, 등록 발신번호)', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ groupInfo: { count: { total: 1 } }, failedMessageList: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await sendSolapiSms(cfg, '+821012345678', '[복비] 인증번호 123456', { fetch: fakeFetch, salt: 'abcdefabcdef' })).toEqual({ ok: true });
    expect(calls[0].url).toBe(SOLAPI_SEND_URL);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ messages: [{ to: '01012345678', from: '0212345678', text: '[복비] 인증번호 123456' }] });
    expect(String((calls[0].init.headers as Record<string, string>).Authorization)).toMatch(/^HMAC-SHA256 apiKey=NCSAYU7YDBXYORXC, date=.+Z, salt=abcdefabcdef, signature=[0-9a-f]{64}$/);
  });

  it('실패: HTTP 오류·접수됐지만 번호 실패', async () => {
    const http = (async () => new Response(JSON.stringify({ errorCode: 'InvalidApiKey', errorMessage: 'bad key' }), { status: 403 })) as unknown as typeof fetch;
    expect(await sendSolapiSms(cfg, '01012345678', 'x', { fetch: http })).toEqual({ ok: false, error: 'HTTP_ERROR', detail: '403 InvalidApiKey bad key' });
    const rejected = (async () => new Response(JSON.stringify({ failedMessageList: [{ statusMessage: '수신번호 형식 오류' }] }), { status: 200 })) as unknown as typeof fetch;
    expect(await sendSolapiSms(cfg, '01012345678', 'x', { fetch: rejected })).toEqual({ ok: false, error: 'REJECTED', detail: '수신번호 형식 오류' });
  });
});
