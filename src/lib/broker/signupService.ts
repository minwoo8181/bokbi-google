/**
 * 중개사 가입 서버 규칙 (A4, 대표님 2026-10-29). 서버 액션(app/agent/register/actions.ts)과 시험(PGlite)이 같은 코드를 쓴다.
 * - 사무소 확인: 잠금 확인 → 명단 대조(서버) → 실패면 +1, 맞으면 지움 → 이미 가입(확인 대기·승인)이면 ALREADY_JOINED
 * - 신청: 같은 확인을 서버에서 다시(화면이 보낸 값을 믿지 않음) → 확인 코드 서버 발급 → DB엔 해시만 (submit_broker_application)
 * - 새 코드 받기: 확인 대기 신청의 코드만 바꿈, 틀린 횟수는 그대로 (reissue_signup_code)
 * 잠금은 Supabase면 DB(private.signup_fails), 브라우저 저장소 단계면 서버 메모리(memoryLock)
 */
import type { DbPort } from '@/lib/data/supabase/port';
import type { Result } from '@/lib/data/repo';
import { type BrokerRegistryEntry, type BrokerSignupInput, matchBrokerOffice } from './registry';
import { type FailRecord, type SignupCheck, isLocked, recordFail, toSignupCheck } from './signup';

export interface SignupLock {
  /** 잠겼으면 LOCKED, regNo가 이미 확인 대기·승인이면 ALREADY_JOINED */
  gate(key: string, regNo: string | null): Promise<'LOCKED' | 'ALREADY_JOINED' | null>;
  record(key: string, ok: boolean): Promise<void>;
}

function must<T>(r: { data: T; error: null } | { data: null; error: { message: string } }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export function dbLock(db: DbPort): SignupLock {
  return {
    async gate(key, regNo) {
      const v = must(await db.rpc<string | null>('signup_gate', { p_key: key, p_reg_no: regNo }));
      return v === 'LOCKED' || v === 'ALREADY_JOINED' ? v : null;
    },
    async record(key, ok) {
      must(await db.rpc('signup_record', { p_key: key, p_ok: ok }));
    },
  };
}

/** 브라우저 저장소 단계: 서버 메모리 (워커마다 따로라 완전하지 않음 — Supabase로 바꾸면 DB) */
export function memoryLock(fails: Map<string, FailRecord>, now: () => number = Date.now): SignupLock {
  return {
    async gate(key) {
      return isLocked(fails.get(key), now()) ? 'LOCKED' : null;
    },
    async record(key, ok) {
      if (ok) fails.delete(key);
      else fails.set(key, recordFail(fails.get(key), now()));
    },
  };
}

const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

/** 사무소 확인 (화면 ① "사무소 확인" 버튼) */
export async function checkOffice(lock: SignupLock, key: string, input: BrokerSignupInput, registry: readonly BrokerRegistryEntry[]): Promise<SignupCheck> {
  if ((await lock.gate(key, null)) === 'LOCKED') return { ok: false, error: 'LOCKED' };
  const fields = { regNo: clip(input.regNo, 40), ceo: clip(input.ceo, 40), office: clip(input.office, 80) };
  if (!fields.regNo.trim() || !fields.ceo.trim() || !fields.office.trim()) return { ok: false, error: 'EMPTY' };
  const check = toSignupCheck(matchBrokerOffice(fields, registry));
  await lock.record(key, check.ok);
  if (check.ok && (await lock.gate(key, check.regNo)) === 'ALREADY_JOINED') return { ok: false, error: 'ALREADY_JOINED' };
  return check;
}

export interface SignupInput extends BrokerSignupInput {
  strengths: string[];
  conditions: string[];
}

/** 잘하는 점·가능한 것: 짧은 글자 10개까지만 (DB 제약과 같음) */
export function cleanChips(list: unknown): string[] {
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.slice(0, 40)).slice(0, 10) : [];
}

export type SubmitError = Extract<SignupCheck, { ok: false }>['error'] | 'NOT_SIGNED_IN';
export interface Submitted {
  code: string;
  check: Extract<SignupCheck, { ok: true }>;
}

/** 가입 신청 (Supabase): 확인을 서버에서 다시 → 코드 발급 → 해시로 저장. 원문 코드는 이 결과에만 */
export async function submitApplication(
  deps: { db: DbPort; lock: SignupLock; key: string; registry: readonly BrokerRegistryEntry[]; makeCode: () => string },
  who: { userId: string; phone: string },
  input: SignupInput,
): Promise<Result<Submitted, SubmitError>> {
  const check = await checkOffice(deps.lock, deps.key, input, deps.registry);
  if (!check.ok) return { ok: false, error: check.error };
  const code = deps.makeCode();
  const r = must(
    await deps.db.rpc<string | null>('submit_broker_application', {
      p_user: who.userId,
      p_reg_no: check.regNo,
      p_office_name: check.office,
      p_ceo_name: clip(input.ceo, 40).trim(),
      p_office_phone: clip(who.phone, 20),
      p_address: clip(check.address, 200),
      p_open_year: check.openYear,
      p_strengths: cleanChips(input.strengths),
      p_conditions: cleanChips(input.conditions),
      p_code: code,
    }),
  );
  if (r === 'ALREADY_JOINED' || r === 'NOT_SIGNED_IN') return { ok: false, error: r };
  return { ok: true, value: { code, check } };
}

/** 다른 휴대폰에서 새 확인 코드 받기 (대표님 A안). 예전 코드는 못 씀, 틀린 횟수는 그대로 */
export async function reissueCode(db: DbPort, userId: string, makeCode: () => string): Promise<Result<string, 'NOT_PENDING'>> {
  const code = makeCode();
  const r = must(await db.rpc<string | null>('reissue_signup_code', { p_user: userId, p_code: code }));
  return r ? { ok: false, error: 'NOT_PENDING' } : { ok: true, value: code };
}
