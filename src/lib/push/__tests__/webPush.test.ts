import { describe, expect, it } from 'vitest';
import { base64UrlToBytes, parsePushDevice, parsePushPrefs, vapidFromEnv } from '../webPush';

const gen = () => ({ publicKey: 'GEN-PUB', privateKey: 'GEN-PRIV' });

describe('parsePushDevice', () => {
  it('브라우저가 준 기기 주소만 (https, 키 두 개)', () => {
    const ok = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', expirationTime: null, keys: { p256dh: 'BPx', auth: 'au' } };
    expect(parsePushDevice(ok)).toEqual({ endpoint: ok.endpoint, keys: { p256dh: 'BPx', auth: 'au' } });
    expect(parsePushDevice({ ...ok, endpoint: 'http://x.com/a' })).toBeNull();
    expect(parsePushDevice({ ...ok, keys: { p256dh: '', auth: 'a' } })).toBeNull();
    expect(parsePushDevice({ endpoint: ok.endpoint })).toBeNull();
    expect(parsePushDevice('nope')).toBeNull();
  });
});

describe('parsePushPrefs', () => {
  it('빠지거나 이상한 칸은 기본값 (새 가입 신청만 꺼짐)', () => {
    expect(parsePushPrefs(null)).toEqual({ MORNING: true, OVERDUE: true, SERVICE: true, SIGNUP: false });
    expect(parsePushPrefs({ MORNING: false, SIGNUP: true, SERVICE: 'yes' })).toEqual({ MORNING: false, OVERDUE: true, SERVICE: true, SIGNUP: true });
  });
});

describe('vapidFromEnv', () => {
  const env = { NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'PUB', VAPID_PRIVATE_KEY: 'PRIV', VAPID_SUBJECT: 'mailto:a@b.c' };

  it('세 값이 다 있으면 그대로 (배포·개발 같음)', () => {
    expect(vapidFromEnv(env, true, gen)).toEqual({ publicKey: 'PUB', privateKey: 'PRIV', subject: 'mailto:a@b.c' });
    expect(vapidFromEnv(env, false, gen)).toEqual({ publicKey: 'PUB', privateKey: 'PRIV', subject: 'mailto:a@b.c' });
  });

  it('배포 빌드에서 하나라도 없거나 연락처 형식이 틀리면 null', () => {
    expect(vapidFromEnv({ ...env, VAPID_PRIVATE_KEY: ' ' }, true, gen)).toBeNull();
    expect(vapidFromEnv({ ...env, VAPID_SUBJECT: 'a@b.c' }, true, gen)).toBeNull();
    expect(vapidFromEnv({}, true, gen)).toBeNull();
  });

  it('개발 서버: 키가 없으면 임시 키, 연락처가 없으면 개발용 주소', () => {
    expect(vapidFromEnv({}, false, gen)).toEqual({ publicKey: 'GEN-PUB', privateKey: 'GEN-PRIV', subject: 'mailto:dev@bokbi.local' });
    expect(vapidFromEnv({ ...env, VAPID_SUBJECT: '' }, false, gen)).toEqual({ publicKey: 'PUB', privateKey: 'PRIV', subject: 'mailto:dev@bokbi.local' });
  });
});

describe('base64UrlToBytes', () => {
  it('base64url(패딩 없음) → 바이트', () => {
    expect([...base64UrlToBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
    expect(base64UrlToBytes('')).toHaveLength(0);
  });
});
