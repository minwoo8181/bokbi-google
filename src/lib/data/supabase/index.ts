/**
 * 저장소 Supabase 구현 (A2, 설계 docs/handover/supabase-schema.md §6·§7 4단계).
 * - DB 포트(port.ts)만 쓴다 → 운영은 supabase-js 서버 클라이언트, 시험은 PGlite. 같은 계약 테스트(__tests__/contract.test.ts)를 통과
 * - 권한은 DB(RLS·RPC)가 판단, 화면 규칙은 기존 TS 함수 그대로(sendBlock·dealState·applyDeals)
 * - 규칙 판단의 시각은 서버 시계(clock) — 브라우저가 넘긴 시각은 믿지 않는다. 기록 시각은 DB now()
 * - 동·호수·연락처는 contacts만(서버가 암호화·복호화, crypto.ts), 가입 신청은 서버 액션(A4), 크레딧 더 받기 투표는 행동 기록(A7)
 */
import type { ConsentKey } from '@/components/analysis/ConsentGroup';
import { resolveOpenYear, sortApplications } from '@/lib/broker/application';
import { consentsToAdd } from '@/lib/broker/signupConsents';
import { sendBlock } from '@/lib/broker/feed';
import { EMPTY_WORKSPACE } from '@/lib/broker/mockMarket';
import { applyDeals, dealState, type DealEvent } from '@/lib/deal/deal';
import { MAX_MATCH } from '@/lib/requests/stage';
import type { BrokerOffer, OwnerRequest } from '@/lib/requests/types';
import type { AdminAction } from '@/lib/admin/adminLog';
import type { ContactPurpose, Repos, Result, SendError } from '../repo';
import { byteaToBytes, bytesToBase64, contactAad, type ContactCrypto } from './crypto';
import { eq, inList, type DbPort, type DbResult, type Filter } from './port';
import {
  applicationFromOffice,
  iso,
  dealsFromRows,
  disclosureFromRow,
  offerFromOwnerCard,
  offerFromRow,
  requestFromRow,
  sentFromRow,
  visitFromRow,
  walletFromLedger,
  type DealEventRow,
  type DisclosureRow,
  type LedgerRow,
  type OfferRow,
  type OfficeRow,
  type OwnerCardRow,
  type RequestRow,
  type VisitRow,
} from './map';

export interface Viewer {
  uid: string;
  role: 'owner' | 'broker' | 'admin';
}

export interface SupabaseReposOptions {
  db: DbPort;
  /** 로그인한 사람 (서버가 세션에서 정함) */
  viewer: Viewer;
  /** 연락처 암호화 (서버 비밀값 키). 의뢰 만들기·열람에만 필요 */
  contacts?: ContactCrypto;
  clock?: () => Date;
}

interface AdminActionRow {
  id: string;
  at: unknown;
  target: AdminAction['target'] | 'BROKER_SIGNUP';
  request_id: string | null;
  offer_id: string | null;
  result: AdminAction['result'];
}

interface RevealRow {
  dong_ho_enc: unknown;
  owner_name_enc: unknown;
  tenant_phone_enc: unknown;
  memo_enc: unknown;
  key_version: number;
  owner_phone: string | null;
}

/** 확인 코드 해시는 본인에게도 열 권한이 없어 칸을 골라 읽는다 */
const OFFICE_COLS =
  'id, user_id, reg_no, office_name, ceo_name, office_phone, address, open_year, agent_count, strengths, conditions, status, submitted_at, reviewed_at, reject_reason, promise_kept, promise_total';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID.test(s);

/** 오류면 던짐 (예상한 앱 오류가 아니면 화면이 아니라 서버 오류로) */
function must<T>(r: DbResult<T>): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** 예상한 앱 오류 코드면 Result 실패로, 아니면 던짐 */
function expected<E extends string>(r: DbResult<unknown>, allowed: readonly E[]): { ok: false; error: E } | null {
  if (!r.error) return null;
  if ((allowed as readonly string[]).includes(r.error.message)) return { ok: false, error: r.error.message as E };
  throw new Error(r.error.message);
}

const OK = { ok: true as const, value: undefined };

export function createSupabaseRepos({ db, viewer, contacts: cipher, clock = () => new Date() }: SupabaseReposOptions): Repos {
  const needCipher = () => {
    if (!cipher) throw new Error('CONTACT_ENC_KEY 없음: 연락처 암호화 키가 설정되지 않음');
    return cipher;
  };
  const kstYear = () => Number(new Date(clock().getTime() + 9 * 3_600_000).toISOString().slice(0, 4));

  const select = async <T>(table: string, filters: Filter[] = [], columns?: string) => must(await db.select<T>(table, { columns, filters }));

  async function myOffice(): Promise<OfficeRow | null> {
    return (await select<OfficeRow>('broker_offices', [eq('user_id', viewer.uid)], OFFICE_COLS))[0] ?? null;
  }

  /** 의뢰 행 → 화면 의뢰. 집주인은 카드 함수로(사무소 id 없이), 중개사·관리자는 RLS가 보여 주는 카드만 */
  async function build(row: RequestRow): Promise<OwnerRequest> {
    const visits = (await select<VisitRow>('visits', [eq('request_id', row.id)])).map(visitFromRow);
    if (row.owner_id === viewer.uid) {
      const cards = must(await db.rpc<OwnerCardRow[]>('owner_offer_cards', { p_request: row.id }));
      const disclosed = must(await db.rpc<DisclosureRow[]>('request_disclosures', { p_request: row.id }));
      const byOffer = new Map(disclosed.map((d) => [d.offer_id, disclosureFromRow(d)]));
      const year = kstYear();
      return requestFromRow(row, {
        offers: cards.map((c) => offerFromOwnerCard(c, byOffer.get(c.offer_id), year)),
        matched: cards.map((c) => ({ id: c.offer_id, matchedAt: c.matched_at, releasedAt: c.released_at })),
        visits,
      });
    }
    const rows = await select<OfferRow>('offers', [eq('request_id', row.id)]);
    const officeIds = [...new Set(rows.map((o) => o.office_id))];
    const offices = officeIds.length ? await select<OfficeRow>('broker_offices', [inList('id', officeIds)], OFFICE_COLS) : [];
    const byId = new Map(offices.map((o) => [o.id, o]));
    return requestFromRow(row, {
      offers: rows.map((o) => offerFromRow(o, byId.get(o.office_id))),
      matched: rows.map((o) => ({ id: o.id, matchedAt: o.matched_at, releasedAt: o.released_at })),
      visits,
    });
  }

  async function getRequest(id: string): Promise<OwnerRequest | null> {
    if (!isUuid(id)) return null;
    const row = (await select<RequestRow>('requests', [eq('id', id)]))[0];
    return row ? build(row) : null;
  }

  async function events(requestId: string) {
    return dealsFromRows(await select<DealEventRow>('deal_events', [eq('request_id', requestId)]));
  }

  async function workspace() {
    const office = await myOffice();
    if (!office) return EMPTY_WORKSPACE;
    const ledger = await select<LedgerRow>('credit_ledger', [eq('office_id', office.id)]);
    const offers = await select<OfferRow>('offers', [eq('office_id', office.id)]);
    const requestIds = [...new Set(offers.map((o) => o.request_id))];
    const requests = requestIds.length ? await select<RequestRow>('requests', [inList('id', requestIds)]) : [];
    const checks = offers.length ? dealsFromRows(await select<DealEventRow>('deal_events', [inList('offer_id', offers.map((o) => o.id))])) : {};
    const byId = new Map(requests.map((r) => [r.id, r]));
    const sent = offers
      .map((o) => sentFromRow(o, byId.get(o.request_id), dealState(checks[o.id] ?? []).ownerCheck))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    return { wallet: walletFromLedger(ledger), sent, moreCreditsTaps: [] };
  }

  const saleChange = async (requestId: string, action: string, reason?: string): Promise<Result<void, 'NO_REQUEST'>> => {
    if (!isUuid(requestId)) return { ok: false, error: 'NO_REQUEST' };
    const r = await db.rpc('owner_sale_change', { p_request: requestId, p_action: action, p_reason: reason ?? null });
    return expected(r, ['NO_REQUEST'] as const) ?? OK;
  };

  const appendEvent = async (requestId: string, offerId: string, body: Record<string, unknown>, effects: Record<string, unknown> | null = null) => {
    const { kind, ...rest } = body;
    return must(await db.rpc<string>('append_deal_event', { p_request: requestId, p_offer: offerId, p_kind: kind, p_body: rest, p_effects: effects }));
  };

  return {
    requests: {
      async create({ blind, secret, termsVersion }) {
        const c = needCipher();
        // id를 먼저 정해 암호문 AAD("의뢰 id:칸")에 쓴다 → 다른 의뢰로 옮겨 붙이면 복호화 실패
        const id = globalThis.crypto.randomUUID();
        const seal = async (field: Parameters<typeof contactAad>[1], plain: string) => bytesToBase64(await c.encrypt(plain, contactAad(id, field)));
        const memo = secret.visitMemo || secret.optionMemo ? await seal('memo', JSON.stringify({ visitMemo: secret.visitMemo, optionMemo: secret.optionMemo })) : null;
        const sealed = {
          dongHo: await seal('dongHo', secret.dongHo),
          ownerName: await seal('ownerName', secret.ownerName),
          tenantPhone: secret.tenantPhone ? await seal('tenantPhone', secret.tenantPhone) : null,
          memo,
          keyVersion: c.version,
        };
        return must(await db.rpc<string>('submit_request', { p_request: { ...blind, id }, p_contacts: sealed, p_terms_version: termsVersion }));
      },
      async list() {
        const filters = viewer.role === 'owner' ? [eq('owner_id', viewer.uid)] : [];
        const rows = await select<RequestRow>('requests', filters);
        return Promise.all(rows.map(build));
      },
      async get(id) {
        return getRequest(id);
      },
      async refresh(r) {
        return (await getRequest(r.id)) ?? r;
      },
      async confirmMatch(id, offerIds) {
        if (offerIds.length === 0) return { ok: false, error: 'EMPTY' };
        if (offerIds.length > MAX_MATCH) return { ok: false, error: 'TOO_MANY' };
        if (!isUuid(id)) return { ok: false, error: 'NO_REQUEST' };
        const r = await db.rpc('confirm_match', { p_request: id, p_offer_ids: offerIds });
        return expected(r, ['NO_REQUEST'] as const) ?? OK;
      },
      async release(id, offerId) {
        must(await db.rpc('release_offer', { p_request: id, p_offer: offerId }));
      },
      async setShowing(id, showing) {
        must(await db.update('requests', { showing }, [eq('id', id)]));
      },
      pause: (id, reason) => saleChange(id, 'PAUSE', reason),
      async resume(id) {
        const r = await saleChange(id, 'RESUME');
        if (!r.ok) throw new Error(r.error);
      },
      end: (id, reason) => saleChange(id, reason),
      async changePrice(id, plan) {
        if (!isUuid(id)) return { ok: false, error: 'NO_REQUEST' };
        const r = await db.rpc('owner_change_price', { p_request: id, p_price: plan.priceManwon, p_fee: plan.feeWon, p_legal_max: plan.legalMaxWon });
        return expected(r, ['NO_REQUEST', 'WRONG_STAGE'] as const) ?? OK;
      },
    },

    offers: {
      async send({ requestId, strengths, blocking }): Promise<Result<BrokerOffer, SendError>> {
        const office = await myOffice();
        if (office?.status !== 'APPROVED') return { ok: false, error: 'NOT_APPROVED' };
        const request = await getRequest(requestId);
        if (!request) return { ok: false, error: 'NO_REQUEST' };
        const ws = await workspace();
        // 화면과 같은 순서로 먼저 막고(기한 지난 일 먼저 포함), DB가 크레딧·중복을 다시 강제
        const block = sendBlock({ request, sent: ws.sent, wallet: ws.wallet, now: clock(), blocking });
        if (block) return { ok: false, error: block };
        const r = await db.rpc<string>('send_request', { p_request: requestId, p_strengths: strengths });
        const fail = expected(r, ['NOT_APPROVED', 'NO_REQUEST', 'ALREADY_SENT', 'CLOSED', 'NO_CREDIT'] as const);
        if (fail) return fail;
        const row = (await select<OfferRow>('offers', [eq('id', r.data)]))[0];
        return { ok: true, value: offerFromRow(row, office) };
      },
      async confirmOwner(requestId, offerId, how) {
        await appendEvent(requestId, offerId, { kind: 'OWNER_CHECKED', how });
      },
      async postAd(requestId, offerId, url) {
        if (!isUuid(offerId)) return { ok: false, error: 'NO_SENT' };
        const mine = (await select<OfferRow>('offers', [eq('id', offerId)]))[0];
        if (!mine || mine.request_id !== requestId) return { ok: false, error: 'NO_SENT' };
        const evs = dealsFromRows(await select<DealEventRow>('deal_events', [eq('offer_id', offerId)]));
        if (!dealState(evs[offerId] ?? []).ownerCheck) return { ok: false, error: 'OWNER_CHECK_FIRST' };
        must(await db.update('offers', { ad_url: url, ad_posted_at: clock().toISOString() }, [eq('id', offerId)]));
        return OK;
      },
      async removeAd(requestId, offerId) {
        // DB가 내린 광고를 기록에 남기고 링크를 비움
        await appendEvent(requestId, offerId, { kind: 'AD_REMOVED' });
      },
      async setDelay(_requestId, offerId, reason) {
        must(await db.update('offers', { delay_reason: reason, delay_at: clock().toISOString() }, [eq('id', offerId)]));
      },
      async fileFakeReport(requestId, offerId) {
        const r = await db.rpc('file_fake_report', { p_request: requestId, p_offer: offerId });
        return expected(r, ['NO_OFFER', 'AD_POSTED', 'ALREADY_REPORTED'] as const) ?? OK;
      },
      async decideFakeReport(requestId, offerId, verdict) {
        const r = await db.rpc('decide_fake_report', { p_request: requestId, p_offer: offerId, p_verdict: verdict });
        return expected(r, ['NO_REPORT', 'ALREADY_DECIDED'] as const) ?? OK;
      },
    },

    deals: {
      events,
      async append(requestId, offerId, body) {
        if (body.kind === 'REVIEW') {
          must(await db.rpc('submit_review', { p_request: requestId, p_offer: offerId, p_stars: body.stars, p_chips: body.chips }));
          const review = (await events(requestId))[offerId]?.filter((e) => e.kind === 'REVIEW').at(-1);
          if (!review) throw new Error('REVIEW_NOT_SAVED');
          return review;
        }
        // 집주인 답·직접 알림이면 단계 결과(계약 완료·해제)를 TS 규칙으로 계산해 같은 트랜잭션에 넘김 (deal.applyDeals)
        let effects: Record<string, unknown> | null = null;
        if (body.kind === 'ANSWER' || body.kind === 'OWNER_DECLARED') {
          const request = await getRequest(requestId);
          if (request && request.stage !== 'ENDED') {
            const before = await events(requestId);
            const probe = { ...body, id: 'probe', at: clock().toISOString() } as DealEvent;
            const next = applyDeals(request, { ...before, [offerId]: [...(before[offerId] ?? []), probe] }, clock());
            if (next.stage !== request.stage && (next.stage === 'CONTRACTED' || next.stage === 'ENDED')) effects = { stage: next.stage };
          }
        }
        const id = await appendEvent(requestId, offerId, body as Record<string, unknown>, effects);
        const saved = dealsFromRows(await select<DealEventRow>('deal_events', [eq('id', id)]))[offerId]?.[0];
        if (!saved) throw new Error('DEAL_EVENT_NOT_SAVED');
        return saved;
      },
    },

    visits: {
      /** 화면이 넘긴 전체 목록과 저장된 것을 비교: 새 방문은 추가, 취소·확인 표시만 수정 (기록은 지우지 않음) */
      async save(requestId, visits) {
        const current = new Map((await select<VisitRow>('visits', [eq('request_id', requestId)])).map((v) => [v.id, v]));
        for (const v of visits) {
          const cur = current.get(v.id);
          if (!cur) {
            if (!v.canceledAt) must(await db.insert('visits', [{ request_id: requestId, offer_id: v.offerId, visit_date: v.date, visit_hour: v.hour }]));
            continue;
          }
          const patch: Record<string, unknown> = {};
          if (v.canceledAt && !cur.canceled_at) Object.assign(patch, { canceled_at: v.canceledAt, canceled_by: v.canceledBy ?? (viewer.role === 'owner' ? 'OWNER' : 'BROKER') });
          const acked = v.ackedBy ?? [];
          if (acked.join('|') !== (cur.acked_by ?? []).join('|')) patch.acked_by = acked;
          if (Object.keys(patch).length) must(await db.update('visits', patch, [eq('id', v.id)]));
        }
      },
    },

    credits: {
      workspace,
      async settle() {
        const office = await myOffice();
        if (office?.status !== 'APPROVED') return workspace();
        must(await db.rpc('grant_weekly_credits'));
        return workspace();
      },
      // 크레딧 더 받기(페이크 도어) 기록은 A7(행동 기록 서버 저장)에서 events로 — 지금은 남기지 않음
      async tapMoreCredits() {},
      async answerMoreCredits() {},
    },

    applications: {
      async get() {
        const office = await myOffice();
        return office ? applicationFromOffice(office) : null;
      },
      /**
       * A4 (2026-10-29): 신청은 서버 액션 submitBrokerApplication(명단 대조 + 코드 서버 발급, 서버 키 함수)으로만.
       * null(반려 뒤 다시 신청) = 할 일 없음 — 반려된 행은 새 신청이 덮어씀
       */
      async save(app) {
        if (app) throw new Error('USE_SUBMIT_ACTION');
      },
      /** A6: 본인 동의만 (RLS consents_insert), 같은 약관 버전·항목은 한 번 */
      async recordConsents(keys, termsVersion) {
        const mine = await select<{ consent_key: ConsentKey; terms_version: string }>(
          'consents',
          [eq('user_id', viewer.uid), eq('context', 'BROKER_SIGNUP')],
          'consent_key,terms_version',
        );
        const add = consentsToAdd(mine.map((r) => ({ key: r.consent_key, termsVersion: r.terms_version })), keys, termsVersion);
        if (add.length === 0) return;
        must(await db.insert('consents', add.map((k) => ({ user_id: viewer.uid, consent_key: k, context: 'BROKER_SIGNUP', request_id: null, terms_version: termsVersion }))));
      },
    },

    admin: {
      async actions() {
        const rows = must(await db.rpc<AdminActionRow[]>('admin_actions_list'));
        // 가입 승인·반려는 DB 처리 기록에만 있는 종류 (앱 관리자 기록은 허위 매물·복비 두 가지)
        return rows
          .filter((a) => a.target !== 'BROKER_SIGNUP' && a.request_id && a.offer_id)
          .map((a) => ({ id: a.id, at: iso(a.at), target: a.target as AdminAction['target'], requestId: a.request_id!, offerId: a.offer_id!, result: a.result }));
      },
      async append(action) {
        // 허위 매물 판정 기록은 판정 RPC(decide_fake_report)가 같은 트랜잭션에 이미 남김
        if (action.target === 'FAKE_REPORT') return OK;
        const r = await db.rpc('admin_log_fee_review', { p_request: action.requestId, p_offer: action.offerId, p_result: action.result });
        return expected(r, ['DECIDED'] as const) ?? OK;
      },
      // A2'': 관리자는 RLS로 모든 사무소 행을 읽는다 (확인 코드 해시·실패 횟수는 칸 권한으로 안 보임)
      async applications() {
        const rows = await select<OfficeRow>('broker_offices', [], OFFICE_COLS);
        return sortApplications(
          rows.map((o) => {
            const { code: _code, ...rest } = applicationFromOffice(o);
            return { ...rest, id: o.id };
          }),
        );
      },
      async decideApplication(id, decision, now) {
        // approve_broker는 없는 신청도 NOT_PENDING으로 돌려줘서, 있는지 먼저 본다 (관리자는 RLS로 모든 행)
        if (!isUuid(id) || (await select<{ id: string }>('broker_offices', [eq('id', id)], 'id')).length === 0) return { ok: false, error: 'NOT_FOUND' };
        let args: Record<string, unknown>;
        if (decision.kind === 'REJECT') {
          if (!decision.reason.trim()) return { ok: false, error: 'REASON_REQUIRED' };
          args = { p_office: id, p_decision: 'REJECT', p_reject_reason: decision.reason.trim() };
        } else {
          // 연도 범위 검사는 서버 TS(같은 규칙), 코드 확인·실패 횟수는 DB
          const year = resolveOpenYear(decision.registryOpenYear, decision.enteredYear, now);
          if (!year.ok) return year;
          args = { p_office: id, p_decision: 'APPROVE', p_spoken_code: decision.spokenCode, p_open_year: year.year };
        }
        const code = must(await db.rpc<string | null>('approve_broker', args));
        if (!code) return OK;
        return { ok: false, error: code === 'NOT_PENDING' || code === 'CODE_MISMATCH' || code === 'YEAR_REQUIRED' || code === 'LOCKED' || code === 'REASON_REQUIRED' ? code : 'NOT_FOUND' };
      },
    },

    contacts: {
      /** DB가 권한 확인 + 열람 기록을 남기고 암호문을 주면 서버가 복호화 (원문은 이 응답에만) */
      async reveal(requestId, purpose, _now, reason) {
        if (!isUuid(requestId)) return { ok: false, error: 'NO_REQUEST' };
        const r = await db.rpc<RevealRow[]>('reveal_contact', { p_request: requestId, p_purpose: purpose, p_admin_reason: reason?.trim() || null });
        const fail = expected(r, ['NO_REQUEST', 'NOT_ALLOWED', 'REASON_REQUIRED'] as const);
        if (fail) return fail;
        const row = r.data![0];
        // 파기된 연락처 (의뢰 종료 30일 뒤)
        if (!row) return { ok: true, value: { dongHo: '', contact: null } };
        const c = needCipher();
        const open = async (field: Parameters<typeof contactAad>[1], v: unknown) => {
          const bytes = byteaToBytes(v);
          return bytes ? c.decrypt(bytes, contactAad(requestId, field), row.key_version) : '';
        };
        const memoRaw = await open('memo', row.memo_enc);
        const memo = memoRaw ? (JSON.parse(memoRaw) as { visitMemo?: string; optionMemo?: string }) : {};
        return {
          ok: true,
          value: {
            dongHo: await open('dongHo', row.dong_ho_enc),
            contact: {
              ownerName: await open('ownerName', row.owner_name_enc),
              ownerPhone: row.owner_phone ?? '',
              tenantPhone: await open('tenantPhone', row.tenant_phone_enc),
              visitMemo: memo.visitMemo ?? '',
              optionMemo: memo.optionMemo ?? '',
            },
          },
        };
      },
      async accessLog() {
        const rows = must(await db.rpc<{ at: unknown; request_id: string; purpose: ContactPurpose; reason: string | null }[]>('access_log_list'));
        return rows.map((a) => ({ at: iso(a.at), requestId: a.request_id, purpose: a.purpose, reason: a.reason }));
      },
    },
  };
}
