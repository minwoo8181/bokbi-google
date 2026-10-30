/**
 * Solapi 문자 보내기 (A1, 키는 배포 직전 — 대표님 결정). WebCrypto + fetch만 써서 Cloudflare Workers에서 그대로 돈다.
 * - 인증 헤더 (Solapi 문서 "API Key 인증"): `HMAC-SHA256 apiKey=…, date=<ISO 8601>, salt=<12~64자>, signature=<HMAC-SHA256(date+salt, API Secret) 16진>`
 *   서버 시각 ±15분 안, 같은 서명 15분 안 재사용 불가 → 요청마다 새 salt
 * - 보내기: POST https://api.solapi.com/messages/v4/send-many/detail, 본문 { messages: [{ to, from, text }] } (공식 Node SDK와 같은 경로)
 * - 받는 번호·보내는 번호는 숫자만 국내 형식 (01012345678). 보내는 번호는 Solapi에 등록한 발신번호
 */

export const SOLAPI_SEND_URL = 'https://api.solapi.com/messages/v4/send-many/detail';

export interface SolapiConfig {
  apiKey: string;
  apiSecret: string;
  /** 등록한 발신번호 (숫자만) */
  sender: string;
}

/** 환경변수 → 설정 (셋 중 하나라도 없으면 null = 아직 연결 전) */
export function solapiConfig(env: Record<string, string | undefined>): SolapiConfig | null {
  const apiKey = env.SOLAPI_API_KEY?.trim();
  const apiSecret = env.SOLAPI_API_SECRET?.trim();
  const sender = env.SOLAPI_SENDER?.replace(/\D/g, '');
  return apiKey && apiSecret && sender ? { apiKey, apiSecret, sender } : null;
}

/** +821012345678 · 821012345678 → 01012345678 */
export function toDomesticNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('82') ? `0${d.slice(2)}` : d;
}

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** 밀리초 없는 ISO 8601 (문서 예시 2019-07-01T00:41:48Z) */
export const solapiDate = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export async function solapiAuthHeader(cfg: Pick<SolapiConfig, 'apiKey' | 'apiSecret'>, date: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(cfg.apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(date + salt)));
  return `HMAC-SHA256 apiKey=${cfg.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)).buffer);

export type SolapiError = 'HTTP_ERROR' | 'REJECTED';

/** 문자 한 통. 실패면 이유 코드와 Solapi가 준 메시지 (로그용 — 화면에 그대로 내보내지 않음) */
export async function sendSolapiSms(
  cfg: SolapiConfig,
  to: string,
  text: string,
  deps: { fetch?: typeof fetch; now?: Date; salt?: string } = {},
): Promise<{ ok: true } | { ok: false; error: SolapiError; detail: string }> {
  const date = solapiDate(deps.now ?? new Date());
  const res = await (deps.fetch ?? fetch)(SOLAPI_SEND_URL, {
    method: 'POST',
    headers: { Authorization: await solapiAuthHeader(cfg, date, deps.salt ?? newSalt()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ to: toDomesticNumber(to), from: cfg.sender, text }] }),
  });
  const json = (await res.json().catch(() => null)) as { errorCode?: string; errorMessage?: string; failedMessageList?: { statusMessage?: string }[] } | null;
  if (!res.ok) return { ok: false, error: 'HTTP_ERROR', detail: `${res.status} ${json?.errorCode ?? ''} ${json?.errorMessage ?? ''}`.trim() };
  // 접수는 됐지만 이 번호로는 못 보냄 (번호 형식·수신 거부 등)
  if (json?.failedMessageList?.length) return { ok: false, error: 'REJECTED', detail: json.failedMessageList[0]?.statusMessage ?? 'failed' };
  return { ok: true };
}
