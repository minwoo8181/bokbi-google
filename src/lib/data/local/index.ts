/**
 * 저장소 브라우저 구현 (목업 단계). 기존 순수 규칙 함수를 그대로 쓰고, 읽고 쓰는 곳만 KeyValueStore로 모았다.
 * 의뢰 원본(집주인 요약·예시 의뢰)은 바깥에서 넣는다(baseRequests) — lib가 화면 목업 파일에 기대지 않게.
 * Supabase 구현(supabase/)이 같은 인터페이스·같은 계약 테스트(__tests__/contract.test.ts)를 통과해야 한다
 */
import { z } from 'zod';
import { APPLICATION_STORAGE_KEY, approveApplication, parseApplication, rejectApplication, sortApplications, type BrokerApplication } from '@/lib/broker/application';
import { answerMoreCredits, recordMoreCreditsTap, refillWeekly, spendCredit } from '@/lib/broker/credits';
import { BROKER_CONSENTS_KEY, consentsToAdd, parseConsentRecords } from '@/lib/broker/signupConsents';
import { decideFakeReport, fileFakeReport, settleFakeRefunds } from '@/lib/broker/fakeReport';
import { buildOffer, sendBlock, type SentRequest } from '@/lib/broker/feed';
import { offerDistanceBand } from '@/app/agent/actions';
import { confirmOwner, postAd } from '@/lib/broker/listing';
import {
  MARKET_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  addOffer,
  appendDealEvent,
  applyMarket,
  clearOfferAd,
  dealsOf,
  parseMarket,
  parseWorkspace,
  setDelayNote,
  setEnded,
  setMatched,
  setPaused,
  setReleased,
  setPrice,
  setResumed,
  setShowing,
  setVisits,
  type BrokerWorkspace,
  type MockMarket,
} from '@/lib/broker/mockMarket';
import { ADMIN_LOG_KEY, appendAdminAction, parseAdminLog } from '@/lib/admin/adminLog';
import { dealState, endByOwner, pauseByOwner, type DealEvent } from '@/lib/deal/deal';
import { settleDealReturns, workspacePromiseStats } from '@/lib/deal/settle';
import { defaultAvailability } from '@/lib/requests/showing';
import { MAX_MATCH } from '@/lib/requests/stage';
import type { OwnerRequest } from '@/lib/requests/types';
import { isRecord, listOf, parseJson } from '../schema';
import type { AccessLogRow, KeyValueStore, Repos } from '../repo';

export const ACCESS_LOG_KEY = 'bokbi_access_log';
/** requests.create로 만든 의뢰 (목업 단계: 예시 의뢰와 함께 목록에 붙음) */
export const LOCAL_REQUESTS_KEY = 'bokbi_local_requests';

/** 브라우저 localStorage (막힌 브라우저면 읽기는 비고 쓰기는 무시) */
export const browserStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/** 테스트용 메모리 저장소 */
export function memoryStore(init: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(init));
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k), dump: () => Object.fromEntries(m) };
}

const accessRowSchema: z.ZodType<AccessLogRow> = z.object({
  at: z.string(),
  requestId: z.string(),
  purpose: z.enum(['OWNER_VIEW', 'MATCHED_BROKER', 'ADMIN_REVIEW']),
  reason: z.string().nullable(),
});

export function createLocalRepos(opts: { store?: KeyValueStore; baseRequests: (now: Date) => OwnerRequest[] }): Repos {
  const store = opts.store ?? browserStore;
  const market = () => parseMarket(store.get(MARKET_STORAGE_KEY));
  const saveMarket = (m: MockMarket) => store.set(MARKET_STORAGE_KEY, JSON.stringify(m));
  const workspace = () => parseWorkspace(store.get(WORKSPACE_STORAGE_KEY));
  const saveWorkspace = (w: BrokerWorkspace) => store.set(WORKSPACE_STORAGE_KEY, JSON.stringify(w));
  const application = () => parseApplication(store.get(APPLICATION_STORAGE_KEY));
  /** 이 저장소에서 만든 의뢰 (깨진 값이면 없음) */
  const created = (): OwnerRequest[] => {
    const v = parseJson(store.get(LOCAL_REQUESTS_KEY));
    return Array.isArray(v) ? (v.filter((x) => isRecord(x) && typeof x.id === 'string') as unknown as OwnerRequest[]) : [];
  };
  const allRequests = (now: Date) => [...created(), ...opts.baseRequests(now)];
  const requestOf = (id: string, now: Date, m = market()) => {
    const r = allRequests(now).find((x) => x.id === id);
    return r ? applyMarket(r, m) : null;
  };
  let reqSeq = 0;
  const accessLog = () => listOf(accessRowSchema, parseJson(store.get(ACCESS_LOG_KEY)));
  /** 거래 기록 id: 같은 밀리초에 여러 줄이어도 겹치지 않게 */
  let seq = 0;
  const eventId = (offerId: string, at: Date) => `${offerId}-${at.getTime()}-${(seq++).toString(36)}`;

  return {
    requests: {
      async create({ blind, secret }, now) {
        const id = `req-${now.getTime().toString(36)}-${(reqSeq++).toString(36)}`;
        const { details, recommendation: _recommendation, showing, ...rest } = blind;
        const r: OwnerRequest = {
          ...rest,
          id,
          dongHo: secret.dongHo,
          ...(details ? { details } : {}),
          contact: { ownerName: secret.ownerName, ownerPhone: '', tenantPhone: secret.tenantPhone, visitMemo: secret.visitMemo, optionMemo: secret.optionMemo },
          createdAt: now.toISOString(),
          stage: 'RECEIVING',
          endedReason: null,
          endedAt: null,
          offers: [],
          matchedOfferIds: [],
          releasedOfferIds: [],
          matchedAt: null,
          adWindowStartedAt: null,
          paused: null,
          showing: showing ?? defaultAvailability(),
          visits: [],
          contract: null,
        };
        store.set(LOCAL_REQUESTS_KEY, JSON.stringify([r, ...created()]));
        return id;
      },
      async list(now) {
        const m = market();
        return allRequests(now).map((r) => applyMarket(r, m));
      },
      async get(id, now) {
        return requestOf(id, now);
      },
      async refresh(r) {
        return applyMarket(r, market());
      },
      async confirmMatch(id, offerIds, at) {
        // 목업: 집주인이 "다시 요청"으로 만든 의뢰는 예시 원본에 없어도 기록은 남긴다 (Supabase는 의뢰 행이 먼저 있음)
        if (offerIds.length === 0) return { ok: false, error: 'EMPTY' };
        if (offerIds.length > MAX_MATCH) return { ok: false, error: 'TOO_MANY' };
        saveMarket(setMatched(market(), id, offerIds, at));
        return { ok: true, value: undefined };
      },
      async release(id, offerId) {
        saveMarket(setReleased(market(), id, offerId));
      },
      async setShowing(id, showing) {
        saveMarket(setShowing(market(), id, showing));
      },
      async pause(id, reason, at) {
        const m = market();
        const r = requestOf(id, at, m);
        // 예시 원본에 없는 의뢰(다시 요청)는 멈춤만 기록 (방문은 그 의뢰에 저장된 것이 없음)
        const paused = setPaused(m, id, reason, at);
        saveMarket(r ? setVisits(paused, id, pauseByOwner(r, reason, at).visits) : paused);
        return { ok: true, value: undefined };
      },
      async resume(id, at) {
        saveMarket(setResumed(market(), id, at));
      },
      async end(id, reason, at) {
        const m = market();
        const r = requestOf(id, at, m);
        const ended = setEnded(m, id, reason, at);
        saveMarket(r ? setVisits(ended, id, endByOwner(r, reason, at).visits) : ended);
        return { ok: true, value: undefined };
      },
      async changePrice(id, plan, at) {
        // Supabase owner_change_price와 같은 결과: 의뢰 값 + 매칭된 곳(해제 빼고)마다 PRICE_CHANGED
        let m = market();
        const r = requestOf(id, at, m);
        if (!r) return { ok: false, error: 'NO_REQUEST' };
        if (r.stage !== 'IN_PROGRESS') return { ok: false, error: 'WRONG_STAGE' };
        m = setPrice(m, id, { askingPriceManwon: plan.priceManwon, commissionWon: plan.feeWon, legalMaxWon: plan.legalMaxWon });
        for (const offerId of r.matchedOfferIds) {
          const body = { kind: 'PRICE_CHANGED', priceManwon: plan.priceManwon, fromManwon: plan.fromManwon, feeWon: plan.feeWon } as const;
          m = appendDealEvent(m, id, offerId, { id: eventId(offerId, at), at: at.toISOString(), ...body });
        }
        saveMarket(m);
        return { ok: true, value: undefined };
      },
    },

    offers: {
      async send({ requestId, strengths, now, blocking }) {
        const app = application();
        if (app?.status !== 'APPROVED') return { ok: false, error: 'NOT_APPROVED' };
        const m = market();
        const request = requestOf(requestId, now, m);
        if (!request) return { ok: false, error: 'NO_REQUEST' };
        const ws = workspace();
        const block = sendBlock({ request, sent: ws.sent, wallet: ws.wallet, now, blocking });
        if (block) return { ok: false, error: block };
        const spent = spendCredit(ws.wallet, requestId, now);
        if (!spent.ok) return { ok: false, error: 'NO_CREDIT' };
        // 거리 구간: 서버가 그때그때 계산해 구간 이름만 (키 없음·실패면 칩 없이 그대로 보냄)
        const band = await offerDistanceBand({ regNo: app.regNo, aptId: request.aptId }).catch(() => null);
        // 실적(A10): 보낼 때 이 중개사의 약속 이행·계약 수를 카드에 실음
        const offer = {
          ...buildOffer(app, { requestId, existing: request.offers, strengths, now }),
          promise: workspacePromiseStats(ws, m),
          ...(band ? { distanceBand: band } : {}),
        };
        const sent: SentRequest = {
          requestId,
          offerId: offer.id,
          sentAt: now.toISOString(),
          strengths,
          snapshot: { complexName: request.complexName, tradeType: request.tradeType, pyeongLabel: request.pyeongLabel, maskedDongHo: request.maskedDongHo, commissionWon: request.commissionWon },
        };
        saveMarket(addOffer(m, requestId, offer));
        saveWorkspace({ ...ws, wallet: spent.wallet, sent: [sent, ...ws.sent] });
        return { ok: true, value: offer };
      },
      async confirmOwner(requestId, offerId, how, at) {
        // 거래 기록이 기준, 예전 화면용 작업 공간 표시도 함께 (Supabase는 기록만)
        saveWorkspace(confirmOwner(workspace(), requestId, how));
        const event = { id: eventId(offerId, at), at: at.toISOString(), kind: 'OWNER_CHECKED', how } as DealEvent;
        saveMarket(appendDealEvent(market(), requestId, offerId, event));
      },
      async postAd(requestId, offerId, url, at) {
        const s = workspace().sent.find((x) => x.requestId === requestId && x.offerId === offerId);
        if (!s) return { ok: false, error: 'NO_SENT' };
        const m = market();
        // 소유자 확인은 거래 기록(OWNER_CHECKED)이 기준 — 예전 작업 공간 기록(ownerCheck)도 인정 (Supabase는 기록만)
        const checked = s.ownerCheck ?? dealState(dealsOf(m, requestId)[offerId] ?? []).ownerCheck;
        const r = postAd(m, { ...s, ownerCheck: checked }, url, at);
        if (!r.ok) return r;
        saveMarket(r.market);
        return { ok: true, value: undefined };
      },
      async removeAd(requestId, offerId, at) {
        const { market: m, ad } = clearOfferAd(market(), requestId, offerId);
        const event = { id: eventId(offerId, at), at: at.toISOString(), kind: 'AD_REMOVED', ...(ad ? { ad } : {}) } as DealEvent;
        saveMarket(appendDealEvent(m, requestId, offerId, event));
      },
      async setDelay(requestId, offerId, reason, at) {
        saveMarket(setDelayNote(market(), requestId, offerId, reason, at));
      },
      async fileFakeReport(requestId, offerId, at) {
        const r = fileFakeReport(market(), requestId, offerId, at);
        if (!r.ok) return r;
        saveMarket(r.market);
        return { ok: true, value: undefined };
      },
      async decideFakeReport(requestId, offerId, verdict, at) {
        const r = decideFakeReport(market(), requestId, offerId, verdict, at);
        if (!r.ok) return r;
        saveMarket(r.market);
        // 목업: 이 브라우저 중개사 작업 공간도 바로 정산 (Supabase: 같은 RPC 안에서 매칭된 곳 모두 환불)
        const ws = workspace();
        const settled = settleFakeRefunds(ws, r.market, at);
        if (settled !== ws) saveWorkspace(settled);
        return { ok: true, value: undefined };
      },
    },

    deals: {
      async events(requestId) {
        return dealsOf(market(), requestId);
      },
      async append(requestId, offerId, body, at) {
        const event = { ...body, id: eventId(offerId, at), at: at.toISOString() } as DealEvent;
        saveMarket(appendDealEvent(market(), requestId, offerId, event));
        return event;
      },
    },

    visits: {
      async save(requestId, visits) {
        saveMarket(setVisits(market(), requestId, visits));
      },
    },

    credits: {
      async workspace() {
        return workspace();
      },
      async settle(now) {
        const w = workspace();
        if (application()?.status !== 'APPROVED') return w;
        const m = market();
        const next = settleFakeRefunds(settleDealReturns({ ...w, wallet: refillWeekly(w.wallet, now) }, m, now), m, now);
        if (next.wallet !== w.wallet) saveWorkspace(next);
        return next;
      },
      async tapMoreCredits(from, at) {
        const w = workspace();
        saveWorkspace({ ...w, moreCreditsTaps: recordMoreCreditsTap(w.moreCreditsTaps, { at: at.toISOString(), balance: w.wallet.balance, from }) });
      },
      async answerMoreCredits(answer) {
        const w = workspace();
        saveWorkspace({ ...w, moreCreditsTaps: answerMoreCredits(w.moreCreditsTaps, answer) });
      },
    },

    applications: {
      async get() {
        return application();
      },
      async save(app: BrokerApplication | null) {
        if (app) store.set(APPLICATION_STORAGE_KEY, JSON.stringify(app));
        else store.remove(APPLICATION_STORAGE_KEY);
      },
      async recordConsents(keys, termsVersion, at) {
        const list = parseConsentRecords(store.get(BROKER_CONSENTS_KEY));
        const add = consentsToAdd(list, keys, termsVersion).map((key) => ({ key, termsVersion, at: at.toISOString() }));
        if (add.length) store.set(BROKER_CONSENTS_KEY, JSON.stringify([...list, ...add]));
      },
    },

    admin: {
      async actions() {
        return parseAdminLog(store.get(ADMIN_LOG_KEY));
      },
      async append(action) {
        const r = appendAdminAction(parseAdminLog(store.get(ADMIN_LOG_KEY)), action);
        if (!r.ok) return r;
        store.set(ADMIN_LOG_KEY, JSON.stringify(r.log));
        return { ok: true, value: undefined };
      },
      // 목업: 이 브라우저의 가입 신청 1건 (id = 등록번호). 확인 코드는 목록에 싣지 않는다
      async applications() {
        const app = application();
        if (!app) return [];
        const { code: _code, ...rest } = app;
        return sortApplications([{ ...rest, id: app.regNo }]);
      },
      async decideApplication(id, decision, now) {
        const app = application();
        if (!app || app.regNo !== id) return { ok: false, error: 'NOT_FOUND' };
        if (app.status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };
        if (decision.kind === 'REJECT') {
          const next = rejectApplication(app, decision.reason, now);
          if (!next) return { ok: false, error: 'REASON_REQUIRED' };
          store.set(APPLICATION_STORAGE_KEY, JSON.stringify(next));
          return { ok: true, value: undefined };
        }
        const r = approveApplication(app, { spokenCode: decision.spokenCode, registryOpenYear: decision.registryOpenYear, enteredYear: decision.enteredYear, now });
        if (!r.ok) return r;
        store.set(APPLICATION_STORAGE_KEY, JSON.stringify(r.app));
        return { ok: true, value: undefined };
      },
    },

    contacts: {
      async reveal(requestId, purpose, now, reason) {
        const r = requestOf(requestId, now);
        if (!r) return { ok: false, error: 'NO_REQUEST' };
        if (purpose === 'ADMIN_REVIEW' && !reason?.trim()) return { ok: false, error: 'REASON_REQUIRED' };
        if (purpose === 'MATCHED_BROKER') {
          // 이 브라우저 중개사가 매칭 확정됐고 해제되지 않았을 때만 (Supabase: private.is_matched_broker)
          const mine = workspace().sent.find((s) => s.requestId === requestId);
          const matched = !!mine && r.matchedOfferIds.includes(mine.offerId) && !(r.releasedOfferIds ?? []).includes(mine.offerId);
          if (!matched) return { ok: false, error: 'NOT_ALLOWED' };
        }
        const row: AccessLogRow = { at: now.toISOString(), requestId, purpose, reason: purpose === 'ADMIN_REVIEW' ? reason!.trim() : null };
        store.set(ACCESS_LOG_KEY, JSON.stringify([...accessLog(), row]));
        return { ok: true, value: { dongHo: r.dongHo, contact: r.contact ?? null } };
      },
      async accessLog() {
        return accessLog();
      },
    },
  };
}
