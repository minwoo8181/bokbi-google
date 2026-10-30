'use server';

/**
 * 중개사 가입 서버 액션. 명단(대표자·전화)은 여기서만 읽고 화면에는 SignupCheck만 내려보낸다.
 * A4 (2026-10-29): Supabase면 잠금·이미 가입·신청 저장·확인 코드 발급을 서버에서 (규칙 lib/broker/signupService.ts).
 * 접속 주소는 원문 없이 가명(HMAC)으로만 잠금 표에. 브라우저 저장소 단계는 잠금이 서버 메모리, 신청은 화면이 이 브라우저에 저장
 */
import { randomInt } from 'node:crypto';
import { headers } from 'next/headers';
import registryJson from '@/data/brokers/dasan-offices.json';
import type { Result } from '@/lib/data/repo';
import { supabaseJsDb, type SupabaseLike } from '@/lib/data/supabase/supabaseJs';
import type { BrokerRegistryEntry, BrokerSignupInput } from '@/lib/broker/registry';
import { type FailRecord, type SignupCheck, makeConfirmCode } from '@/lib/broker/signup';
import { checkOffice, dbLock, memoryLock, reissueCode, submitApplication, type SignupInput, type SubmitError, type Submitted } from '@/lib/broker/signupService';
import { serverSupabase } from '@/lib/supabase/server';
import { serverPseudonym, serviceSupabase } from '@/lib/supabase/serviceClient';

const registry = registryJson.offices as BrokerRegistryEntry[];
/** 브라우저 저장소 단계 잠금 (워커 인스턴스마다 따로라 완전한 잠금은 아님) */
const fails = new Map<string, FailRecord>();

const newCode = () => makeConfirmCode(() => randomInt(0, 2 ** 32) / 2 ** 32);
const supabaseMode = () => process.env.NEXT_PUBLIC_DATA_BACKEND === 'supabase';

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/** 잠금 저장소와 키: Supabase면 DB + 주소 가명, 아니면 메모리 + 주소 */
async function lockFor() {
  const ip = await clientIp();
  const service = serviceSupabase();
  const key = service ? serverPseudonym('signup-ip', ip) : null;
  if (service && key) return { lock: dbLock(supabaseJsDb(service as unknown as SupabaseLike)), key, service };
  return { lock: memoryLock(fails), key: ip, service: null };
}

export async function checkBrokerOffice(input: BrokerSignupInput): Promise<SignupCheck> {
  const { lock, key } = await lockFor();
  return checkOffice(lock, key, input, registry);
}

/** 로그인한 사람 (Supabase 휴대폰 인증). 전화번호는 화면 값이 아니라 인증된 계정에서 */
async function signedInUser(): Promise<{ userId: string; phone: string } | null> {
  const client = await serverSupabase();
  const user = client ? (await client.auth.getUser()).data.user : null;
  return user ? { userId: user.id, phone: user.phone ? `0${user.phone.replace(/^\+?82/, '')}` : '' } : null;
}

export type SubmitResult = Result<Submitted, SubmitError | 'NOT_CONFIGURED'>;

/**
 * 가입 신청: 명단 대조를 서버에서 다시 하고 확인 코드를 서버가 만든다.
 * Supabase = 해시로 저장 후 원문 코드를 한 번만 돌려줌, 브라우저 저장소 단계 = 코드만 돌려주고 화면이 이 브라우저에 저장
 */
export async function submitBrokerApplication(input: SignupInput): Promise<SubmitResult> {
  const { lock, key, service } = await lockFor();
  if (!supabaseMode()) {
    const check = await checkOffice(lock, key, input, registry);
    return check.ok ? { ok: true, value: { code: newCode(), check } } : { ok: false, error: check.error };
  }
  if (!service) return { ok: false, error: 'NOT_CONFIGURED' };
  const who = await signedInUser();
  if (!who) return { ok: false, error: 'NOT_SIGNED_IN' };
  return submitApplication({ db: supabaseJsDb(service as unknown as SupabaseLike), lock, key, registry, makeCode: newCode }, who, input);
}

/** 다른 휴대폰에서 새 확인 코드 받기 (Supabase만, 대표님 A안) */
export async function reissueSignupCode(): Promise<Result<string, 'NOT_PENDING' | 'NOT_SIGNED_IN' | 'NOT_CONFIGURED'>> {
  const service = serviceSupabase();
  if (!supabaseMode() || !service) return { ok: false, error: 'NOT_CONFIGURED' };
  const who = await signedInUser();
  if (!who) return { ok: false, error: 'NOT_SIGNED_IN' };
  return reissueCode(supabaseJsDb(service as unknown as SupabaseLike), who.userId, newCode);
}
