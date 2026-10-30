'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatWon } from '@/lib/utils';
import { kstDateKey } from '@/lib/broker/credits';
import { sentStatus, type SentRequest, type SentStatus } from '@/lib/broker/feed';
import { agentTodoItems } from '@/lib/broker/agentTodo';
import { listingBucket } from '@/lib/broker/pastRequests';
import { myOffer } from '@/lib/broker/listing';
import { adState, hoursLeft } from '@/lib/requests/stage';
import type { CardStrip, TimelineItem } from '@/lib/deal/deal';
import type { OwnerRequest } from '@/lib/requests/types';
import { fill, formatDateKo, SECTION_COUNT } from '@/components/my-requests/format';
import StatusPill, { CARD_HIDDEN_STRIPS, STATUS_DOT } from '@/components/common/StatusPill';
import { isBlocking } from '@/lib/deal/deal';
import { CARD_ACTION } from '@/components/common/cardStyles';
import AgentTodoSection, { AgentUrgentAlert } from './AgentTodoSection';
import DealNewsRow from './DealNewsRow';
import { stripText } from './DealStrip';

const t = SITE_CONTENT.brokerAgent;

/** 지금 할 일 섹션에 이미 있는 색 띠 (카드 상태 줄에서는 뺀다) */
const TODO_TONES = new Set<CardStrip['tone']>(['RISK', 'ACTION', 'CAUTION']);

function SectionTitle({ title, n }: { title: string; n: number }) {
  return (
    <h2 className="pt-3 px-1 flex items-center gap-2 text-[17px] font-bold text-text-primary">
      {title}
      {n > 0 && <span className={SECTION_COUNT}>{fill(t.listings.sectionCount, { n })}</span>}
    </h2>
  );
}

interface ListingsTabProps {
  /** 정렬된 보낸 요청 (빨강·파랑·새 소식이 위) */
  sent: SentRequest[];
  byId: Map<string, OwnerRequest>;
  strips: Map<string, CardStrip>;
  newsBy: Map<string, TimelineItem[]>;
  now: number;
  /** 카드에 쓰는 복비 (거래금액이 확정됐으면 다시 계산한 금액) */
  feeOf: (s: SentRequest) => number;
  /** 색 띠가 있는 매물(거래 중)을 열 때: 새 소식 읽음 표시 + 거래 페이지 */
  onOpenDeal: (s: SentRequest) => void;
  /** 선택됐지만 색 띠가 없는 매물을 열 때 */
  onOpen: (requestId: string) => void;
}

/**
 * 내 매물 탭 (대표님 2026-10-27, 집주인 내 의뢰와 같은 틀): 긴급 알림(빨강 할 일) → 안내 줄 → 곧 할 일(노랑) → 진행 중 매물 → 보낸 요청.
 * 카드는 집주인 "진행 중인 부동산"과 같은 순서: 제목·정보 줄 → 점 알약 → (상태 한 줄) → 파란 주 버튼 하나
 */
export default function ListingsTab({ sent, byId, strips, newsBy, now, feeOf, onOpenDeal, onOpen }: ListingsTabProps) {
  const statusOf = (s: SentRequest) => sentStatus(s, byId.get(s.requestId) ?? null, now);
  // 진행 중 · 결과 기다리는 중만 여기, 끝난 요청은 내 사무소 "지난 요청" (pastRequests.listingBucket, 2026-10-27)
  const bucketOf = (s: SentRequest) => listingBucket(statusOf(s), strips.get(s.requestId)?.tone ?? null, s.sentAt, now);
  const inProgress = sent.filter((s) => bucketOf(s) === 'PROGRESS');
  const others = sent.filter((s) => bucketOf(s) === 'WAITING');
  const pastCount = sent.filter((s) => bucketOf(s) === 'PAST').length;
  const todo = agentTodoItems(inProgress.flatMap((s) => (strips.has(s.requestId) ? [{ requestId: s.requestId, strip: strips.get(s.requestId)! }] : []))).map((it) => ({
    ...it,
    s: inProgress.find((s) => s.requestId === it.requestId)!,
  }));
  // 기한 지난 일(새 요청 잠금 대상)이 있으면 잠금 이유는 긴급 알림 상자 안에서만 (안내 줄과 겹치지 않게)
  const blocking = todo.some((it) => isBlocking(it.strip));
  const notice = blocking ? t.listings.notice.slice(0, 1) : t.listings.notice;
  return (
    <section className="space-y-2" data-testid="tab-listings">
      <AgentUrgentAlert items={todo} blocking={blocking} onOpen={onOpenDeal} />
      <ul className="pt-1 px-1 space-y-1" data-testid="listings-notice">
        {notice.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[13px] font-medium text-text-tertiary break-keep text-pretty">
            <span aria-hidden className="mt-[7px] w-1 h-1 rounded-full bg-text-tertiary shrink-0" />
            {line}
          </li>
        ))}
      </ul>
      <AgentTodoSection items={todo} onOpen={onOpenDeal} />
      {inProgress.length > 0 && (
        <div className="space-y-3" data-testid="listings-progress">
          <SectionTitle title={t.listings.progressTitle} n={inProgress.length} />
          {inProgress.map((s) => (
            <ProgressCard
              key={s.requestId}
              s={s}
              req={byId.get(s.requestId) ?? null}
              strip={strips.get(s.requestId) ?? null}
              news={newsBy.get(s.requestId) ?? []}
              status={statusOf(s)}
              now={now}
              fee={feeOf(s)}
              onOpen={() => (strips.has(s.requestId) ? onOpenDeal(s) : onOpen(s.requestId))}
            />
          ))}
        </div>
      )}
      {(inProgress.length + others.length === 0 || others.length > 0) && (
        <div className="space-y-3">
          <SectionTitle title={t.listings.sentTitle} n={others.length} />
          {others.length === 0 ? (
            <div className="p-5 rounded-2xl bg-surface-card text-center">
              <p className="text-[15px] font-bold text-text-primary">{sent.length === 0 ? t.listings.empty : t.listings.waitingEmpty}</p>
              <p className="mt-1 text-[13px] font-medium text-text-tertiary">{t.listings.emptySub}</p>
            </div>
          ) : (
            others.map((s) => <SentCard key={s.requestId} s={s} req={byId.get(s.requestId) ?? null} status={statusOf(s)} now={now} />)
          )}
        </div>
      )}
      {pastCount > 0 && (
        <p className="pt-1 px-1 flex items-start gap-2 text-[13px] font-medium text-text-tertiary break-keep text-pretty" data-testid="listings-past-hint">
          <span aria-hidden className="mt-[7px] w-1 h-1 rounded-full bg-text-tertiary shrink-0" />
          {t.listings.pastHint}
        </p>
      )}
    </section>
  );
}

/** 카드 위쪽: 단지 이름 + 정보 줄 (집주인 카드의 사무소 이름 + 대표·주소 자리) */
function CardHead({ s, meta }: { s: SentRequest; meta: string }) {
  return (
    <>
      <p className="text-[17px] font-bold text-text-primary break-keep">{s.snapshot.complexName}</p>
      <p className="mt-1 text-[13px] font-medium text-text-tertiary break-keep">
        {s.snapshot.tradeType} · {s.snapshot.pyeongLabel} · {meta}
      </p>
    </>
  );
}

/** 진행 중 매물 카드: 광고 상태 알약(집주인 카드와 같은 adState) → 새 소식 → 할 일이 아닌 상태 한 줄 → 거래 진행 상황 버튼 */
function ProgressCard({
  s,
  req,
  strip,
  news,
  status: st,
  now,
  fee,
  onOpen,
}: {
  s: SentRequest;
  req: OwnerRequest | null;
  strip: CardStrip | null;
  news: TimelineItem[];
  status: SentStatus;
  now: number;
  fee: number;
  onOpen: () => void;
}) {
  const offer = myOffer(req, s);
  const ad = req && offer ? adState(offer, req, now) : null;
  const ended = strip?.tone === 'DONE';
  const statusLine = strip && !ended && !TODO_TONES.has(strip.tone) && !CARD_HIDDEN_STRIPS.has(strip.key) ? stripText(strip).label : null;
  const p = t.listings.adPill;
  return (
    <article className="rounded-2xl bg-surface-card overflow-hidden" data-testid="sent-card" data-status={st}>
      <div className="p-5 pb-3">
        <CardHead s={s} meta={formatWon(fee)} />
        <div className="mt-3">
          {ended && strip ? (
            <StatusPill tone="DONE">{stripText(strip).label}</StatusPill>
          ) : ad?.kind === 'LIVE' ? (
            <StatusPill tone="GOOD">{fill(p.LIVE, { day: ad.day })}</StatusPill>
          ) : ad?.kind === 'PENDING' ? (
            <StatusPill tone="WAIT">{fill(p.PENDING, { h: ad.hoursLeft })}</StatusPill>
          ) : ad?.kind === 'OVERDUE' ? (
            <StatusPill tone="RISK">{p.OVERDUE}</StatusPill>
          ) : ad?.kind === 'CHECKING' ? (
            <StatusPill tone="CAUTION">{p.CHECKING}</StatusPill>
          ) : ad?.kind === 'PAUSED' ? (
            <StatusPill tone="WAIT">{p.PAUSED}</StatusPill>
          ) : null}
        </div>
      </div>
      <DealNewsRow news={news} viewer="BROKER" now={now} />
      <div className="px-5 pb-5 pt-2">
        {statusLine && strip && (
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-text-secondary break-keep" data-testid="card-status">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[strip.tone]}`} aria-hidden />
            {statusLine}
          </p>
        )}
        <button
          type="button"
          onClick={onOpen}
          data-testid="listing-open"
          className={CARD_ACTION}
        >
          {t.listings.dealButton}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}

/** 보낸 요청 카드 (기다리는 중·끝남): 정보 줄 끝에 요청 날짜, 상태는 점 알약 하나. 끝난 이유가 필요한 것만 아래 한 줄 */
function SentCard({ s, req, status: st, now }: { s: SentRequest; req: OwnerRequest | null; status: SentStatus; now: number }) {
  const date = fill(t.listings.sentAt, { date: formatDateKo(kstDateKey(new Date(s.sentAt))) });
  const note = st === 'STOPPED' ? t.listings.stoppedSub : st === 'RELEASED' ? t.listings.releasedSub : null;
  return (
    <article className="p-5 rounded-2xl bg-surface-card" data-testid="sent-card" data-status={st}>
      <CardHead s={s} meta={`${formatWon(s.snapshot.commissionWon)} · ${date}`} />
      <div className="mt-3">
        {st === 'WAITING' ? (
          <StatusPill tone="WAIT">{fill(t.listings.waitingSub, { h: req ? hoursLeft(req.createdAt, now) : 0 })}</StatusPill>
        ) : (
          <StatusPill tone="DONE">{t.listings.status[st]}</StatusPill>
        )}
        {note && <p className="mt-2 pl-1 text-[13px] font-medium text-text-tertiary break-keep">{note}</p>}
      </div>
    </article>
  );
}
