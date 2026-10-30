/**
 * 확인 코드 원문은 신청한 휴대폰에만 (A4, 서버엔 해시만). 등록번호와 같이 남겨 다른 사무소 신청에 섞이지 않게 한다.
 * 브라우저 저장소 단계는 신청 자체에 코드가 들어 있어 이 저장을 쓰지 않는다
 */
import type { BrokerApplication } from './application';
import type { KeyValueStore } from '@/lib/data/repo';

export const SIGNUP_CODE_KEY = 'bokbi_signup_code';

export function parseSignupCode(raw: string | null): { regNo: string; code: string } | null {
  try {
    const v = JSON.parse(raw ?? 'null') as unknown;
    if (!v || typeof v !== 'object') return null;
    const { regNo, code } = v as Record<string, unknown>;
    return typeof regNo === 'string' && typeof code === 'string' && /^\d{4}$/.test(code) ? { regNo, code } : null;
  } catch {
    return null;
  }
}

/** 서버 신청(코드 빈칸)에 이 휴대폰에 남긴 코드를 붙인다. 등록번호가 다르면 그대로 */
export function withStoredCode(app: BrokerApplication | null, stored: { regNo: string; code: string } | null): BrokerApplication | null {
  if (!app || app.code || !stored || stored.regNo !== app.regNo) return app;
  return { ...app, code: stored.code };
}

export function saveSignupCode(store: KeyValueStore, regNo: string, code: string | null): void {
  try {
    if (code) store.set(SIGNUP_CODE_KEY, JSON.stringify({ regNo, code }));
    else store.remove(SIGNUP_CODE_KEY);
  } catch {
    // 저장이 막힌 브라우저: 다음에 들어오면 "새 확인 코드 받기"
  }
}

export function loadSignupCode(store: KeyValueStore): { regNo: string; code: string } | null {
  try {
    return parseSignupCode(store.get(SIGNUP_CODE_KEY));
  } catch {
    return null;
  }
}
