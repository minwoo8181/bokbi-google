/**
 * Supabase Send SMS Hook 서명 확인 (Standard Webhooks, A1). 우리 문자 경로를 아무나 불러 문자 폭탄을 보내지 못하게
 * Supabase가 보낸 요청인지 확인한다. WebCrypto만 써서 Node·Cloudflare Workers 둘 다 같은 코드.
 * - 비밀값: 대시보드가 주는 "v1,whsec_<base64>" (교체 중이면 "|"로 여러 개)
 * - 서명 대상: "<webhook-id>.<webhook-timestamp>.<본문>" → HMAC-SHA256 → base64, 헤더 webhook-signature "v1,<서명>" (공백으로 여러 개)
 * - 시각이 5분보다 어긋나면 거절 (같은 요청 다시 보내기 막기)
 */
import { base64ToBytes, bytesToBase64 } from '@/lib/data/supabase/crypto';

export const WEBHOOK_TOLERANCE_SEC = 5 * 60;

export type WebhookError = 'NO_SECRET' | 'MISSING_HEADERS' | 'STALE' | 'BAD_SIGNATURE';

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/** "v1,whsec_abc|v1,whsec_def" → 키 바이트들 */
export function parseHookSecrets(raw: string | undefined): Uint8Array<ArrayBuffer>[] {
  if (!raw?.trim()) return [];
  return raw
    .split('|')
    .map((s) => s.trim().replace(/^v1,/, '').replace(/^whsec_/, ''))
    .filter(Boolean)
    .map((b64) => base64ToBytes(b64));
}

async function sign(key: Uint8Array<ArrayBuffer>, content: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(content))));
}

/** 길이가 같은 문자열을 시간 차 없이 비교 */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyWebhook(
  body: string,
  h: WebhookHeaders,
  secrets: Uint8Array<ArrayBuffer>[],
  nowSec: number,
): Promise<{ ok: true } | { ok: false; error: WebhookError }> {
  if (secrets.length === 0) return { ok: false, error: 'NO_SECRET' };
  if (!h.id || !h.timestamp || !h.signature) return { ok: false, error: 'MISSING_HEADERS' };
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > WEBHOOK_TOLERANCE_SEC) return { ok: false, error: 'STALE' };
  const given = h.signature
    .split(' ')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('v1,'))
    .map((s) => s.slice(3));
  const content = `${h.id}.${h.timestamp}.${body}`;
  for (const key of secrets) {
    const expected = await sign(key, content);
    if (given.some((g) => sameString(g, expected))) return { ok: true };
  }
  return { ok: false, error: 'BAD_SIGNATURE' };
}

/** 시험·도구용: 같은 방식으로 서명 만들기 */
export async function signWebhook(body: string, id: string, timestamp: number, secret: Uint8Array<ArrayBuffer>): Promise<string> {
  return `v1,${await sign(secret, `${id}.${timestamp}.${body}`)}`;
}
