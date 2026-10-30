/**
 * 관리자 웹 푸시 공통 (순수 함수): 브라우저가 준 기기 주소 검사, VAPID 키 고르기, 공개 키 변환.
 * 키 값은 서버 밖으로 공개 키만 나간다 (비밀 키는 VAPID_PRIVATE_KEY, 서버 전용)
 */
import { z } from 'zod';
import { DEFAULT_PUSH_PREFS, PUSH_KINDS, type PushPrefs } from '@/lib/admin/push';

export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const deviceSchema = z.object({
  endpoint: z.string().url().startsWith('https://').max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** PushSubscription.toJSON() 결과 → 기기 (형식이 다르면 null) */
export function parsePushDevice(raw: unknown): PushDevice | null {
  const r = deviceSchema.safeParse(raw);
  return r.success ? { endpoint: r.data.endpoint, keys: { p256dh: r.data.keys.p256dh, auth: r.data.keys.auth } } : null;
}

/** 저장된 알림 종류 설정 → 빠진 칸은 기본값 */
export function parsePushPrefs(raw: unknown): PushPrefs {
  const out = { ...DEFAULT_PUSH_PREFS };
  if (raw && typeof raw === 'object') {
    for (const k of PUSH_KINDS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'boolean') out[k] = v;
    }
  }
  return out;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/**
 * 환경변수의 VAPID 키 (세 값이 모두 있어야). 개발 서버에서만 없으면 임시 키(generate)로 — 서버를 다시 켜면 바뀌어 기기를 다시 켜야 함.
 * 배포 빌드에서 하나라도 없으면 null (알림 카드가 "키 없음")
 */
export function vapidFromEnv(
  env: Record<string, string | undefined>,
  production: boolean,
  generate: () => { publicKey: string; privateKey: string },
): VapidKeys | null {
  const publicKey = (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim();
  const privateKey = (env.VAPID_PRIVATE_KEY ?? '').trim();
  const subject = (env.VAPID_SUBJECT ?? '').trim();
  const subjectOk = subject.startsWith('mailto:') || subject.startsWith('https://');
  if (publicKey && privateKey && subjectOk) return { publicKey, privateKey, subject };
  if (production) return null;
  const keys = publicKey && privateKey ? { publicKey, privateKey } : generate();
  return { ...keys, subject: subjectOk ? subject : 'mailto:dev@bokbi.local' };
}

/** base64url 공개 키 → pushManager.subscribe의 applicationServerKey */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
