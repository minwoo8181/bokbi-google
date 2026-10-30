/**
 * 저장소 계약 테스트: 같은 시나리오를 구현마다 돌린다 (브라우저 저장소 / Supabase — PGlite).
 * 구현마다 "세계"(World)를 만든다: 사람별 저장소(Supabase는 로그인이 달라 RLS가 다름, 브라우저는 한 저장소를 같이 씀),
 * 승인된 중개사 만들기, 받는 중 의뢰 id. 시각은 DB가 now()로 남기므로 "값이 있음"만 보고, 규칙 결과는 그대로 비교
 */
import { describe, expect, it as vit } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { demoRequest } from '@/components/my-requests/mock-requests';
import type { BrokerApplication } from '@/lib/broker/application';
import type { BrokerRegistryEntry } from '@/lib/broker/registry';
import { checkOffice, dbLock, reissueCode, submitApplication, type SignupInput } from '@/lib/broker/signupService';
import { refreshPromiseForOffer } from '@/lib/broker/officeStats';
import { deliverAll, noticesAfter, type NotifyDeps } from '@/lib/notify/deliver';
import { noticeText } from '@/lib/notify/notices';
import type { OwnerRequest } from '@/lib/requests/types';
import { pendingPriceNotices, priceChangePlan } from '@/lib/deal/priceChange';
import { createLocalRepos, memoryStore } from '../local';
import type { NewRequestInput, Repos } from '../repo';
import { createSupabaseRepos } from '../supabase';
import { bytesToBase64, createContactCrypto } from '../supabase/crypto';
import { bootDb, pgliteDb } from './pgliteDb';

const H = 3_600_000;
const t0 = new Date('2026-11-02T03:00:00Z');
const at = (h: number) => new Date(t0.getTime() + h * H);

const APP: BrokerApplication = {
  regNo: '41360-2024-60048',
  office: '예시공인중개사사무소',
  ceo: '이예시',
  code: '0000',
  strengths: ['연락이 빨라요'],
  conditions: [],
  phone: '010-0000-0000',
  submittedAt: at(-48).toISOString(),
  status: 'APPROVED',
  reviewedAt: at(-24).toISOString(),
  rejectReason: null,
  openYear: 2024,
};

/** 받는 중 의뢰 1건 (요청 카드 없음, 연락처 있음) */
const base = (now: Date): OwnerRequest[] => {
  const r = demoRequest(now);
  return [
    {
      ...r,
      id: 'R1',
      offers: [],
      stage: 'RECEIVING',
      matchedOfferIds: [],
      matchedAt: null,
      adWindowStartedAt: null,
      createdAt: at(-1).toISOString(),
      contact: { ownerName: '홍길동', ownerPhone: '010-0000-0001', tenantPhone: '', visitMemo: '', optionMemo: '' },
    },
  ];
};

type ContractActor = 'owner' | 'broker' | 'admin';

/** 시나리오 하나가 쓰는 새 세계 */
interface ContractWorld {
  repos(actor: ContractActor): Repos;
  /** 중개사를 승인된 상태로 (크레딧은 아직 0 — settle하면 이번 주 3개) */
  approveBroker(): Promise<void>;
  /** 중개사 가입 신청만 한 상태 (확인 대기, 확인 코드 APP.code) */
  submitBroker(): Promise<void>;
  /** 받는 중 의뢰 (요청 카드 없음, 집주인 이름 홍길동) */
  requestId: string;
  /** 없는 의뢰 */
  missingId: string;
}

/** skip: 이 구현에서 아직 안 되는 시나리오 제목 (이유는 부르는 쪽 주석) */
function runContract(name: string, makeWorld: () => Promise<ContractWorld>, skip: string[] = []) {
  const it = (title: string, fn: () => Promise<void>) => (skip.includes(title) ? vit.skip : vit)(title, fn);
  // PGlite는 시나리오마다 새 DB를 띄워 느린 기계(전체 동시 실행·GitHub Actions 2코어)에서 기본 5초를 넘길 때가 있다
  describe(`저장소 계약: ${name}`, { timeout: 20_000 }, () => {
    async function approvedWithOffer() {
      const w = await makeWorld();
      await w.approveBroker();
      const broker = w.repos('broker');
      await broker.credits.settle(at(0)); // 이번 주 3개
      const sent = await broker.offers.send({ requestId: w.requestId, strengths: ['연락이 빨라요'], now: at(0), blocking: 0 });
      if (!sent.ok) throw new Error(sent.error);
      return { w, R: w.requestId, owner: w.repos('owner'), broker, admin: w.repos('admin'), offerId: sent.value.id };
    }

    it('승인 전엔 요청을 못 보냄, 승인 뒤 크레딧 1개로 한 번만', async () => {
      const w = await makeWorld();
      const broker = w.repos('broker');
      const R = w.requestId;
      expect(await broker.offers.send({ requestId: R, strengths: [], now: at(0), blocking: 0 })).toEqual({ ok: false, error: 'NOT_APPROVED' });
      await w.approveBroker();
      expect((await broker.credits.settle(at(0))).wallet.balance).toBe(3);
      const first = await broker.offers.send({ requestId: R, strengths: [], now: at(0), blocking: 0 });
      expect(first.ok).toBe(true);
      expect((await broker.credits.workspace()).wallet.balance).toBe(2);
      expect(await broker.offers.send({ requestId: R, strengths: [], now: at(0), blocking: 0 })).toEqual({ ok: false, error: 'ALREADY_SENT' });
      expect(await broker.offers.send({ requestId: w.missingId, strengths: [], now: at(0), blocking: 0 })).toEqual({ ok: false, error: 'NO_REQUEST' });
      expect((await w.repos('owner').requests.get(R, at(0)))?.offers).toHaveLength(1);
    });

    it('기한 지난 일이 있으면 새 요청 잠금 (크레딧 안 씀)', async () => {
      const w = await makeWorld();
      await w.approveBroker();
      const broker = w.repos('broker');
      await broker.credits.settle(at(0));
      expect(await broker.offers.send({ requestId: w.requestId, strengths: [], now: at(0), blocking: 1 })).toEqual({ ok: false, error: 'TODO_FIRST' });
      expect((await broker.credits.workspace()).wallet.balance).toBe(3);
    });

    it('매칭 확정: 0곳·4곳은 거절, 확정하면 진행 중', async () => {
      const { R, owner, offerId } = await approvedWithOffer();
      expect(await owner.requests.confirmMatch(R, [], at(1))).toEqual({ ok: false, error: 'EMPTY' });
      expect(await owner.requests.confirmMatch(R, ['a', 'b', 'c', 'd'], at(1))).toEqual({ ok: false, error: 'TOO_MANY' });
      expect((await owner.requests.confirmMatch(R, [offerId], at(1))).ok).toBe(true);
      expect(await owner.requests.get(R, at(1))).toMatchObject({ stage: 'IN_PROGRESS', matchedOfferIds: [offerId] });
    });

    it('연락처는 열람 함수로만: 매칭 전 중개사 거절, 매칭 뒤 허용, 관리자는 사유 필수, 열 때마다 기록', async () => {
      const { R, owner, broker, admin, offerId } = await approvedWithOffer();
      expect(await broker.contacts.reveal(R, 'MATCHED_BROKER', at(1))).toEqual({ ok: false, error: 'NOT_ALLOWED' });
      await owner.requests.confirmMatch(R, [offerId], at(1));
      const r = await broker.contacts.reveal(R, 'MATCHED_BROKER', at(2));
      expect(r.ok && r.value.contact?.ownerName).toBe('홍길동');
      expect(await admin.contacts.reveal(R, 'ADMIN_REVIEW', at(3), '  ')).toEqual({ ok: false, error: 'REASON_REQUIRED' });
      expect((await admin.contacts.reveal(R, 'ADMIN_REVIEW', at(3), '허위 매물 신고 확인')).ok).toBe(true);
      await owner.requests.release(R, offerId);
      expect(await broker.contacts.reveal(R, 'MATCHED_BROKER', at(4))).toEqual({ ok: false, error: 'NOT_ALLOWED' });
      expect((await admin.contacts.accessLog()).map((l) => l.purpose)).toEqual(['MATCHED_BROKER', 'ADMIN_REVIEW']);
    });

    it('거래 기록은 추가만, 같은 시각 여러 줄도 id가 겹치지 않음', async () => {
      const { R, owner, broker, offerId } = await approvedWithOffer();
      await owner.requests.confirmMatch(R, [offerId], at(1));
      const a = await broker.deals.append(R, offerId, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' }, at(2));
      const b = await broker.deals.append(R, offerId, { kind: 'REPORT', step: 'PROVISIONAL' }, at(2));
      expect(a.id).not.toBe(b.id);
      expect((await broker.deals.events(R))[offerId].map((x) => x.kind)).toEqual(['OWNER_CHECKED', 'REPORT']);
      expect((await owner.deals.events(R))[offerId].map((x) => x.kind)).toEqual(['OWNER_CHECKED', 'REPORT']);
    });

    it('광고: 소유자 확인 전엔 못 올리고, 내리면 링크는 비우고 기록에 남김', async () => {
      const { R, owner, broker, offerId } = await approvedWithOffer();
      await owner.requests.confirmMatch(R, [offerId], at(1));
      const url = 'https://fin.land.naver.com/articles/123456789';
      expect(await broker.offers.postAd(R, offerId, url, at(2))).toEqual({ ok: false, error: 'OWNER_CHECK_FIRST' });
      await broker.deals.append(R, offerId, { kind: 'OWNER_CHECKED', how: 'CONFIRMED' }, at(2));
      expect((await broker.offers.postAd(R, offerId, url, at(3))).ok).toBe(true);
      expect((await owner.requests.get(R, at(3)))?.offers[0].ad?.url).toBe(url);
      await broker.offers.removeAd(R, offerId, at(4));
      expect((await owner.requests.get(R, at(4)))?.offers[0].ad).toBeNull();
      expect((await broker.deals.events(R))[offerId].at(-1)).toMatchObject({ kind: 'AD_REMOVED', ad: { url } });
    });

    it('허위 매물: 신고 → 판정(맞음) → 의뢰 종료 + 크레딧 1개 돌려받음, 다시 판정 불가', async () => {
      const { R, owner, broker, admin, offerId } = await approvedWithOffer();
      await owner.requests.confirmMatch(R, [offerId], at(1));
      expect((await broker.offers.fileFakeReport(R, offerId, at(2))).ok).toBe(true);
      expect((await admin.offers.decideFakeReport(R, offerId, 'CONFIRMED', at(3))).ok).toBe(true);
      expect(await owner.requests.get(R, at(3))).toMatchObject({ stage: 'ENDED', endedReason: 'FAKE_CONFIRMED' });
      expect((await broker.credits.workspace()).wallet.balance).toBe(3);
      expect(await admin.offers.decideFakeReport(R, offerId, 'REJECTED', at(4))).toEqual({ ok: false, error: 'ALREADY_DECIDED' });
    });

    it('집주인 잠시 멈춤·다시 시작·끝냄', async () => {
      const { R, owner, offerId } = await approvedWithOffer();
      await owner.requests.confirmMatch(R, [offerId], at(1));
      await owner.requests.pause(R, '기타', at(2));
      const paused = (await owner.requests.get(R, at(2)))?.paused;
      expect(paused?.reason).toBe('기타');
      expect(Number.isNaN(Date.parse(paused?.pausedAt ?? ''))).toBe(false);
      await owner.requests.resume(R, at(3));
      expect((await owner.requests.get(R, at(3)))?.paused).toBeNull();
      expect((await owner.requests.end(R, 'WITHDRAWN', at(4))).ok).toBe(true);
      expect(await owner.requests.get(R, at(4))).toMatchObject({ stage: 'ENDED', endedReason: 'WITHDRAWN' });
    });

    it('매칭 뒤 희망가 바꾸기: 의뢰 값 + 매칭된 곳마다 기록, 알렸어요 체크 (매칭 전엔 거절)', async () => {
      const { R, owner, offerId } = await approvedWithOffer();
      const before = (await owner.requests.get(R, at(1)))!;
      const plan = priceChangePlan(before, before.askingPriceManwon + 1000);
      expect(await owner.requests.changePrice(R, plan, at(1))).toEqual({ ok: false, error: 'WRONG_STAGE' });
      await owner.requests.confirmMatch(R, [offerId], at(1));
      expect((await owner.requests.changePrice(R, plan, at(2))).ok).toBe(true);
      expect(await owner.requests.get(R, at(2))).toMatchObject({ askingPriceManwon: plan.priceManwon, commissionWon: plan.feeWon, legalMaxWon: plan.legalMaxWon });
      const changed = (await owner.deals.events(R))[offerId]?.filter((e) => e.kind === 'PRICE_CHANGED') ?? [];
      expect(changed).toHaveLength(1);
      expect(changed[0]).toMatchObject({ priceManwon: plan.priceManwon, fromManwon: before.askingPriceManwon, feeWon: plan.feeWon });
      await owner.deals.append(R, offerId, { kind: 'PRICE_NOTIFIED', priceManwon: plan.priceManwon }, at(3));
      expect(pendingPriceNotices(await owner.deals.events(R), [offerId])).toEqual([]);
    });

    it('가입 확인: 관리자 목록(코드 없음) → 코드 틀리면 거절 → 승인하면 요청 가능, 다시 판정 불가', async () => {
      const w = await makeWorld();
      await w.submitBroker();
      const admin = w.repos('admin');
      const list = await admin.admin.applications();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ regNo: APP.regNo, office: APP.office, status: 'PENDING' });
      expect('code' in list[0]).toBe(false);
      const id = list[0].id;
      const approve = (spokenCode: string) => ({ kind: 'APPROVE' as const, spokenCode, registryOpenYear: APP.openYear, enteredYear: '' });
      expect(await admin.admin.decideApplication(id, approve('9999'), at(0))).toEqual({ ok: false, error: 'CODE_MISMATCH' });
      expect(await admin.admin.decideApplication(id, { kind: 'APPROVE', spokenCode: APP.code, registryOpenYear: null, enteredYear: '1970' }, at(0))).toEqual({ ok: false, error: 'YEAR_INVALID' });
      expect(await admin.admin.decideApplication(id, approve(APP.code), at(0))).toEqual({ ok: true, value: undefined });
      expect((await admin.admin.applications())[0]).toMatchObject({ status: 'APPROVED', openYear: APP.openYear });
      expect(await admin.admin.decideApplication(id, { kind: 'REJECT', reason: '확인 전화 안 받음' }, at(1))).toEqual({ ok: false, error: 'NOT_PENDING' });
      const broker = w.repos('broker');
      await broker.credits.settle(at(0));
      expect((await broker.offers.send({ requestId: w.requestId, strengths: [], now: at(0), blocking: 0 })).ok).toBe(true);
    });

    it('가입 확인: 반려는 사유가 있어야, 없는 신청은 NOT_FOUND', async () => {
      const w = await makeWorld();
      await w.submitBroker();
      const admin = w.repos('admin');
      const id = (await admin.admin.applications())[0].id;
      expect(await admin.admin.decideApplication(id, { kind: 'REJECT', reason: '  ' }, at(0))).toEqual({ ok: false, error: 'REASON_REQUIRED' });
      expect(await admin.admin.decideApplication(w.missingId, { kind: 'REJECT', reason: '사유' }, at(0))).toEqual({ ok: false, error: 'NOT_FOUND' });
      expect((await admin.admin.decideApplication(id, { kind: 'REJECT', reason: '대표 공인중개사가 아님' }, at(0))).ok).toBe(true);
      expect((await admin.admin.applications())[0]).toMatchObject({ status: 'REJECTED', rejectReason: '대표 공인중개사가 아님' });
    });

    it('관리자 기록: 확인·반려는 한 번만', async () => {
      const { R, admin, offerId } = await approvedWithOffer();
      const act = (id: string, result: 'CONFIRMED' | 'REJECTED') => ({ id, at: at(0).toISOString(), target: 'FEE_OVERCHARGED' as const, requestId: R, offerId, result });
      expect((await admin.admin.append(act('a', 'CONFIRMED'))).ok).toBe(true);
      expect(await admin.admin.append(act('b', 'REJECTED'))).toEqual({ ok: false, error: 'DECIDED' });
      expect(await admin.admin.actions()).toHaveLength(1);
    });
  });
}

/** 두 구현 모두 집주인이 requests.create로 만든 의뢰로 시작 (비밀 칸은 Supabase에서 암호화) */
const NEW_REQUEST: NewRequestInput = {
  blind: {
    aptId: null,
    complexName: '예시단지',
    tradeType: '매매',
    pyeongLabel: '34평',
    floorLabel: '중층',
    maskedDongHo: '1**동',
    askingPriceManwon: 90000,
    commissionWon: 3_000_000,
    legalMaxWon: 4_500_000,
    occupancy: 'TENANT',
  },
  secret: { dongHo: '101동 1203호', ownerName: '홍길동', tenantPhone: '010-0000-0002', visitMemo: '오후만', optionMemo: '' },
  termsVersion: '2026-10-24',
};

/** 브라우저 저장소: 한 브라우저가 집주인·중개사·관리자를 모두 함 (한 저장소를 같이 씀) */
runContract('브라우저 저장소', async () => {
  const repos = createLocalRepos({ store: memoryStore(), baseRequests: () => [] });
  const requestId = await repos.requests.create(NEW_REQUEST, at(-1));
  return {
    repos: () => repos,
    approveBroker: () => repos.applications.save(APP),
    submitBroker: () => repos.applications.save({ ...APP, status: 'PENDING', reviewedAt: null }),
    requestId,
    missingId: 'NOPE',
  };
});

/**
 * Supabase (PGlite): 시나리오마다 새 DB. 사람마다 로그인이 달라 RLS로 보이는 것이 다르다.
 * 가입 신청은 서버 액션과 같은 길(signupService.submitApplication → 서버 키 함수, A4), 승인은 관리자 RPC(approve_broker)
 */
const SB = {
  owner: '00000000-0000-0000-0000-0000000000a1',
  broker: '00000000-0000-0000-0000-0000000000c1',
  admin: '00000000-0000-0000-0000-0000000000d1',
  office: '10000000-0000-0000-0000-0000000000c1',
} as const;
const SB_SEED = `
  insert into auth.users (id) values ('${SB.owner}'), ('${SB.broker}'), ('${SB.admin}');
  update public.profiles set role = 'admin' where id = '${SB.admin}';
`;
/** 확인 대기 사무소를 바로 넣는 시드 (가입 흐름과 상관없는 시험용) */
const SB_OFFICE_SEED = `
  insert into public.broker_offices (id, user_id, reg_no, office_name, ceo_name, office_phone, open_year, strengths, code_hash)
  values ('${SB.office}', '${SB.broker}', '${APP.regNo}', '${APP.office}', '${APP.ceo}', '${APP.phone}', ${APP.openYear}, '{}', extensions.crypt('${APP.code}', extensions.gen_salt('bf')));
`;
/** 시험용 명단: APP 사무소 한 곳 (실제 명단 대신) */
const TEST_REGISTRY: BrokerRegistryEntry[] = [
  { regNo: APP.regNo, ceo: APP.ceo!, office: APP.office, address: '경기도 남양주시 다산동 1', phone: null, altPhones: [], phoneSource: null, status: '영업중', openYear: APP.openYear },
];

/** 서버 액션 submitBrokerApplication과 같은 호출 (서버 키 = service, 로그인 사용자 = userId) */
async function submitAs(pg: PGlite, userId: string, input: Partial<SignupInput> = {}, code = APP.code) {
  const service = pgliteDb(pg, { uid: null, service: true });
  return submitApplication(
    { db: service, lock: dbLock(service), key: `ip-${userId}-0000000000`, registry: TEST_REGISTRY, makeCode: () => code },
    { userId, phone: APP.phone },
    { regNo: APP.regNo, ceo: APP.ceo!, office: APP.office, strengths: APP.strengths, conditions: [], ...input },
  );
}

runContract('Supabase (PGlite)', async () => {
  const pg = await bootDb();
  await pg.exec(SB_SEED);
  const key = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const contacts = await createContactCrypto({ 1: key }, 1);
  const as = (actor: ContractActor) => pgliteDb(pg, { uid: SB[actor], aal2: actor === 'admin' });
  const repos = (actor: ContractActor) => createSupabaseRepos({ db: as(actor), viewer: { uid: SB[actor], role: actor }, contacts });
  const requestId = await repos('owner').requests.create(NEW_REQUEST, at(-1));
  const submitBroker = async () => {
    const r = await submitAs(pg, SB.broker);
    if (!r.ok) throw new Error(r.error);
  };
  return {
    repos,
    async approveBroker() {
      await submitBroker();
      const office = (await pg.query<{ id: string }>(`select id from public.broker_offices where user_id = '${SB.broker}'`)).rows[0].id;
      const r = await as('admin').rpc('approve_broker', { p_office: office, p_decision: 'APPROVE', p_spoken_code: APP.code, p_open_year: APP.openYear });
      if (r.error || r.data) throw new Error(r.error?.message ?? String(r.data));
    },
    submitBroker,
    requestId,
    missingId: '20000000-0000-0000-0000-0000000000ff',
  };
});

describe('Supabase (PGlite): 관리자 웹 푸시 발송 경로 (서버 키)', { timeout: 20_000 }, () => {
  vit('서버 키로 모든 의뢰·가입 신청·처리 기록을 읽어 오늘 할 일을 센다 (route.ts와 같은 호출)', async () => {
    const pg = await bootDb();
    await pg.exec(SB_SEED + SB_OFFICE_SEED);
    const contacts = await createContactCrypto({ 1: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))) }, 1);
    const owner = createSupabaseRepos({ db: pgliteDb(pg, { uid: SB.owner }), viewer: { uid: SB.owner, role: 'owner' }, contacts });
    const id = await owner.requests.create(NEW_REQUEST, at(-1));
    const system = createSupabaseRepos({ db: pgliteDb(pg, { uid: null, service: true }), viewer: { uid: '00000000-0000-0000-0000-000000000000', role: 'admin' } });
    expect((await system.requests.list(at(0))).map((r) => r.id)).toEqual([id]);
    expect((await system.admin.applications()).map((a) => a.status)).toEqual(['PENDING']);
    expect(await system.admin.actions()).toEqual([]);
    expect(await system.deals.events(id)).toEqual({});
    // 서버 키 없이(로그인 전)는 처리 기록 거절
    const anon = createSupabaseRepos({ db: pgliteDb(pg, { uid: null }), viewer: { uid: '00000000-0000-0000-0000-000000000000', role: 'admin' } });
    await expect(anon.admin.actions()).rejects.toThrow();
  });
});

describe('Supabase (PGlite): 중개사 가입 서버화 (A4, 대표님 2026-10-29)', { timeout: 30_000 }, () => {
  const OTHER = '00000000-0000-0000-0000-0000000000c2';
  async function world() {
    const pg = await bootDb();
    await pg.exec(SB_SEED + `insert into auth.users (id) values ('${OTHER}');`);
    const admin = createSupabaseRepos({ db: pgliteDb(pg, { uid: SB.admin, aal2: true }), viewer: { uid: SB.admin, role: 'admin' } });
    return { pg, admin, service: pgliteDb(pg, { uid: null, service: true }) };
  }

  vit('신청: 명단 대조를 서버에서 다시 → DB엔 코드 해시만, 관리자는 그 코드로 승인', async () => {
    const { pg, admin } = await world();
    expect(await submitAs(pg, SB.broker, { ceo: '김다름' })).toEqual({ ok: false, error: 'CEO_MISMATCH' });
    const r = await submitAs(pg, SB.broker, {}, '3180');
    expect(r.ok && r.value.code).toBe('3180');
    const row = (await pg.query<{ code_hash: string; office_phone: string; address: string; strengths: string[] }>('select code_hash, office_phone, address, strengths from public.broker_offices')).rows[0];
    expect(row.code_hash).not.toContain('3180');
    expect(row).toMatchObject({ office_phone: APP.phone, address: TEST_REGISTRY[0].address, strengths: APP.strengths });
    const id = (await admin.admin.applications())[0].id;
    expect(await admin.admin.decideApplication(id, { kind: 'APPROVE', spokenCode: '3180', registryOpenYear: APP.openYear, enteredYear: '' }, at(0))).toEqual({ ok: true, value: undefined });
  });

  vit('이미 가입: 확인 대기·승인 중인 등록번호는 다른 사람도 같은 사람도 막음, 사무소 확인 단계에서도 알려 줌', async () => {
    const { pg, service } = await world();
    expect((await submitAs(pg, SB.broker)).ok).toBe(true);
    expect(await submitAs(pg, OTHER)).toEqual({ ok: false, error: 'ALREADY_JOINED' });
    expect(await submitAs(pg, SB.broker)).toEqual({ ok: false, error: 'ALREADY_JOINED' });
    const check = await checkOffice(dbLock(service), 'ip-check-000000000', { regNo: APP.regNo, ceo: APP.ceo!, office: APP.office }, TEST_REGISTRY);
    expect(check).toEqual({ ok: false, error: 'ALREADY_JOINED' });
    expect((await pg.query('select 1 from public.broker_offices')).rows).toHaveLength(1);
  });

  vit('반려 뒤: 새 신청이 덮어씀 (남이 낸 가짜 신청이 반려돼도 진짜 대표가 가입), 예전 판정은 처리 기록에 남음', async () => {
    const { pg, admin } = await world();
    expect((await submitAs(pg, OTHER)).ok).toBe(true);
    const fakeId = (await admin.admin.applications())[0].id;
    expect((await admin.admin.decideApplication(fakeId, { kind: 'REJECT', reason: '대표 공인중개사가 아님' }, at(0))).ok).toBe(true);
    expect((await submitAs(pg, SB.broker, {}, '4271')).ok).toBe(true);
    const list = await admin.admin.applications();
    expect(list.map((a) => a.status)).toEqual(['PENDING']);
    expect((await pg.query<{ user_id: string }>('select user_id from public.broker_offices')).rows[0].user_id).toBe(SB.broker);
    expect((await pg.query(`select 1 from audit.admin_actions where target = 'BROKER_SIGNUP' and office_id = '${fakeId}' and result = 'REJECTED'`)).rows).toHaveLength(1);
  });

  vit('새 코드 받기: 새 코드만 맞고 예전 코드는 틀림, 틀린 횟수는 그대로 (확인 대기일 때만)', async () => {
    const { pg, admin, service } = await world();
    expect(await reissueCode(service, SB.broker, () => '5555')).toEqual({ ok: false, error: 'NOT_PENDING' });
    expect((await submitAs(pg, SB.broker, {}, '1111')).ok).toBe(true);
    const id = (await admin.admin.applications())[0].id;
    const approve = (code: string) => admin.admin.decideApplication(id, { kind: 'APPROVE', spokenCode: code, registryOpenYear: APP.openYear, enteredYear: '' }, at(0));
    expect(await approve('9999')).toEqual({ ok: false, error: 'CODE_MISMATCH' });
    expect(await reissueCode(service, SB.broker, () => '2222')).toEqual({ ok: true, value: '2222' });
    expect((await pg.query<{ n: number }>('select code_attempts as n from public.broker_offices')).rows[0].n).toBe(1);
    expect(await approve('1111')).toEqual({ ok: false, error: 'CODE_MISMATCH' });
    expect(await approve('2222')).toEqual({ ok: true, value: undefined });
  });

  vit('사무소 확인 잠금: 같은 접속 5번 틀리면 10분 잠금(맞는 값도), 10분 지나면 풀림, 맞으면 기록 지움. 다른 접속은 상관없음', async () => {
    const { pg, service } = await world();
    const lock = dbLock(service);
    const wrong = { regNo: APP.regNo, ceo: '김다름', office: APP.office };
    const right = { regNo: APP.regNo, ceo: APP.ceo!, office: APP.office };
    const key = 'ip-lock-0000000000';
    for (let i = 0; i < 5; i++) expect(await checkOffice(lock, key, wrong, TEST_REGISTRY)).toEqual({ ok: false, error: 'CEO_MISMATCH' });
    expect(await checkOffice(lock, key, right, TEST_REGISTRY)).toEqual({ ok: false, error: 'LOCKED' });
    expect((await checkOffice(lock, 'ip-other-000000000', right, TEST_REGISTRY)).ok).toBe(true);
    await pg.exec(`update private.signup_fails set first_at = now() - interval '11 minutes'`);
    expect((await checkOffice(lock, key, right, TEST_REGISTRY)).ok).toBe(true);
    expect((await pg.query('select 1 from private.signup_fails')).rows).toHaveLength(0);
  });

  vit('가입 동의 (A6): 본인 것만 consents에 BROKER_SIGNUP으로, 다시 인증해도 3줄, 관리자는 보고 다른 사람은 못 봄', async () => {
    const { pg } = await world();
    const broker = createSupabaseRepos({ db: pgliteDb(pg, { uid: SB.broker }), viewer: { uid: SB.broker, role: 'owner' } });
    await broker.applications.recordConsents(['TERMS', 'COLLECT', 'PROVIDE'], '2026-10-24', at(0));
    await broker.applications.recordConsents(['TERMS', 'COLLECT', 'PROVIDE'], '2026-10-24', at(1));
    const rows = await pg.query<{ user_id: string; consent_key: string; context: string; request_id: string | null }>(
      'select user_id, consent_key, context, request_id from public.consents order by consent_key',
    );
    expect(rows.rows).toEqual(['COLLECT', 'PROVIDE', 'TERMS'].map((k) => ({ user_id: SB.broker, consent_key: k, context: 'BROKER_SIGNUP', request_id: null })));
    const seen = async (uid: string, aal2 = false) => ((await pgliteDb(pg, { uid, aal2 }).select('consents', { columns: 'id' })).data ?? []).length;
    expect(await seen(SB.admin, true)).toBe(3);
    expect(await seen(OTHER)).toBe(0);
    // 남의 이름으로 넣기는 RLS가 거절
    expect((await pgliteDb(pg, { uid: OTHER }).insert('consents', [{ user_id: SB.broker, consent_key: 'TERMS', context: 'BROKER_SIGNUP', terms_version: 'x' }])).error).not.toBeNull();
  });

  vit('브라우저(로그인 사용자·로그인 전)는 가입 함수를 직접 못 부르고, 사무소 표에 직접 넣지도 못함', async () => {
    const { pg } = await world();
    const user = pgliteDb(pg, { uid: SB.broker });
    const anon = pgliteDb(pg, { uid: null });
    for (const db of [user, anon]) {
      expect((await db.rpc('signup_gate', { p_key: 'ip-x-00000000000000', p_reg_no: APP.regNo })).error).not.toBeNull();
      expect((await db.rpc('reissue_signup_code', { p_user: SB.broker, p_code: '1234' })).error).not.toBeNull();
    }
    expect(
      (await user.insert('broker_offices', [{ user_id: SB.broker, reg_no: '99999-0000-00000', office_name: '가짜', code_hash: 'x' }])).error,
    ).not.toBeNull();
  });
});

describe('Supabase (PGlite): 사무소 실적 (A10)', { timeout: 30_000 }, () => {
  vit('계약을 알리고 날짜를 넣고 집주인이 "합의 복비 그대로" → 서버가 다시 세서 집주인 카드에 약속 이행 1건, 브라우저는 직접 못 바꿈', async () => {
    const pg = await bootDb();
    await pg.exec(SB_SEED);
    const contacts = await createContactCrypto({ 1: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))) }, 1);
    const as = (actor: ContractActor) => pgliteDb(pg, { uid: SB[actor], aal2: actor === 'admin' });
    const repo = (actor: ContractActor) => createSupabaseRepos({ db: as(actor), viewer: { uid: SB[actor], role: actor }, contacts });
    const R = await repo('owner').requests.create(NEW_REQUEST, at(-1));
    expect((await submitAs(pg, SB.broker)).ok).toBe(true);
    const officeId = (await pg.query<{ id: string }>('select id from public.broker_offices')).rows[0].id;
    expect((await as('admin').rpc('approve_broker', { p_office: officeId, p_decision: 'APPROVE', p_spoken_code: APP.code, p_open_year: APP.openYear })).data).toBeNull();
    const broker = repo('broker');
    await broker.credits.settle(at(0));
    const sent = await broker.offers.send({ requestId: R, strengths: [], now: at(0), blocking: 0 });
    if (!sent.ok) throw new Error(sent.error);
    const offerId = sent.value.id;
    const owner = repo('owner');
    await owner.requests.confirmMatch(R, [offerId], at(1));

    const service = pgliteDb(pg, { uid: null, service: true });
    expect(await refreshPromiseForOffer(service, offerId)).toEqual({ kept: 0, total: 0 });
    await broker.deals.append(R, offerId, { kind: 'DATE', field: 'CONTRACT', date: '2026-11-08' }, at(2));
    await broker.deals.append(R, offerId, { kind: 'DATE', field: 'BALANCE', date: '2026-12-20' }, at(2));
    await broker.deals.append(R, offerId, { kind: 'REPORT', step: 'CONTRACT' }, at(3));
    await owner.deals.append(R, offerId, { kind: 'ANSWER', step: 'CONTRACT', ok: true }, at(4));
    expect(await refreshPromiseForOffer(service, offerId)).toEqual({ kept: 0, total: 1 });
    await owner.deals.append(R, offerId, { kind: 'FEE_ANSWER', kept: true }, at(5));
    expect(await refreshPromiseForOffer(service, offerId)).toEqual({ kept: 1, total: 1 });
    expect((await owner.requests.get(R, at(5)))?.offers[0].promise).toEqual({ kept: 1, total: 1 });
    expect(await refreshPromiseForOffer(service, '30000000-0000-0000-0000-0000000000ff')).toBeNull();

    // 중개사·집주인·로그인 전은 실적을 직접 못 바꿈
    for (const db of [as('broker'), as('owner'), pgliteDb(pg, { uid: null })])
      expect((await db.rpc('set_office_promise', { p_office: officeId, p_kept: 99, p_total: 99 })).error).not.toBeNull();
    expect((await pg.query<{ k: number }>('select promise_kept as k from public.broker_offices')).rows[0].k).toBe(1);
  });
});

describe('Supabase (PGlite): 알림 문자 (B2)', { timeout: 30_000 }, () => {
  vit('첫 요청 → 집주인, 매칭 확정 → 고른 중개사, 가입 승인 → 신청자 (전화는 계정에서, 동·호수 없음), 실패한 동작·두 번째 요청은 알림 없음', async () => {
    const pg = await bootDb();
    await pg.exec(SB_SEED + `insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c2');`);
    const contacts = await createContactCrypto({ 1: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))) }, 1);
    const as = (uid: string, aal2 = false) => pgliteDb(pg, { uid, aal2 });
    const repo = (uid: string, role: 'owner' | 'broker' | 'admin') => createSupabaseRepos({ db: as(uid, role === 'admin'), viewer: { uid, role }, contacts });
    const service = pgliteDb(pg, { uid: null, service: true });
    const PHONES: Record<string, string> = { [SB.owner]: '821011110000', [SB.broker]: '821022220000', '00000000-0000-0000-0000-0000000000c2': '821033330000' };
    const sent: string[] = [];
    const deps: NotifyDeps = { db: service, phoneOf: async (id) => PHONES[id] ?? null, sms: async (to, text) => (sent.push(`${to}|${text}`), true) };
    const after = async (group: string, method: string, args: unknown[], result: unknown) => deliverAll(deps, await noticesAfter(service, { group, method, args }, result));

    const R = await repo(SB.owner, 'owner').requests.create(NEW_REQUEST, at(-1));
    // 가입 신청 → 승인
    expect((await submitAs(pg, SB.broker)).ok).toBe(true);
    const officeId = (await pg.query<{ id: string }>('select id from public.broker_offices')).rows[0].id;
    const admin = repo(SB.admin, 'admin');
    const decision = { kind: 'APPROVE' as const, spokenCode: APP.code, registryOpenYear: APP.openYear, enteredYear: '' };
    const decided = await admin.admin.decideApplication(officeId, decision, at(0));
    expect(await after('admin', 'decideApplication', [officeId, decision], decided)).toMatchObject({ SENT: 1 });

    const broker = repo(SB.broker, 'broker');
    await broker.credits.settle(at(0));
    const input = { requestId: R, strengths: [], now: at(0), blocking: 0 };
    const first = await broker.offers.send(input);
    expect(await after('offers', 'send', [input], first)).toMatchObject({ SENT: 1 });
    const again = await broker.offers.send(input); // 이미 보냄 → 실패
    expect(await after('offers', 'send', [input], again)).toMatchObject({ SENT: 0 });
    if (!first.ok) throw new Error(first.error);
    const confirmed = await repo(SB.owner, 'owner').requests.confirmMatch(R, [first.value.id], at(1));
    expect(await after('requests', 'confirmMatch', [R, [first.value.id], at(1)], confirmed)).toMatchObject({ SENT: 1 });

    expect(sent).toEqual([
      `821022220000|${noticeText({ kind: 'SIGNUP_APPROVED', vars: {} })}`,
      `821011110000|[복비] 예시단지 34평 매매에 첫 중개사 요청이 왔어요. 내 의뢰에서 확인해 주세요.`,
      `821022220000|[복비] 예시단지 34평 매매 집주인이 내 요청을 골랐어요. 48시간 안에 광고를 올려 주세요.`,
    ]);
    for (const s of sent) expect(s).not.toMatch(/101동|1203|홍길동/);
    // 전화번호를 모르면 보내지 않음
    expect(await deliverAll({ ...deps, phoneOf: async () => null }, [{ kind: 'FIRST_OFFER', target: { owner: R }, vars: {} }])).toMatchObject({ NO_PHONE: 1 });
    expect(await deliverAll(deps, [{ kind: 'MATCHED', target: { broker: '30000000-0000-0000-0000-0000000000ff' }, vars: {} }])).toMatchObject({ NO_TARGET: 1 });
  });
});

describe('Supabase (PGlite): 연락처는 암호문으로만 저장', { timeout: 20_000 }, () => {
  vit('DB에는 원문이 없고, 열람하면 원문이 돌아옴 (메모·세입자 전화 포함)', async () => {
    const pg = await bootDb();
    await pg.exec(SB_SEED);
    const contacts = await createContactCrypto({ 1: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))) }, 1);
    const owner = createSupabaseRepos({ db: pgliteDb(pg, { uid: SB.owner }), viewer: { uid: SB.owner, role: 'owner' }, contacts });
    const id = await owner.requests.create(NEW_REQUEST, at(-1));
    const raw = await pg.query<{ blob: string }>(`select encode(dong_ho_enc, 'escape') || encode(owner_name_enc, 'escape') || encode(tenant_phone_enc, 'escape') || encode(memo_enc, 'escape') as blob from pii.request_contacts`);
    for (const plain of ['1203', '홍길동', '010-0000-0002', '오후만']) expect(raw.rows[0].blob).not.toContain(plain);
    const r = await owner.contacts.reveal(id, 'OWNER_VIEW', at(0));
    expect(r).toEqual({ ok: true, value: { dongHo: '101동 1203호', contact: { ownerName: '홍길동', ownerPhone: '', tenantPhone: '010-0000-0002', visitMemo: '오후만', optionMemo: '' } } });
    // 다른 키(유출된 DB만 가진 쪽)로는 못 읽음
    const other = createSupabaseRepos({
      db: pgliteDb(pg, { uid: SB.owner }),
      viewer: { uid: SB.owner, role: 'owner' },
      contacts: await createContactCrypto({ 1: bytesToBase64(crypto.getRandomValues(new Uint8Array(32))) }, 1),
    });
    await expect(other.contacts.reveal(id, 'OWNER_VIEW', at(0))).rejects.toThrow();
  });
});

describe('브라우저 저장소: 깨진 저장값', () => {
  vit('공유 저장소 JSON이 깨져도 빈 상태로 읽고 계속 동작', async () => {
    const repos = createLocalRepos({ store: memoryStore({ bokbi_mock_market: '{oops', bokbi_broker_workspace: '[]' }), baseRequests: base });
    expect((await repos.requests.list(t0))[0].offers).toEqual([]);
    expect((await repos.credits.workspace()).sent).toEqual([]);
  });
});
