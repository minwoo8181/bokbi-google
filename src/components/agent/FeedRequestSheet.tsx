'use client';

import React, { useState } from 'react';
import { ChevronDown, Home, Lock, Pencil, User, X } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import { dealEarnings, gapManwon, legalRatioPct, recommendedStrengths, type FeedItem, type SendBlock } from '@/lib/broker/feed';
import { leasedSaleSummary } from '@/lib/market/leasedSale';
import { mortgagePlanLabel } from '@/lib/market/mortgage';
import { BASE_STRENGTH_SLOTS, BONUS_SLOT_REVIEWS } from '@/lib/broker/strengthSlots';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, formatDateKo } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerAgent.detail;
const occupancyLabel = SITE_CONTENT.myRequests.feeSheet.occupancy;
const { groups } = SITE_CONTENT.brokerStrengths;

/** 집 정보 미니칩: 정해진 칸 값만 (자유 메모·채권최고액 없음) */
function chipsOf(item: FeedItem): string[] {
  const d = item.details;
  if (!d) return [];
  const out = [d.moveIn.type === 'DATE' && d.moveIn.date ? fill(t.moveIn.DATE, { date: formatDateKo(d.moveIn.date) }) : t.moveIn[d.moveIn.type === 'DATE' ? 'NEGOTIABLE' : d.moveIn.type]];
  if (d.aircon !== null) out.push(fill(t.aircon, { n: d.aircon }).trim());
  if (d.midDoor) out.push(t.midDoor);
  if (d.closet) out.push(t.closet);
  if (d.mortgage?.status === 'NONE') out.push(t.mortgageNone);
  if (d.mortgage?.status === 'EXISTS' && d.mortgage.plan) out.push(fill(t.mortgagePlan, { plan: mortgagePlanLabel(item.tradeType, d.mortgage.plan) }));
  return out;
}

interface FeedRequestSheetProps {
  item: FeedItem;
  /** 가입 때 고른 기본 강점 (먼저 채워 둔다) */
  defaultStrengths: string[];
  /** 칩 칸 수 (기본 3, 후기 10개부터 4 — strengthSlots.ts) */
  max: number;
  block: SendBlock | null;
  onSend: (strengths: string[]) => void;
  onClose: () => void;
}

/**
 * 의뢰 상세 + 요청 보내기 (설계 §3-4): 받는 금액 → 의뢰 정보 → 보낼 강점 3칸 / 이 매물에 추천 / 전체 보기 → 크레딧 안내
 * 칩을 누르면 빈칸에 들어가고, 3칸이 차 있으면 칸의 칩을 먼저 빼야 한다
 */
export default function FeedRequestSheet({ item, defaultStrengths, max: MAX, block, onSend, onClose }: FeedRequestSheetProps) {
  const [picked, setPicked] = useState<string[]>(() => defaultStrengths.slice(0, MAX));
  const recommended = recommendedStrengths(item);
  const full = picked.length >= MAX;
  const ratio = legalRatioPct(item.commissionWon, item.legalMaxWon);
  const gap = gapManwon(item);
  const earnings = dealEarnings(item);
  const houseChips = chipsOf(item);

  const toggle = (chip: string) =>
    setPicked((p) => (p.includes(chip) ? p.filter((c) => c !== chip) : p.length >= MAX ? p : [...p, chip]));

  const chipClass = (on: boolean) =>
    `h-10 px-4 rounded-full text-[13px] font-bold transition-colors disabled:opacity-40 ${
      on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'
    }`;

  return (
    <ActionSheet
      open
      testId="feed-request-sheet"
      title={item.complexName}
      confirmLabel={t.send}
      cancelLabel={t.close}
      confirmDisabled={block !== null}
      onConfirm={() => onSend(picked)}
      onCancel={onClose}
    >
      <p className="-mt-1 text-[15px] font-medium text-text-secondary">
        {item.pyeongLabel} · {item.maskedDongHo}
      </p>

      {/* 받는 금액 */}
      {/* 계약하면 받는 금액: 합계 크게 + 같은 크기 두 칸 (A안, 길이 비교가 생기지 않게) */}
      <div className="mt-4 p-4 rounded-2xl bg-brand-light" data-testid="deal-earnings">
        <p className="text-[13px] font-bold text-text-secondary">{t.payoutTitle}</p>
        <p className="mt-1 text-[26px] font-extrabold text-brand tabular-nums tracking-tight">{fill(t.earnings.totalValue, { won: formatWon(earnings.totalMaxWon) })}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-surface-card text-center">
            <p className="text-[12px] font-medium text-text-tertiary inline-flex items-center gap-1">
              <Home className="w-3.5 h-3.5" aria-hidden />
              {t.earnings.owner}
            </p>
            <p className="mt-1 text-[17px] font-extrabold text-brand tabular-nums">{formatWon(earnings.ownerWon)}</p>
            {ratio !== null && <p className="text-[12px] font-medium text-text-tertiary tabular-nums">{fill(t.earnings.ownerRatio, { pct: ratio })}</p>}
          </div>
          <div className="p-3 rounded-xl bg-surface-card text-center">
            <p className="text-[12px] font-medium text-text-tertiary inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" aria-hidden />
              {t.earnings.other[item.tradeType]}
            </p>
            <p className="mt-1 text-[17px] font-extrabold text-text-primary tabular-nums">{fill(t.earnings.otherValue, { won: formatWon(earnings.otherMaxWon) })}</p>
            <p className="text-[12px] font-medium text-text-tertiary">{t.earnings.otherSub}</p>
          </div>
        </div>
        <p className="mt-2 text-[12px] font-medium text-text-tertiary break-keep">{t.earnings.note[item.tradeType]}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
        {[
          [t.rows.asking, `${item.tradeType} ${formatPriceTenThousand(item.askingPriceManwon)}`],
          [t.rows.occupancy, occupancyLabel[item.occupancy]],
          [t.rows.floor, item.floorLabel],
          [t.rows.left, fill(SITE_CONTENT.brokerAgent.feed.hoursLeft, { h: item.hoursLeft })],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-medium text-text-tertiary">{k}</dt>
            <dd className="font-bold text-text-primary break-keep">{v}</dd>
          </div>
        ))}
      </dl>

      {/* 세입자 낀 매매: 갭 */}
      {gap !== null && item.details?.lease && (
        <div className="mt-3 p-4 rounded-xl bg-surface-subtle" data-testid="gap">
          <p className="text-[12px] font-medium text-text-tertiary">{t.gapTitle}</p>
          <p className="text-[17px] font-extrabold text-text-primary tabular-nums">{formatPriceTenThousand(gap)}</p>
          <p className="mt-1 text-[12px] font-medium text-text-secondary break-keep">{leasedSaleSummary(item.details.lease)}</p>
        </div>
      )}

      {/* 집 정보 미니칩 (방문 가능 시간은 집주인이 매칭 뒤에 정해서 여기 없음) */}
      {houseChips.length > 0 && (
        <section className="mt-4" data-testid="house-info">
          <h3 className="text-[13px] font-bold text-text-secondary">{t.houseTitle}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {houseChips.map((c) => (
              <span key={c} className="h-7 px-3 rounded-full bg-surface-subtle text-[12px] font-bold text-text-secondary inline-flex items-center">
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 보낼 강점 3칸 */}
      <section className="mt-5" data-testid="strength-slots">
        <h3 className="text-[15px] font-bold text-text-primary">{t.strengthsTitle}</h3>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{fill(t.strengthsSub, { max: MAX })}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: MAX }, (_, i) => picked[i]).map((chip, i) =>
            chip ? (
              <button
                key={chip}
                type="button"
                onClick={() => toggle(chip)}
                className="h-10 pl-4 pr-3 rounded-full bg-brand text-white text-[13px] font-bold flex items-center gap-1"
              >
                {chip}
                <X className="w-3.5 h-3.5" aria-label={t.removeChip} />
              </button>
            ) : (
              <span
                key={`empty-${i}`}
                className="h-10 px-4 rounded-full border border-dashed border-border-default text-[13px] font-bold text-text-tertiary flex items-center"
              >
                {t.slotEmpty}
              </span>
            ),
          )}
          {/* 후기 10개 전: 잠긴 칸 (내 사무소와 같은 모양) */}
          {MAX === BASE_STRENGTH_SLOTS && (
            <span className="h-10 px-4 rounded-full border border-dashed border-brand bg-brand-light text-[12px] font-bold text-brand-hover flex items-center gap-1" data-testid="strength-locked">
              <Lock className="w-3.5 h-3.5" aria-hidden />
              {fill(SITE_CONTENT.brokerAgent.office.strengthsLocked, { n: BONUS_SLOT_REVIEWS })}
            </span>
          )}
        </div>
        {full &&<p className="mt-2 text-[12px] font-medium text-text-tertiary break-keep">{fill(t.fullHint, { max: MAX })}</p>}
      </section>

      {/* 이 매물에 추천 */}
      <section className="mt-4">
        <h3 className="text-[13px] font-bold text-text-secondary">{t.recommendTitle}</h3>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="strength-recommended">
          {recommended.map((c) => (
            <button key={c} type="button" onClick={() => toggle(c)} disabled={full && !picked.includes(c)} aria-pressed={picked.includes(c)} className={chipClass(picked.includes(c))}>
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* 전체 보기: 분야별 접기 */}
      <section className="mt-4">
        <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
          <Pencil className="w-4 h-4 text-brand" aria-hidden />
          {t.allTitle}
        </h3>
        <p className="mt-1 text-[12px] font-medium text-text-tertiary break-keep">{t.allSub}</p>
        <div className="mt-1 divide-y divide-border-light">
          {groups.map((g) => (
            <details key={g.label} className="group">
              <summary className="h-11 flex items-center justify-between cursor-pointer list-none text-[15px] font-bold text-text-primary">
                {g.label}
                <ChevronDown className="w-5 h-5 text-text-tertiary group-open:rotate-180 transition-transform duration-fast ease-out-soft" aria-hidden />
              </summary>
              <div className="pb-3 flex flex-wrap gap-2">
                {g.chips.map((c) => (
                  <button key={c} type="button" onClick={() => toggle(c)} disabled={full && !picked.includes(c)} aria-pressed={picked.includes(c)} className={chipClass(picked.includes(c))}>
                    {c}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <ul className="mt-4 p-4 rounded-2xl bg-surface-subtle space-y-1">
        {t.notes.map((n) => (
          <li key={n} className="flex gap-2 text-[13px] font-medium text-text-secondary break-keep">
            <span aria-hidden>·</span>
            {n}
          </li>
        ))}
      </ul>

      {block && (
        <p className="mt-3 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="status" data-testid="send-block">
          {t.blocked[block]}
        </p>
      )}
    </ActionSheet>
  );
}
