'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { effectiveStage } from '@/lib/requests/stage';
import type { OwnerRequest, PastRequest } from '@/lib/requests/types';
import { parseSavedRequest, REQUEST_SUMMARY_KEY, type SavedRequest } from '@/lib/requests/requestDraft';
import type { ShowingAvailability, VisitBooking } from '@/lib/requests/showing';
import { repos } from '@/components/data/repos';
import {
  applyDeals,
  canOwnerDeclare,
  cardStrip,
  closeOthers,
  consequences,
  dateEvents,
  dealState,
  endByOwner,
  listRank,
  newsSince,
  pauseByOwner,
  resumeByOwner,
  winnerOf,
  type DealDates,
  type OwnerEndReason,
  type DealEventBody,
  type FeeReason,
  type ReportStep,
  type RequestDeals,
} from '@/lib/deal/deal';
import { loadSavedCalendar, savedKey, type SavedCalendarMap } from '@/lib/deal/savedCalendar';
import { priceChangePlan } from '@/lib/deal/priceChange';
import { loadSeen, markSeen, seenKey, type SeenMap } from '@/lib/deal/seen';
import { dealFeeWon } from '@/lib/deal/dealFee';
import { savedManwonOf } from '@/lib/analytics/derive';
import { track } from '@/lib/analytics/store';
import { DEMO_SAVED_REQUEST, demoRequest, requestFromSummary } from './mock-requests';
import { fill, toDateKey } from './format';


/**
 * 내 의뢰(/my-requests) 의뢰 상태와 거래 기록 동작. 화면 상태(열린 시트·선택·축하 화면)는 page가 가진다.
 * 읽기·쓰기는 저장소(components/data/repos → lib/data)로 중개사 화면과 이어진다. 화면은 먼저 바꾸고(바로 반응) 저장소에 기록한다.
 * Supabase 연결 시 저장소 구현만 서버 액션 + RPC로
 */
export function useOwnerRequest() {
  const [now, setNow] = useState(() => Date.now());
  const [request, setRequest] = useState<OwnerRequest | null>(null);
  const [past, setPast] = useState<PastRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  /** 다시 요청 요약에 쓰는 요청서 (모달이 저장한 값, 없으면 목업) */
  const [draft, setDraft] = useState<SavedRequest | null>(null);
  /** 거래 기록 (공유 저장소 market.deals[의뢰 id]) */
  const [deals, setDeals] = useState<RequestDeals>({});
  /** 이 휴대폰에서 거래 날짜를 캘린더에 저장한 시각 (중개사 화면과 같은 저장소라 '#owner'로 구분) */
  const [savedCal, setSavedCal] = useState<SavedCalendarMap>({});
  /** 거래 페이지를 마지막으로 연 시각 (새 소식 기준, 이 휴대폰) */
  const [seen, setSeen] = useState<SeenMap>({});
  const requestIdRef = React.useRef<string | null>(null);
  const requestRef = React.useRef<OwnerRequest | null>(null);

  // 매칭 모달이 저장한 요약이 있으면 그 값으로, 없으면 목업으로 시작
  useEffect(() => {
    const d = new Date();
    let next: OwnerRequest = demoRequest(d);
    let savedDraft = parseSavedRequest(DEMO_SAVED_REQUEST);
    try {
      const saved = localStorage.getItem(REQUEST_SUMMARY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const fromSaved = requestFromSummary(parsed, d);
        if (fromSaved) {
          next = fromSaved;
          savedDraft = parseSavedRequest(parsed);
        }
      }
    } catch {}
    setDraft(savedDraft);
    setSavedCal(loadSavedCalendar());
    setSeen(loadSeen());
    // 저장소: 중개사 화면(/agent)에서 보낸 요청 카드·확정 결과·거래 기록을 붙인다
    void (async () => {
      const [fresh, ds] = await Promise.all([repos.requests.refresh(next), repos.deals.events(next.id)]);
      setRequest(applyDeals(fresh, ds, d));
      setDeals(ds);
      setLoaded(true);
    })();
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    const onStorage = () => {
      const id = requestIdRef.current;
      if (!id) return;
      void repos.deals.events(id).then(async (ds) => {
        setDeals(ds);
        const current = requestRef.current;
        if (current?.id === id) {
          const fresh = await repos.requests.refresh(current);
          setRequest((r) => (r?.id === id ? applyDeals(fresh, ds, new Date()) : r));
        }
      });
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const today = toDateKey(new Date(now));
  const currentYear = new Date(now).getFullYear();
  const view = useMemo(() => (request ? { ...request, ...effectiveStage(request, now) } : null), [request, now]);
  const matched = useMemo(() => (view ? view.offers.filter((o) => view.matchedOfferIds.includes(o.id)) : []), [view]);

  const update = useCallback((fn: (r: OwnerRequest) => OwnerRequest) => setRequest((r) => (r ? fn(r) : r)), []);
  useEffect(() => {
    requestIdRef.current = request?.id ?? null;
    requestRef.current = request;
  }, [request]);
  /** 방문 일정은 공유 저장소가 기준 (중개사 화면과 같이 봄) */
  const commitVisits = (visits: VisitBooking[]) => {
    if (!request) return;
    update((r) => ({ ...r, visits }));
    void repos.visits.save(request.id, visits);
  };
  /** 동작 시각을 한 번 정해 화면 시각(now)과 맞춘다: 남은 시간이 48시간을 넘어 보이지 않게 */
  const iso = () => {
    const t = Date.now();
    setNow(t);
    return new Date(t).toISOString();
  };

  const archive = (r: OwnerRequest, result: PastRequest['result']) =>
    setPast((p) => [{ id: r.id, complexName: r.complexName, pyeongLabel: r.pyeongLabel.split(' · ')[0], result, endedAt: iso() }, ...p]);

  // ── 거래 기록 (④): 중개사가 알린 것 확인, 집주인이 직접 계약 알림 ──
  /**
   * 이벤트 하나를 저장하고 화면을 맞춘다. 처음 가계약·계약이 확정되면 다른 중개사 정리(방문 자동 취소),
   * 계약이 확정되면 의뢰를 계약 단계로 (계약 완료 카드에 거래 날짜를 채움), 해제가 확정되면 종료
   */
  const commitDeal = async (offerId: string, body: DealEventBody, commits: boolean) => {
    if (!request) return;
    const at = new Date(iso());
    const before = await repos.deals.events(request.id);
    let visits = request.visits;
    if (commits && !winnerOf(before)) {
      visits = closeOthers({ ...request, visits }, before, offerId, at).visits;
      await repos.visits.save(request.id, visits);
    }
    await repos.deals.append(request.id, offerId, body, at);
    const after = await repos.deals.events(request.id);
    setDeals(after);
    update((r) => applyDeals({ ...r, visits }, after, at));
    if (dealState(after[offerId] ?? []).phase === 'BROKEN') archive(request, 'DEAL_BROKEN');
  };
  // 행동 기록 (A7): 답·복비 확인·후기는 그 의뢰·카드에 (메모 글은 남기지 않음)
  const ids = (offerId: string) => ({ requestId: request?.id ?? null, offerId });
  const answer = (offerId: string, step: ReportStep, ok: boolean) => {
    track('deal_answer', { step, ok }, ids(offerId));
    void commitDeal(offerId, { kind: 'ANSWER', step, ok }, ok && (step === 'PROVISIONAL' || step === 'CONTRACT'));
  };
  /** ⑥ 합의 복비 확인, 날짜 대신 넣기(약속 이행엔 안 쌓임), 후기(중개사 크레딧 자동 돌려받기) */
  const feeAnswer = (offerId: string, kept: boolean, reason?: FeeReason, note?: string) => {
    if (request) {
      const feeWon = dealFeeWon(request, dealState(deals[offerId] ?? []).priceManwon);
      track('fee_answer', { kept, ...(reason ? { reason } : {}), ...(kept ? { savedManwon: savedManwonOf(request.legalMaxWon, feeWon) } : {}) }, ids(offerId));
    }
    void commitDeal(offerId, { kind: 'FEE_ANSWER', kept, ...(reason ? { reason } : {}), ...(note ? { note } : {}) }, false);
  };
  const review = (offerId: string, r: { stars: number; chips: string[] }) => {
    track('review_submit', { stars: r.stars, chipCount: r.chips.length }, ids(offerId));
    void commitDeal(offerId, { kind: 'REVIEW', ...r }, false);
  };
  const ownerDates = async (offerId: string, next: DealDates) => {
    if (!request) return;
    const at = new Date(iso());
    const current = dealState(deals[offerId] ?? []).dates;
    for (const { id: _id, at: _at, ...body } of dateEvents(current, next, at, `owner-${offerId}`, 'OWNER')) await repos.deals.append(request.id, offerId, body as DealEventBody, at);
    const after = await repos.deals.events(request.id);
    setDeals(after);
    update((r) => applyDeals(r, after, at));
  };

  /**
   * 다른 곳에서 팔았어요·거둬들이기: 공유 저장소에 남겨 중개사 화면도 정리 ("광고를 내려 주세요", 방문 자동 취소).
   * 광고 링크는 지우지 않는다 (복비가 네이버 광고를 내릴 수 없음 → 광고 내림 확인 n/m)
   */
  const endRequest = (reason: OwnerEndReason) => {
    if (!request) return;
    const at = new Date(iso());
    const ended = endByOwner(request, reason, at);
    // 방문 자동 취소는 화면이 들고 있는 일정 기준으로 (테스트 스위처 예시 일정도 그대로)
    void repos.requests.end(request.id, reason, at).then(() => repos.visits.save(request.id, ended.visits));
    if (reason === 'WITHDRAWN') archive(request, 'WITHDRAWN');
    update(() => ended);
  };

  /** 잠시 멈추기·다시 시작: 공유 저장소에 남겨 중개사 화면도 같게 (광고 내려 주세요 → 다시 시작하면 48시간 안에 다시 올리기) */
  const pauseRequest = (reason: string) => {
    if (!request) return;
    const at = new Date(iso());
    const paused = pauseByOwner(request, reason, at);
    void repos.requests.pause(request.id, reason, at).then(() => repos.visits.save(request.id, paused.visits));
    update(() => paused);
  };
  const resumeRequest = () => {
    if (!request) return;
    const at = new Date(iso());
    void repos.requests.resume(request.id, at);
    update((r) => resumeByOwner(r, at));
  };
  /**
   * 매칭 뒤 희망가 바꾸기 (2026-10-27): 복비는 합의 비율 그대로 (priceChange.priceChangePlan) → 저장소가 의뢰 값 + 매칭된 곳마다 기록.
   * 실패하면 false (화면은 그대로)
   */
  const changePrice = async (priceManwon: number): Promise<boolean> => {
    if (!request) return false;
    const plan = priceChangePlan(request, priceManwon);
    const at = new Date(iso());
    const r = await repos.requests.changePrice(request.id, plan, at);
    if (!r.ok) return false;
    const after = await repos.deals.events(request.id);
    setDeals(after);
    update((x) => applyDeals({ ...x, askingPriceManwon: plan.priceManwon, commissionWon: plan.feeWon, legalMaxWon: plan.legalMaxWon }, after, at));
    return true;
  };
  /** 바뀐 희망가를 그 중개사에게 전화·문자로 알렸다고 체크 */
  const notifyPrice = (offerId: string, priceManwon: number) => void commitDeal(offerId, { kind: 'PRICE_NOTIFIED', priceManwon }, false);

  /** 매칭 확정·해제·방문 가능 시간 (내 의뢰 화면에서 부름) */
  const confirmMatch = (offerIds: string[], at: Date) => {
    if (!request) return;
    if (offerIds.length >= 1 && offerIds.length <= 3) track('match_confirm', { count: offerIds.length }, { requestId: request.id });
    void repos.requests.confirmMatch(request.id, offerIds, at);
  };
  const releaseMatch = (offerId: string) => request && void repos.requests.release(request.id, offerId);
  const saveShowing = (showing: ShowingAvailability) => request && void repos.requests.setShowing(request.id, showing);

  const reportContract = (target: string, step: 'PROVISIONAL' | 'CONTRACT', priceManwon?: number) => {
    if (target === 'ELSEWHERE') {
      endRequest('SOLD_ELSEWHERE');
      return;
    }
    // 집주인이 직접 알림 = 바로 확정, 거래금액도 함께 확정 (중개사 화면엔 "집주인이 가계약/계약을 알렸어요 · 날짜를 넣어 주세요")
    void commitDeal(target, { kind: 'OWNER_DECLARED', step, ...(priceManwon ? { priceManwon } : {}) }, true);
  };
  const contractLines = (offerId: string, step: 'PROVISIONAL' | 'CONTRACT') =>
    request
      ? consequences({ who: 'OWNER', kind: 'DECLARE', step }, { request, deals, offerId }, new Date(now)).map((l) =>
          fill(SITE_CONTENT.brokerDeal.consequences[l.key], l.vars ?? {}),
        )
      : [];
  /** 그 중개사와 확인된 거래금액 (가계약 때 확정, 계약 알림 창에 먼저 채움) */
  const confirmedPrice = (offerId: string) => dealState(deals[offerId] ?? []).priceManwon;
  /** 가계약은 아직 아무와도 가계약·계약 전일 때만 고를 수 있다 */
  const canDeclareProvisional = (offerId: string) => !winnerOf(deals) && canOwnerDeclare(dealState(deals[offerId] ?? []), 'PROVISIONAL');
  /** 멈추기 창에서 중개사 전화를 누른 기록 (멈추기 대비 상담 비율 지표, 목업은 이 휴대폰에만) */
  const recordPauseCall = (offerId: string) => {
    try {
      const key = 'bokbi_pause_call_taps';
      const list = JSON.parse(localStorage.getItem(key) ?? '[]');
      localStorage.setItem(key, JSON.stringify([...(Array.isArray(list) ? list : []), { at: new Date().toISOString(), requestId: request?.id, offerId }]));
    } catch {}
  };
  const ownerSavedKey = (offerId: string) => (request ? savedKey(request.id, `${offerId}#owner`) : '');

  /**
   * 중개사 카드: 색 띠 + 새 소식 (대표님 2026-10-26). 내가 할 일·새 소식이 있는 카드가 맨 위,
   * 그 안에서는 집주인 우선순위(확인해 주세요가 먼저)
   */
  const ownerStrips = useMemo(() => {
    if (!view) return [];
    return matched
      .map((o) => {
        const c = { request: view, deals, offerId: o.id };
        const strip = cardStrip(c, 'OWNER', new Date(now), { calendarSavedAt: savedCal[ownerSavedKey(o.id)] ?? null });
        const news = newsSince(c, 'OWNER', seen[seenKey(view.id, o.id, 'OWNER')] ?? null);
        return { offer: o, strip, news };
      })
      .sort((a, b) => listRank(a.strip, a.news.length > 0, 'OWNER') - listRank(b.strip, b.news.length > 0, 'OWNER'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, matched, deals, now, savedCal, seen]);
  /** 거래 페이지를 열면 그 중개사의 새 소식은 읽은 것으로 */
  const markDealSeen = (offerId: string) => {
    if (view) setSeen((m) => markSeen(m, view.id, offerId, 'OWNER', new Date()));
  };

  return {
    now,
    setNow,
    request,
    setRequest,
    past,
    setPast,
    loaded,
    draft,
    setDraft,
    deals,
    setDeals,
    savedCal,
    setSavedCal,
    view,
    matched,
    today,
    currentYear,
    update,
    commitVisits,
    iso,
    archive,
    answer,
    feeAnswer,
    review,
    ownerDates,
    reportContract,
    endRequest,
    changePrice,
    notifyPrice,
    pauseRequest,
    resumeRequest,
    confirmMatch,
    releaseMatch,
    saveShowing,
    contractLines,
    canDeclareProvisional,
    confirmedPrice,
    recordPauseCall,
    ownerSavedKey,
    ownerStrips,
    markDealSeen,
  };
}
