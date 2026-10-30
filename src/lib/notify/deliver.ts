/**
 * 알림 문자 받는 사람 찾기·보내기 (B2). 서버 키 DB + 전화번호 찾기 + 문자 보내기를 받아서 쓴다 → 시험은 PGlite·가짜 문자.
 * 전화번호는 로그인 계정(휴대폰 인증)에서만 읽고, 어디에도 따로 저장하지 않는다
 */
import type { Result } from '@/lib/data/repo';
import type { BrokerOffer } from '@/lib/requests/types';
import { eq, type DbPort, type DbResult } from '@/lib/data/supabase/port';
import { noticeText, type Notice, type NoticeTarget } from './notices';

export interface NotifyDeps {
  /** 서버 키 DB */
  db: DbPort;
  phoneOf(userId: string): Promise<string | null>;
  sms(to: string, text: string): Promise<boolean>;
}

export type DeliverResult = 'SENT' | 'NO_TARGET' | 'NO_PHONE' | 'FAILED';

const first = <T>(r: DbResult<T[]>): T | null => (r.error ? null : (r.data[0] ?? null));

async function userOf(db: DbPort, target: NoticeTarget): Promise<string | null> {
  if ('owner' in target) return first(await db.select<{ owner_id: string | null }>('requests', { columns: 'owner_id', filters: [eq('id', target.owner)] }))?.owner_id ?? null;
  const officeId =
    'office' in target ? target.office : (first(await db.select<{ office_id: string }>('offers', { columns: 'office_id', filters: [eq('id', target.broker)] }))?.office_id ?? null);
  if (!officeId) return null;
  return first(await db.select<{ user_id: string }>('broker_offices', { columns: 'user_id', filters: [eq('id', officeId)] }))?.user_id ?? null;
}

export async function deliver(deps: NotifyDeps, n: Notice): Promise<DeliverResult> {
  try {
    const userId = await userOf(deps.db, n.target);
    if (!userId) return 'NO_TARGET';
    const phone = await deps.phoneOf(userId);
    if (!phone) return 'NO_PHONE';
    return (await deps.sms(phone, noticeText(n))) ? 'SENT' : 'FAILED';
  } catch {
    return 'FAILED';
  }
}

export async function deliverAll(deps: NotifyDeps, notices: readonly Notice[]): Promise<Record<DeliverResult, number>> {
  const out: Record<DeliverResult, number> = { SENT: 0, NO_TARGET: 0, NO_PHONE: 0, FAILED: 0 };
  for (const n of notices) out[await deliver(deps, n)] += 1;
  return out;
}

/** 의뢰 → "단지 평형 거래" (없으면 빈칸) */
async function complexOf(db: DbPort, requestId: string): Promise<string> {
  const r = first(await db.select<{ complex_name: string; pyeong_label: string; trade_type: string }>('requests', { columns: 'complex_name,pyeong_label,trade_type', filters: [eq('id', requestId)] }));
  return r ? `${r.complex_name} ${r.pyeong_label.split(' · ')[0]} ${r.trade_type}` : '';
}

const isOk = (r: unknown): boolean => !!r && typeof r === 'object' && (r as Result<unknown, string>).ok === true;
const str = (v: unknown) => (typeof v === 'string' ? v : null);

/**
 * 서버 액션(저장소 메서드)이 성공한 뒤 보낼 알림. 실패한 동작은 알림 없음.
 * 첫 요청 = 카드 순서 1번 (한 의뢰에 한 번)
 */
export async function noticesAfter(db: DbPort, call: { group: string; method: string; args: unknown[] }, result: unknown): Promise<Notice[]> {
  if (!isOk(result)) return [];
  const { group, method, args } = call;
  if (group === 'offers' && method === 'send') {
    const offer = (result as { value: BrokerOffer }).value;
    const requestId = str((args[0] as { requestId?: unknown } | undefined)?.requestId);
    return offer?.order === 1 && requestId ? [{ kind: 'FIRST_OFFER', target: { owner: requestId }, vars: { complex: await complexOf(db, requestId) } }] : [];
  }
  if (group === 'requests' && method === 'confirmMatch') {
    const requestId = str(args[0]);
    const offerIds = Array.isArray(args[1]) ? args[1].filter((x): x is string => typeof x === 'string') : [];
    if (!requestId) return [];
    const complex = await complexOf(db, requestId);
    return offerIds.map((id) => ({ kind: 'MATCHED', target: { broker: id }, vars: { complex } }));
  }
  if (group === 'admin' && method === 'decideApplication') {
    const officeId = str(args[0]);
    const kind = (args[1] as { kind?: unknown } | undefined)?.kind;
    return officeId ? [{ kind: kind === 'APPROVE' ? 'SIGNUP_APPROVED' : 'SIGNUP_REJECTED', target: { office: officeId }, vars: {} }] : [];
  }
  if (group === 'offers' && method === 'decideFakeReport') {
    const [requestId, offerId, verdict] = [str(args[0]), str(args[1]), args[2]];
    if (!requestId || !offerId) return [];
    return [{ kind: verdict === 'CONFIRMED' ? 'FAKE_CONFIRMED' : 'FAKE_REJECTED', target: { broker: offerId }, vars: { complex: await complexOf(db, requestId) } }];
  }
  return [];
}
