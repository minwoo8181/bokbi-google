'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrokerApplication } from '@/lib/broker/application';
import { kstDateKey, nextRefillDate, type MoreCreditsAnswer, type MoreCreditsTap } from '@/lib/broker/credits';
import { sendBlock, sentStatus, toFeed, type SendBlock, type SentRequest } from '@/lib/broker/feed';
import { hoursSince } from '@/lib/analytics/derive';
import { track } from '@/lib/analytics/store';
import { EMPTY_WORKSPACE, type BrokerWorkspace } from '@/lib/broker/mockMarket';
import { addVisit, checkBrokerVisit, type VisitBooking, type VisitRejectReason } from '@/lib/requests/showing';
import { cardStrip, dateEvents, dealState, isBlocking, listRank, newsSince, removeAdSince, type CardStrip, type DealDates, type DealEventBody, type RequestDeals, type TimelineItem } from '@/lib/deal/deal';
import { loadSavedCalendar, savedKey, type SavedCalendarMap } from '@/lib/deal/savedCalendar';
import { keptPromiseCount } from '@/lib/deal/settle';
import { dealFeeWon } from '@/lib/deal/dealFee';
import { loadSeen, markSeen, seenKey, type SeenMap } from '@/lib/deal/seen';
import { reviewSummary, strengthSlots } from '@/lib/broker/strengthSlots';
import type { DelayReason, OwnerRequest } from '@/lib/requests/types';
import { formatDateKo } from '@/components/my-requests/format';
import { repos } from '@/components/data/repos';

/** 저장소가 돌려주는 막힘 중 행동 기록 이유로 남기는 것 */
const SEND_BLOCKS: SendBlock[] = ['ALREADY_SENT', 'CLOSED', 'TODO_FIRST', 'NO_CREDIT'];

/**
 * 중개사 화면(/agent) 저장소 상태와 동작. 화면 상태(탭·열린 시트·토스트)는 AgentWorkspace가 가진다.
 * 읽기·쓰기는 모두 저장소(components/data/repos → lib/data)로: 지금은 브라우저 저장소, Supabase 때는 서버 액션 + RPC.
 * 쓴 뒤에는 저장소를 다시 읽어 화면을 맞춘다 (집주인 화면과 같은 기록)
 */
export function useAgentWorkspace() {
  const [loaded, setLoaded] = useState(false);
  const [app, setApp] = useState<BrokerApplication | null>(null);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  /** 의뢰 id → 거래 기록 */
  const [dealsMap, setDealsMap] = useState<Record<string, RequestDeals>>({});
  const [ws, setWs] = useState<BrokerWorkspace>(EMPTY_WORKSPACE);
  const [now, setNow] = useState(() => Date.now());

  /** 저장소를 다시 읽는다. 승인된 중개사면 이번 주 크레딧 채움 + 돌려받을 크레딧 정산 (credits.settle) */
  const reload = useCallback(async () => {
    const at = new Date();
    const [a, w, list] = await Promise.all([repos.applications.get(), repos.credits.settle(at), repos.requests.list(at)]);
    const entries = await Promise.all(list.map(async (r) => [r.id, await repos.deals.events(r.id)] as const));
    setApp(a);
    setWs(w);
    setRequests(list);
    setDealsMap(Object.fromEntries(entries));
    setNow(at.getTime());
  }, []);

  useEffect(() => {
    void reload().then(() => setLoaded(true));
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    // 다른 탭(집주인 화면)에서 확정하면 바로 반영 (reload가 화면 시각도 지금으로 맞춘다)
    const onStorage = () => void reload();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const dealsFor = useCallback((requestId: string): RequestDeals => dealsMap[requestId] ?? {}, [dealsMap]);
  const feed = useMemo(() => toFeed(requests, now), [requests, now]);
  const byId = useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const sentIds = new Set(ws.sent.map((s) => s.requestId));
  /** 후기 개수·별점 → 잘하는 점 칸 수 (후기 10개부터 1칸 더), 약속 이행 → 방패 단계 */
  const reviews = useMemo(() => reviewSummary(ws, { deals: dealsMap }), [ws, dealsMap]);
  const slots = strengthSlots(reviews.count);
  const kept = useMemo(() => keptPromiseCount(ws, { deals: dealsMap }), [ws, dealsMap]);
  const today = kstDateKey(new Date(now));
  const nextWeekLabel = formatDateKo(nextRefillDate(new Date(now)));

  // ── ④ 선택된 매물 관리 ──
  /** 이 휴대폰에서 거래 날짜를 캘린더에 저장한 시각 (요청별) */
  const [savedCal, setSavedCal] = useState<SavedCalendarMap>({});
  useEffect(() => setSavedCal(loadSavedCalendar()), []);
  const calendarSavedAt = (s: SentRequest) => savedCal[savedKey(s.requestId, s.offerId)] ?? null;
  /** 선택된 매물 카드의 색 띠 (지금 할 일 목록을 대신함, 그릴링 2026-10-25) */
  const strips = useMemo(() => {
    const m = new Map<string, CardStrip>();
    for (const s of ws.sent) {
      const r = byId.get(s.requestId) ?? null;
      // 허위 매물 신고 확인 중인 집도 띠는 그대로 ("소유자 확인 중", 잠금 아님 — 예전엔 빠져서 광고 기한을 피할 수 있었음)
      if (!r || sentStatus(s, r, now) !== 'SELECTED') continue;
      m.set(
        s.requestId,
        cardStrip({ request: r, deals: dealsFor(r.id), offerId: s.offerId }, 'BROKER', new Date(now), {
          calendarSavedAt: savedCal[savedKey(s.requestId, s.offerId)] ?? null,
          ownerChecked: !!s.ownerCheck,
        }),
      );
    }
    return m;
  }, [ws.sent, byId, now, dealsFor, savedCal]);
  /** 먼저 끝내야 할 일 (기한 지남): 있으면 새 의뢰에 요청 보내기만 잠금, 위에서부터 그 집으로 바로 가기 */
  const blockingIds = useMemo(() => [...strips.entries()].filter(([, st]) => isBlocking(st)).map(([id]) => id), [strips]);
  /** 탭 배지: 빨강·파랑 (지금 내가 해야 하는 일)만 (대표님 2026-10-25) */
  const badgeCount = [...strips.values()].filter((s) => s.tone === 'RISK' || s.tone === 'ACTION').length;
  /** 집주인이 남긴 새 소식 (마지막으로 그 거래 페이지를 연 뒤, 대표님 2026-10-26) */
  const [seen, setSeen] = useState<SeenMap>({});
  useEffect(() => setSeen(loadSeen()), []);
  const newsBy = useMemo(() => {
    const m = new Map<string, TimelineItem[]>();
    for (const s of ws.sent) {
      const r = byId.get(s.requestId);
      if (!r || !strips.has(s.requestId)) continue;
      m.set(s.requestId, newsSince({ request: r, deals: dealsFor(r.id), offerId: s.offerId }, 'BROKER', seen[seenKey(r.id, s.offerId, 'BROKER')] ?? null));
    }
    return m;
  }, [ws.sent, byId, strips, dealsFor, seen]);
  /** 내 매물 순서: 빨강·파랑·새 소식이 있는 집이 맨 위, 그 안에서 색 순서. 선택 안 된 요청은 아래 */
  const sortedSent = useMemo(() => {
    const rank = (s: SentRequest) => {
      const st = strips.get(s.requestId);
      return st ? listRank(st, (newsBy.get(s.requestId)?.length ?? 0) > 0, 'BROKER') : 100;
    };
    return [...ws.sent].sort((a, b) => rank(a) - rank(b));
  }, [ws.sent, strips, newsBy]);
  /** 내 매물 카드의 복비: 거래금액이 확정됐으면 합의 비율로 다시 계산한 금액 (dealFee.ts) */
  const feeOf = (s: SentRequest) => {
    const r = byId.get(s.requestId);
    return r ? dealFeeWon(r, dealState(dealsFor(r.id)[s.offerId] ?? []).priceManwon) : s.snapshot.commissionWon;
  };
  const markListingSeen = (s: SentRequest) => setSeen((m) => markSeen(m, s.requestId, s.offerId, 'BROKER', new Date()));

  /** 요청 보내기: 막힘이 없으면 크레딧 1개 쓰고 집주인 화면에 익명 요청 카드를 넣는다 (저장소 한 번에). 보냈으면 true */
  const sendRequest = async (request: OwnerRequest, strengths: string[]): Promise<boolean> => {
    if (!app) return false;
    const at = new Date();
    const block = sendBlock({ request, sent: ws.sent, wallet: ws.wallet, now: at, blocking: blockingIds.length });
    if (block) {
      track('send_blocked', { reason: block }, { requestId: request.id });
      return false;
    }
    const r = await repos.offers.send({ requestId: request.id, strengths, now: at, blocking: blockingIds.length });
    if (r.ok) {
      track('request_send', { creditsLeft: Math.max(0, ws.wallet.balance - 1) }, { requestId: request.id, offerId: r.value.id });
      const minutes = hoursSince(request.createdAt, at);
      if (minutes !== null) track('offer_arrived', { minutesAfterRequest: Math.round(minutes * 60) }, { requestId: request.id, offerId: r.value.id });
    } else if (SEND_BLOCKS.includes(r.error as SendBlock)) track('send_blocked', { reason: r.error }, { requestId: request.id });
    await reload();
    return r.ok;
  };

  // ── 거래 기록 (보고·날짜·광고 내림): 추가만 ──
  const addDealEvent = async (s: SentRequest, e: DealEventBody) => {
    if (e.kind === 'REPORT') track('deal_report', { step: e.step }, { requestId: s.requestId, offerId: s.offerId });
    await repos.deals.append(s.requestId, s.offerId, e, new Date());
    await reload();
  };
  const saveDatesFor = async (s: SentRequest, next: DealDates) => {
    const at = new Date();
    const current = dealState(dealsFor(s.requestId)[s.offerId] ?? []).dates;
    for (const { id: _id, at: _at, ...body } of dateEvents(current, next, at, s.offerId)) await repos.deals.append(s.requestId, s.offerId, body as DealEventBody, at);
    await reload();
  };

  // ── ⑤ 방문 일정 (전화로 정해 저장, 기준은 공유 저장소) ──
  const commitVisits = async (requestId: string, fn: (visits: VisitBooking[]) => VisitBooking[]) => {
    await repos.visits.save(requestId, fn(byId.get(requestId)?.visits ?? []));
    await reload();
  };
  const saveVisitFor = (s: SentRequest, date: string, hour: number): VisitRejectReason | null => {
    const at = new Date();
    const visits = byId.get(s.requestId)?.visits ?? [];
    const reason = checkBrokerVisit(visits, { offerId: s.offerId, date, hour }, at);
    if (reason) return reason;
    track('visit_saved', {}, { requestId: s.requestId, offerId: s.offerId });
    void commitVisits(s.requestId, (v) => addVisit(v, { offerId: s.offerId, date, hour }, `visit-${at.getTime()}`, at));
    return null;
  };

  // ── 매물 카드 동작 (저장소 한 줄씩) ──
  const after = (p: Promise<unknown>) => void p.then(() => reload());
  const confirmOwnerFor = (s: SentRequest, how: 'CONFIRMED' | 'CALL_CONFIRMED') => after(repos.offers.confirmOwner(s.requestId, s.offerId, how, new Date()));
  /** 광고 올림: 매칭 뒤 몇 시간 (48시간 준수율), 광고 내림: 내려 달라는 요청 뒤 몇 시간 (A7) */
  const postAdFor = (s: SentRequest, url: string) => {
    const at = new Date();
    after(
      repos.offers.postAd(s.requestId, s.offerId, url, at).then((r) => {
        const h = hoursSince(byId.get(s.requestId)?.adWindowStartedAt ?? byId.get(s.requestId)?.matchedAt, at);
        if (r.ok && h !== null) track('ad_posted', { hoursAfterMatch: h }, { requestId: s.requestId, offerId: s.offerId });
      }),
    );
  };
  const removeAdFor = (s: SentRequest) => {
    const at = new Date();
    const r = byId.get(s.requestId);
    const h = r ? hoursSince(removeAdSince({ request: r, deals: dealsFor(r.id), offerId: s.offerId }), at) : null;
    if (h !== null) track('ad_removed', { hoursAfterAsk: h }, { requestId: s.requestId, offerId: s.offerId });
    after(repos.offers.removeAd(s.requestId, s.offerId, at));
  };
  const setDelayFor = (s: SentRequest, reason: DelayReason) => after(repos.offers.setDelay(s.requestId, s.offerId, reason, new Date()));
  /** 허위 매물 같아요 → 공유 저장소에 기록 (집주인 맨 위 안내·관리자 오늘 할 일, fakeReport.ts) */
  const reportFakeFor = (s: SentRequest) => after(repos.offers.fileFakeReport(s.requestId, s.offerId, new Date()));
  const saveApplication = (a: BrokerApplication) => after(repos.applications.save(a));

  /** "크레딧 더 받기"를 누른 기록과 투표 답 (페이크 도어 수요 측정) */
  const recordMoreCredits = (from: MoreCreditsTap['from']) => {
    track('more_credits_tap');
    after(repos.credits.tapMoreCredits(from, new Date()));
  };
  const answerMoreCredits = (a: MoreCreditsAnswer) => {
    track('more_credits_answer', { answer: a });
    after(repos.credits.answerMoreCredits(a));
  };

  return {
    loaded,
    app,
    setApp,
    ws,
    now,
    setNow,
    reload,
    requests,
    dealsFor,
    feed,
    byId,
    sentIds,
    reviews,
    slots,
    kept,
    today,
    nextWeekLabel,
    sendRequest,
    savedCal,
    setSavedCal,
    calendarSavedAt,
    strips,
    blockingIds,
    badgeCount,
    newsBy,
    sortedSent,
    feeOf,
    markListingSeen,
    addDealEvent,
    saveDatesFor,
    commitVisits,
    saveVisitFor,
    confirmOwnerFor,
    postAdFor,
    removeAdFor,
    setDelayFor,
    reportFakeFor,
    saveApplication,
    recordMoreCredits,
    answerMoreCredits,
  };
}

export type AgentWorkspaceState = ReturnType<typeof useAgentWorkspace>;
