'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { hoursLeft, isProtected, protectionEndsAt, releaseOffer, rerequest, toggleSelection } from '@/lib/requests/stage';
import type { BrokerOffer } from '@/lib/requests/types';
import MyRequestsHeader from '@/components/my-requests/MyRequestsHeader';
import EmptyRequestsView from '@/components/my-requests/EmptyRequestsView';
import RequestHero from '@/components/my-requests/RequestHero';
import RequestSummaryDetail from '@/components/my-requests/RequestSummaryDetail';
import ReceivingSection from '@/components/my-requests/ReceivingSection';
import InProgressSection from '@/components/my-requests/InProgressSection';
import AdRemovalCard from '@/components/my-requests/AdRemovalCard';
import OwnerTodoSection from '@/components/my-requests/OwnerTodoSection';
import { heroVisit, ownerTodoItems } from '@/lib/deal/ownerTodo';
import { pendingPriceNotices } from '@/lib/deal/priceChange';
import PriceChangeSheet from '@/components/my-requests/PriceChangeSheet';
import { shortName } from '@/lib/market/debateTopics';
import { track } from '@/lib/analytics/store';
import OwnerCheckBanner from '@/components/my-requests/OwnerCheckBanner';
import { CancelRequestSheet, Celebration, ConfirmMatchSheet, ReleaseSheet } from '@/components/my-requests/RequestSheets';
import FeeSheet from '@/components/my-requests/FeeSheet';
import ReviewSheet from '@/components/my-requests/ReviewSheet';
import OfficeSheet from '@/components/my-requests/OfficeSheet';
import PastRequestsList from '@/components/my-requests/PastRequestsList';
import OwnerDealPage from '@/components/my-requests/OwnerDealPage';
import { OwnerQaSwitcher, ownerQaScenario, type OwnerQaKind } from '@/components/my-requests/OwnerQa';
import { useOwnerRequest } from '@/components/my-requests/useOwnerRequest';
import InquiryEntry, { ownerInquiryContext } from '@/components/support/InquiryEntry';
import { useContactReveal } from '@/components/data/useContactReveal';
import { discountPct } from '@/lib/deal/dealFee';
import { DEMO_SAVED_REQUEST, demoPastRequests } from '@/components/my-requests/mock-requests';
import { fill, formatDateKo, toDateKey } from '@/components/my-requests/format';
import { parseSavedRequest, RESUME_KEY } from '@/lib/requests/requestDraft';
import { loadMarket, saveMarket } from '@/lib/broker/mockMarket';
import { ackCanceled, cancelVisit } from '@/lib/requests/showing';
import { adRemoval, applyDeals, pauseAdRemoval, pauseCancelVisitIds, winnerOf } from '@/lib/deal/deal';
import { markCalendarSaved } from '@/lib/deal/savedCalendar';
import DealNewsRow from '@/components/agent/DealNewsRow';
import DealStrip from '@/components/agent/DealStrip';

type Sheet = 'NONE' | 'CONFIRM' | 'CANCEL' | 'FEE_CHANGE' | 'FEE_RETRY';

/**
 * 내 의뢰: 한 화면 + 상태 3단계 + 종료 (대표님 합의 2026-10-24~25)
 * ① 요청 받는 중(ReceivingSection) → (확정 시트 → 축하 화면) → ② 진행중(InProgressSection) → ③ 계약 완료 / 종료
 * 이 파일은 화면 상태(시트·선택·축하)만 가진다. 의뢰 상태와 거래 기록 동작은 useOwnerRequest
 */
export default function MyRequestsPage() {
  const router = useRouter();
  const t = SITE_CONTENT.myRequests;
  const o = useOwnerRequest();
  const { view, request, matched, now, today, deals, update, iso } = o;
  const [selected, setSelected] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Sheet>('NONE');
  const [releaseTarget, setReleaseTarget] = useState<BrokerOffer | null>(null);
  const [reviewOffer, setReviewOffer] = useState<BrokerOffer | null>(null);
  const [officeOffer, setOfficeOffer] = useState<BrokerOffer | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  /** 열어 둔 중개사별 거래 페이지 */
  const [dealOfferId, setDealOfferId] = useState<string | null>(null);

  const confirmMatch = () => {
    const at = iso();
    o.confirmMatch(selected, new Date(at));
    update((r) => ({ ...r, stage: 'IN_PROGRESS', matchedOfferIds: selected, matchedAt: at, adWindowStartedAt: at }));
    setSheet('NONE');
    setCelebrate(true);
  };

  /** 매칭 전 복비 변경 = 취소하고 다시 등록 / 끝난 의뢰 다시 요청 */
  const submitFee = (fee: number) => {
    if (!request) return;
    if (sheet === 'FEE_CHANGE') o.archive(request, 'CANCELLED');
    o.setRequest(rerequest(request, fee, new Date(iso())));
    setSelected([]);
    setSheet('NONE');
  };

  // ── 테스트 스위처: 상태별 틀 확인용 (배포 전 제거) ──
  const qa = (kind: OwnerQaKind) => {
    const d = new Date();
    setSelected([]);
    setCelebrate(false);
    setSheet('NONE');
    o.setPast(kind === 'expired' || kind === 'expiredNoOffer' ? demoPastRequests(d).slice(1) : []);
    o.setDraft(parseSavedRequest(DEMO_SAVED_REQUEST));
    const s = ownerQaScenario(kind, d);
    // 테스트용 직접 조작: 예시를 고르면 그 의뢰의 거래 기록을 예시 것으로 바꾸고, 전에 남긴 끝냄·멈춤 표시는 지운다
    const m = loadMarket();
    const ended = { ...(m.ended ?? {}) };
    const pause = { ...(m.pause ?? {}) };
    const price = { ...(m.price ?? {}) };
    const matchedMap = { ...m.matched };
    delete ended[s.baseId];
    delete pause[s.baseId];
    delete price[s.baseId];
    delete matchedMap[s.baseId];
    // 매칭된 예시면 저장소에도 매칭을 남긴다 (희망가 바꾸기처럼 저장소가 진행 중인지 확인하는 동작도 시험되게)
    if (s.request?.matchedAt && s.request.matchedOfferIds.length > 0) matchedMap[s.baseId] = { offerIds: s.request.matchedOfferIds, at: s.request.matchedAt };
    saveMarket({ ...m, deals: { ...(m.deals ?? {}), [s.baseId]: s.deals }, ended, pause, price, matched: matchedMap });
    o.setDeals(s.deals);
    setDealOfferId(null);
    o.setNow(d.getTime());
    o.setRequest(s.request ? applyDeals(s.request, s.deals, d) : null);
  };

  const openDeal = (offerId: string) => {
    o.markDealSeen(offerId);
    setDealOfferId(offerId);
  };
  const winnerId = winnerOf(deals);
  /** 집주인이 지금 할 일이 있는 중개사 (파랑 띠). 확인할 보고가 있으면 판매 상태·계약 알리기는 그 확인으로 보냄 */
  const confirmRow = o.ownerStrips.find((r) => r.strip.key === 'CONFIRM') ?? null;
  const dealOffer = dealOfferId ? view?.offers.find((x) => x.id === dealOfferId) ?? null : null;
  /** 매칭 뒤 희망가 바꾸기 창 (바꾸기 / 알리기) + 바뀐 희망가를 아직 안 알린 곳 */
  const [priceSheet, setPriceSheet] = useState<'EDIT' | 'NOTIFY' | null>(null);
  const priceNotices = view ? pendingPriceNotices(deals, matched.map((x) => x.id)) : [];
  // 동·호수·세입자 전화: 매칭 확정 뒤 화면 진입 때 1번 열람 (요약 카드·방문 일정이 같이 씀)
  const revealed = useContactReveal(view, 'OWNER_VIEW', view?.stage === 'IN_PROGRESS' || view?.stage === 'CONTRACTED');
  const lockedLabel = view?.matchedAt && isProtected(view.matchedAt, now) ? formatDateKo(toDateKey(new Date(protectionEndsAt(view.matchedAt)))) : null;

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col">
        <MyRequestsHeader />

        <main className="flex-1 px-4 pb-32 space-y-3">
          {!o.loaded ? null : !view ? (
            <EmptyRequestsView />
          ) : (
            <>
              <RequestHero
                key={`${view.id}-${view.stage}`}
                defaultOpen={view.stage === 'RECEIVING'}
                detail={<RequestSummaryDetail request={view} dongHo={revealed.dongHo} />}
                stage={view.stage}
                endedReason={view.endedReason}
                offerCount={view.offers.length}
                matchedCount={matched.length}
                hoursLeft={hoursLeft(view.createdAt, now)}
                liveAds={matched.filter((x) => x.ad).length}
                visit={heroVisit(view.visits, new Date(now))}
                newsCount={o.ownerStrips.reduce((n, r) => n + r.news.length, 0)}
                // "34평 · 전용 84㎡" 중 평형만 (전용 면적은 펼친 내용에)
                homeLine={`${shortName(view.complexName)} · ${view.pyeongLabel.split(' · ')[0]} ${view.tradeType}`}
                paused={!!view.paused}
                reviewed={!!view.contract?.review}
              />

              {/* 지금 확인할 일: 집주인 할 일(빨강)·다가오는 방문·계약일(노랑) (lib/deal/ownerTodo) */}
              {(view.stage === 'IN_PROGRESS' || view.stage === 'CONTRACTED') && (
                <OwnerTodoSection
                  items={ownerTodoItems(
                    o.ownerStrips.map((r) => ({ offerId: r.offer.id, strip: r.strip })),
                    view.visits,
                    new Date(now),
                    priceNotices.map((p) => ({ offerId: p.offerId, price: formatPriceTenThousand(p.priceManwon) })),
                  )}
                  offers={view.offers}
                  onOpen={(it) => (it.strip.key === 'PRICE_NOTIFY' ? setPriceSheet('NOTIFY') : openDeal(it.offerId))}
                />
              )}
              {view.stage === 'IN_PROGRESS' && <OwnerCheckBanner request={view} />}


              {view.stage === 'RECEIVING' && (
                <ReceivingSection
                  offers={view.offers}
                  currentYear={o.currentYear}
                  selected={selected}
                  onToggle={(id) => setSelected((s) => toggleSelection(s, id))}
                  onOpenReviews={setReviewOffer}
                  onChangeFee={() => setSheet('FEE_CHANGE')}
                  onCancel={() => setSheet('CANCEL')}
                />
              )}

              {view.stage === 'IN_PROGRESS' && (
                <InProgressSection
                  view={view}
                  now={now}
                  today={today}
                  tenantPhone={revealed.contact?.tenantPhone ?? ''}
                  rows={o.ownerStrips}
                  matched={matched}
                  removal={view.paused ? pauseAdRemoval(view, deals) : adRemoval(view, deals)}
                  removalSub={view.paused ? t.inProgress.pauseRemovalSub : undefined}
                  lockedLabel={lockedLabel}
                  onRelease={setReleaseTarget}
                  onOpenOffice={setOfficeOffer}
                  onOpenDeal={openDeal}
                  onShowingChange={(showing) => {
                    update((r) => ({ ...r, showing }));
                    o.saveShowing(showing);
                  }}
                  onCancelVisit={(id) => o.commitVisits(cancelVisit(view.visits, id, 'OWNER', new Date()))}
                  onAckCanceled={(id) => o.commitVisits(ackCanceled(view.visits, id, 'OWNER'))}
                  sale={{
                    onPause: o.pauseRequest,
                    onResume: o.resumeRequest,
                    visitsToCancel: pauseCancelVisitIds(view, new Date(now)).length,
                    confirmFirst: confirmRow ? () => openDeal(confirmRow.offer.id) : undefined,
                    onWithdraw: () => o.endRequest('WITHDRAWN'),
                    onReportContract: o.reportContract,
                    contractLines: o.contractLines,
                    canDeclareProvisional: o.canDeclareProvisional,
                    confirmedPrice: o.confirmedPrice,
                    onCallBroker: o.recordPauseCall,
                    onEditPrice: () => setPriceSheet('EDIT'),
                    // 이유 칩·다른 곳 계약 때 아쉬웠던 점 → 행동 기록 (부동산에는 안 보임, 2026-10-27)
                    onSaleLog: (action, reasonChip, lostReason) =>
                      track(
                        'sale_change',
                        { action, ...(reasonChip ? { reasonChip } : {}), ...(lostReason ? { lostReason } : {}) },
                        { requestId: view.id },
                      ),
                  }}
                />
              )}

              {/* ③ 계약 완료: 계약한 중개사 카드 하나. 복비 확인·날짜·잔금 확인·후기는 모두 그 거래 페이지에서 (⑥) */}
              {view.stage === 'CONTRACTED' &&
                o.ownerStrips
                  .filter(({ offer }) => offer.id === (winnerId ?? view.contract?.offerId))
                  .map(({ offer: w, strip, news }) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => openDeal(w.id)}
                      data-testid="owner-deal-winner"
                      className={`block w-full rounded-2xl bg-surface-card overflow-hidden text-left active:scale-[0.99] transition-transform duration-fast ease-out-soft ${
                        strip.tone === 'ACTION' ? 'ring-2 ring-brand' : ''
                      }`}
                    >
                      <span className="block p-4">
                        <span className="block text-[12px] font-bold text-text-tertiary">{t.deal.winnerTitle}</span>
                        <span className="mt-1 flex items-center justify-between gap-2 text-[17px] font-bold text-text-primary">
                          {w.disclosure.officeName}
                          <ChevronRight className="w-5 h-5 text-text-tertiary" aria-hidden />
                        </span>
                      </span>
                      <DealNewsRow news={news} viewer="OWNER" now={now} />
                      <DealStrip strip={strip} tappable />
                    </button>
                  ))}

              {/* 종료: 같은 집 다시 요청 (요청이 0곳이었으면 복비 조절을 권함) + 지난 의뢰 */}
              {view.stage === 'ENDED' && (
                <>
                  {/* 다른 곳에서 팔았어요·거둬들이기: 광고 올린 중개사가 "광고 내렸어요"를 누른 수 */}
                  <AdRemovalCard removal={adRemoval(view, deals)} sub={t.ended.adRemovalSub} />
                  {/* 허위 매물로 확인된 집은 운영팀 확인 전까지 다시 요청하지 않음 (약관 제11조) */}
                  {view.endedReason !== 'FAKE_CONFIRMED' && (
                    <button type="button" onClick={() => setSheet('FEE_RETRY')} data-testid="retry" className="w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold">
                      {view.endedReason === 'EXPIRED' && view.offers.length === 0 ? t.ended.retryNoOffer : t.ended.retry}
                    </button>
                  )}
                  <PastRequestsList items={o.past} />
                </>
              )}

              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full h-13 rounded-xl text-text-secondary text-[15px] font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" aria-hidden />
                {t.newRequest}
              </button>
            </>
          )}

          {/* 문의하기 (자주 묻는 질문 + 양식) · 내 정보 관리 (열람·정정·탈퇴, 대표님 2026-10-29) */}
          <InquiryEntry role="OWNER" context={ownerInquiryContext} />
          <Link href="/my-info" data-testid="my-requests-my-info" className="min-h-11 flex items-center justify-center text-[13px] font-medium text-text-tertiary underline">
            {SITE_CONTENT.myInfo.link}
          </Link>

          {/* 테스트 스위처 (배포 전 제거) */}
          <OwnerQaSwitcher onPick={qa} />
        </main>

        {/* ① 하단 고정 확정 버튼 */}
        {view?.stage === 'RECEIVING' && view.offers.length > 0 && (
          <div className="fixed bottom-0 inset-x-0 z-40">
            <div className="max-w-md mx-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface-page">
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setSheet('CONFIRM')}
                data-testid="confirm-match-cta"
                className="w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold disabled:bg-border-default disabled:text-text-tertiary"
              >
                {selected.length === 0 ? t.receiving.confirmCtaEmpty : fill(t.receiving.confirmCta, { count: selected.length })}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmMatchSheet
        open={sheet === 'CONFIRM'}
        count={selected.length}
        feeLabel={view ? formatWon(view.commissionWon) : ''}
        discountPct={view ? discountPct(view) : null}
        onConfirm={confirmMatch}
        onCancel={() => setSheet('NONE')}
      />
      <CancelRequestSheet
        open={sheet === 'CANCEL'}
        onConfirm={() => {
          update((r) => ({ ...r, stage: 'ENDED', endedReason: 'CANCELLED' }));
          setSheet('NONE');
        }}
        onCancel={() => setSheet('NONE')}
      />
      <ReleaseSheet
        target={releaseTarget}
        onConfirm={() => {
          if (releaseTarget && request) {
            // 저장소: 중개사 화면에 "매칭이 해제됐어요"
            o.releaseMatch(releaseTarget.id);
            update((r) => releaseOffer(r, releaseTarget.id));
          }
          setReleaseTarget(null);
        }}
        onCancel={() => setReleaseTarget(null)}
      />

      {view && (
        <FeeSheet
          open={sheet === 'FEE_CHANGE' || sheet === 'FEE_RETRY'}
          mode={sheet === 'FEE_CHANGE' ? 'CHANGE' : 'RETRY'}
          currentFeeWon={view.commissionWon}
          legalMaxWon={view.legalMaxWon}
          aptId={view.aptId}
          draft={o.draft}
          onSubmit={submitFee}
          onEdit={(step, feeWon) => {
            if (!o.draft) return;
            try {
              localStorage.setItem(RESUME_KEY, JSON.stringify({ step, feeWon, draft: o.draft }));
            } catch {}
            router.push(`/analysis/${o.draft.aptId}?resume=1`);
          }}
          onClose={() => setSheet('NONE')}
        />
      )}

      {view && dealOffer && (
        <OwnerDealPage
          key={`deal-${dealOffer.id}`}
          request={view}
          offer={dealOffer}
          deals={deals}
          now={now}
          calendarSavedAt={o.savedCal[o.ownerSavedKey(dealOffer.id)] ?? null}
          onAnswer={(step, ok) => o.answer(dealOffer.id, step, ok)}
          onCalendarSaved={() => o.setSavedCal((m) => markCalendarSaved(m, view.id, `${dealOffer.id}#owner`, new Date()))}
          onOpenOffice={() => setOfficeOffer(dealOffer)}
          onFeeAnswer={(kept, reason, note) => o.feeAnswer(dealOffer.id, kept, reason, note)}
          onOwnerDates={(next) => o.ownerDates(dealOffer.id, next)}
          onReview={(r) => o.review(dealOffer.id, r)}
          onClose={() => setDealOfferId(null)}
        />
      )}

      <ReviewSheet offer={reviewOffer} onClose={() => setReviewOffer(null)} />
      {/* 거래 페이지와 같은 부모라 key가 겹치지 않게 접두어 (거래 페이지에서 사무소 정보를 열면 둘 다 뜸) */}
      <OfficeSheet key={`office-${officeOffer?.id ?? 'none'}`} offer={officeOffer} currentYear={o.currentYear} onClose={() => setOfficeOffer(null)} />
      {view && priceSheet && (
        <PriceChangeSheet
          key={`price-${priceSheet}`}
          open
          mode={priceSheet}
          agreed={view}
          matched={matched}
          pending={priceNotices}
          onChange={o.changePrice}
          onNotify={o.notifyPrice}
          onClose={() => setPriceSheet(null)}
        />
      )}

      {celebrate && <Celebration count={matched.length} onClose={() => setCelebrate(false)} />}
    </div>
  );
}
