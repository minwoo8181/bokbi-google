'use client';

/**
 * 중개사 화면 테스트 스위처 (배포 전 제거): 집주인 쪽 행동·시간 흐름을 이 브라우저에서 흉내 낸다.
 * 화면 동작은 바꾸지 않고, 화면과 같은 저장소(repos)에 기록만 넣는다.
 */
import React from 'react';
import Link from 'next/link';
import { SITE_CONTENT } from '@/config/siteContent';
import type { BrokerApplication } from '@/lib/broker/application';
import { kstDateKey, refillWeekly } from '@/lib/broker/credits';
import { sentStatus } from '@/lib/broker/feed';
import { clearMockMarket, loadWorkspace, saveWorkspace } from '@/lib/broker/mockMarket';
import { addVisit, cancelVisit, checkBrokerVisit, upcomingVisits } from '@/lib/requests/showing';
import { closeOthers, dealState, winnerOf } from '@/lib/deal/deal';
import { repos } from '@/components/data/repos';
import type { AgentWorkspaceState } from './useAgentWorkspace';

const t = SITE_CONTENT.brokerAgent;

export type QaKind =
  | 'approve'
  | 'noCredit'
  | 'ownerPicksMe'
  | 'ownerPicksOther'
  | 'adOverdue'
  | 'ownerReleases'
  | 'adminConfirmFake'
  | 'adminRejectFake'
  | 'otherVisit'
  | 'ownerCancelsVisit'
  | 'ownerYes'
  | 'ownerNo'
  | 'datesToday'
  | 'elsewhere'
  | 'ownerSoldElsewhere'
  | 'ownerWithdraws'
  | 'ownerPauses'
  | 'ownerPausedLate'
  | 'ownerResumes'
  | 'ownerReview'
  | 'nextWeek'
  | 'reset';

const APPROVED_KEYS: QaKind[] = [
  'approve',
  'noCredit',
  'ownerPicksMe',
  'ownerPicksOther',
  'adOverdue',
  'ownerReleases',
  'adminConfirmFake',
  'adminRejectFake',
  'otherVisit',
  'ownerCancelsVisit',
  'ownerYes',
  'ownerNo',
  'datesToday',
  'elsewhere',
  'ownerSoldElsewhere',
  'ownerWithdraws',
  'ownerPauses',
  'ownerPausedLate',
  'ownerResumes',
  'ownerReview',
  'nextWeek',
  'reset',
];

/** 테스트 스위처용 승인된 예시 사무소 (가입 화면 스위처와 같은 사무소, 배포 전 제거) */
const QA_APPLICATION: BrokerApplication = {
  regNo: '41360-2024-60048',
  office: '1등이편한공인중개사사무소',
  ceo: '이상현',
  code: '0000',
  strengths: ['손님을 잘 데려와요', '연락이 빨라요', '사진을 잘 찍어요'],
  conditions: ['주말 안내 가능', '전자계약 가능'],
  phone: '010-0000-0000',
  submittedAt: '2026-10-24T09:00:00+09:00',
  status: 'APPROVED',
  reviewedAt: '2026-10-25T09:00:00+09:00',
  rejectReason: null,
  openYear: 2024,
};

/**
 * 스위처 버튼 하나를 실행한다. 결과를 보여 줄 탭으로 옮기거나, 해당 상황이 없으면 안내 토스트.
 * 집주인·운영팀 동작은 화면과 같은 저장소 메서드로 (repos). 크레딧 0개·다음 주·초기화만 테스트용 직접 조작
 */
export async function runQa(kind: QaKind, w: AgentWorkspaceState, ui: { setTab: (tab: 'listings') => void; setToast: (msg: string) => void }) {
  const { ws, byId, now, strips, today, dealsFor, commitVisits, addDealEvent, saveDatesFor, reload } = w;
  const { setTab, setToast } = ui;
  const at = new Date();
  const firstSelected = () => ws.sent.find((s) => sentStatus(s, byId.get(s.requestId) ?? null, now) === 'SELECTED');
  const done = async () => {
    await reload();
    setTab('listings');
  };

  if (kind === 'approve') {
    await repos.applications.save(QA_APPLICATION);
    return reload();
  }
  if (kind === 'reset') {
    clearMockMarket();
    return reload();
  }
  // ── 테스트용 직접 조작 (실제 흐름에 없는 상태 만들기) ──
  if (kind === 'noCredit' || kind === 'nextWeek') {
    const cur = loadWorkspace();
    const wallet = kind === 'noCredit' ? { ...cur.wallet, balance: 0 } : refillWeekly({ ...cur.wallet, refilledWeek: null }, at);
    saveWorkspace({ ...cur, wallet });
    return reload();
  }
  // ── 집주인·운영팀 동작 (저장소) ──
  if (kind === 'adOverdue') {
    // 선택된 첫 매물의 확정 시각을 50시간 전으로 (광고 기한 지남 확인용)
    const sel = firstSelected();
    const ids = sel ? byId.get(sel.requestId)?.matchedOfferIds : null;
    if (!sel || !ids?.length) return setToast(t.qa.noWaiting);
    await repos.requests.confirmMatch(sel.requestId, ids, new Date(at.getTime() - 50 * 3_600_000));
    return done();
  }
  if (kind === 'ownerReleases') {
    const sel = firstSelected();
    if (!sel) return setToast(t.qa.noWaiting);
    await repos.requests.release(sel.requestId, sel.offerId);
    return done();
  }
  if (kind === 'otherVisit') {
    // 선택된 첫 매물에 다른 중개사가 내일 19시 방문을 저장한 것으로 (누구인지는 화면에 안 보임)
    const sel = firstSelected();
    if (!sel) return setToast(t.qa.noWaiting);
    const tomorrow = kstDateKey(new Date(at.getTime() + 86_400_000));
    const visits = byId.get(sel.requestId)?.visits ?? [];
    const hour = [19, 18, 20, 14, 15].find((h) => !checkBrokerVisit(visits, { offerId: 'offer-other', date: tomorrow, hour: h }, at));
    if (hour === undefined) return setTab('listings');
    await commitVisits(sel.requestId, (v) => addVisit(v, { offerId: 'offer-other', date: tomorrow, hour }, `visit-other-${at.getTime()}`, at));
    return setTab('listings');
  }
  if (kind === 'ownerCancelsVisit') {
    // 내 첫 방문 일정을 집주인이 전화로 취소한 것으로
    const hit = ws.sent
      .flatMap((s) => upcomingVisits(byId.get(s.requestId)?.visits ?? [], today).filter((v) => v.offerId === s.offerId).map((v) => ({ s, v })))
      .at(0);
    if (!hit) return setToast(t.qa.noVisit);
    await commitVisits(hit.s.requestId, (v) => cancelVisit(v, hit.v.id, 'OWNER', at));
    return setTab('listings');
  }
  if (kind === 'ownerYes' || kind === 'ownerNo') {
    // 집주인 맞아요/아니에요. 처음 가계약·계약 확인이면 다른 곳 정리 + 방문 자동 취소
    const hit = ws.sent.map((s) => ({ s, st: dealState(dealsFor(s.requestId)[s.offerId] ?? []) })).find(({ st }) => st.pending);
    if (!hit || !hit.st.pending) return setToast(t.qa.noPending);
    const r = byId.get(hit.s.requestId);
    const step = hit.st.pending.step;
    if (kind === 'ownerYes' && r && (step === 'PROVISIONAL' || step === 'CONTRACT') && !winnerOf(dealsFor(r.id))) {
      await repos.visits.save(r.id, closeOthers(r, dealsFor(r.id), hit.s.offerId, at).visits);
    }
    await addDealEvent(hit.s, { kind: 'ANSWER', step, ok: kind === 'ownerYes' });
    return setTab('listings');
  }
  if (kind === 'ownerReview') {
    // 잔금까지 끝난 거래에 집주인 복비 답(그대로) + 후기 → 크레딧 자동 돌려받기 확인용
    const hit = ws.sent.find((s) => dealState(dealsFor(s.requestId)[s.offerId] ?? []).phase === 'DONE');
    if (!hit) return setToast(t.qa.noDone);
    if (dealState(dealsFor(hit.requestId)[hit.offerId] ?? []).feeKept === null) await repos.deals.append(hit.requestId, hit.offerId, { kind: 'FEE_ANSWER', kept: true }, at);
    await repos.deals.append(hit.requestId, hit.offerId, { kind: 'REVIEW', stars: 5, chips: [] }, new Date(at.getTime() + 1));
    return done();
  }
  if (kind === 'datesToday') {
    // 다음에 올 날짜(가계약 중이면 계약일, 계약 뒤면 잔금일)를 오늘로
    const sel = ws.sent.find((s) => strips.has(s.requestId));
    if (!sel) return setToast(t.qa.noDeal);
    const st = dealState(dealsFor(sel.requestId)[sel.offerId] ?? []);
    const field = st.phase === 'CONTRACTED' ? 'BALANCE' : 'CONTRACT';
    await saveDatesFor(sel, { ...st.dates, [field]: kstDateKey(at) });
    return setTab('listings');
  }
  if (kind === 'elsewhere') {
    // 다른 중개사의 가계약을 집주인이 확인한 것으로 (누구인지는 화면에 안 보임)
    const sel = ws.sent.find((s) => strips.has(s.requestId));
    const r = sel ? byId.get(sel.requestId) : null;
    if (!sel || !r) return setToast(t.qa.noDeal);
    const other = 'offer-other';
    await repos.visits.save(r.id, closeOthers(r, dealsFor(r.id), other, at).visits);
    await repos.deals.append(r.id, other, { kind: 'REPORT', step: 'PROVISIONAL' }, new Date(at.getTime() - 1000));
    await repos.deals.append(r.id, other, { kind: 'ANSWER', step: 'PROVISIONAL', ok: true }, at);
    return done();
  }
  if (kind === 'ownerSoldElsewhere' || kind === 'ownerWithdraws') {
    // 집주인이 "다른 곳에서 팔았어요"·"거둬들이기" (집주인 화면과 같은 저장소 메서드)
    const sel = ws.sent.find((s) => strips.has(s.requestId));
    if (!sel) return setToast(t.qa.noDeal);
    await repos.requests.end(sel.requestId, kind === 'ownerWithdraws' ? 'WITHDRAWN' : 'SOLD_ELSEWHERE', at);
    return done();
  }
  if (kind === 'ownerPauses' || kind === 'ownerPausedLate' || kind === 'ownerResumes') {
    // 집주인이 잠시 멈춤 (지금 / 하루 넘게 전 → 광고 내림 기한 지남) · 다시 시작
    const sel = ws.sent.find((s) => strips.has(s.requestId));
    if (!sel) return setToast(t.qa.noDeal);
    if (kind === 'ownerResumes') await repos.requests.resume(sel.requestId, at);
    else await repos.requests.pause(sel.requestId, '기타', kind === 'ownerPausedLate' ? new Date(at.getTime() - 25 * 3_600_000) : at);
    return done();
  }
  if (kind === 'adminConfirmFake' || kind === 'adminRejectFake') {
    // 운영팀 판정 (관리자 콘솔과 같은 저장소 메서드): 허위 맞음 → 의뢰 종료 + 매칭된 곳 크레딧 1개씩 / 아님 → 남은 시간부터 다시
    const rep = ws.sent.find((s) => byId.get(s.requestId)?.offers.find((o) => o.id === s.offerId)?.fakeReport?.status === 'PENDING');
    if (!rep) return setToast(t.qa.noReport);
    const res = await repos.offers.decideFakeReport(rep.requestId, rep.offerId, kind === 'adminConfirmFake' ? 'CONFIRMED' : 'REJECTED', at);
    if (!res.ok) return setToast(t.qa.noReport);
    return done();
  }
  const waiting = ws.sent.find((s) => sentStatus(s, byId.get(s.requestId) ?? null, now) === 'WAITING');
  if (!waiting) return setToast(t.qa.noWaiting);
  const other = byId.get(waiting.requestId)?.offers.find((o) => o.id !== waiting.offerId)?.id ?? 'offer-other';
  await repos.requests.confirmMatch(waiting.requestId, kind === 'ownerPicksMe' ? [waiting.offerId] : [other], at);
  return done();
}

export function QaSwitcher({ onPick, approved }: { onPick: (k: QaKind) => void; approved: boolean }) {
  const keys: QaKind[] = approved ? APPROVED_KEYS : ['approve'];
  const pill = 'h-9 px-3 rounded-lg bg-surface-card text-[12px] font-bold text-text-secondary inline-flex items-center';
  return (
    <div className="pt-6 border-t border-border-default text-center space-y-2">
      <p className="text-[12px] font-bold text-text-tertiary">{t.qa.title}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {keys.map((k) => (
          <button key={k} type="button" data-testid={`qa-${k}`} onClick={() => onPick(k)} className={pill}>
            {t.qa[k]}
          </button>
        ))}
        <Link href="/my-requests" className={pill}>
          {t.qa.ownerScreen}
        </Link>
        <Link href="/agent/register" className={pill}>
          {t.qa.signup}
        </Link>
      </div>
    </div>
  );
}
