/**
 * 중개사 가입 동의 기록 규칙 (A6, 결정론). 같은 약관 버전·항목은 한 번만 남긴다 (다시 인증해도 줄이 늘지 않게).
 * 저장: 브라우저 저장소 단계 = BROKER_CONSENTS_KEY, Supabase = consents(context BROKER_SIGNUP)
 */
import type { ConsentKey } from '@/components/analysis/ConsentGroup';
import type { ConsentRecord } from '@/lib/data/repo';

export const BROKER_CONSENTS_KEY = 'bokbi_broker_consents';
const KEYS: readonly ConsentKey[] = ['TERMS', 'COLLECT', 'PROVIDE'];

/** 아직 이 약관 버전으로 남기지 않은 항목만 (중복·모르는 항목 제외, 순서는 TERMS·COLLECT·PROVIDE) */
export function consentsToAdd(existing: readonly Pick<ConsentRecord, 'key' | 'termsVersion'>[], keys: readonly ConsentKey[], termsVersion: string): ConsentKey[] {
  if (!termsVersion.trim()) return [];
  const done = new Set(existing.filter((r) => r.termsVersion === termsVersion).map((r) => r.key));
  return KEYS.filter((k) => keys.includes(k) && !done.has(k));
}

export function parseConsentRecords(raw: string | null): ConsentRecord[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    return Array.isArray(v)
      ? v.filter(
          (r): r is ConsentRecord =>
            !!r && typeof r === 'object' && KEYS.includes((r as ConsentRecord).key) && typeof (r as ConsentRecord).termsVersion === 'string' && typeof (r as ConsentRecord).at === 'string',
        )
      : [];
  } catch {
    return [];
  }
}
