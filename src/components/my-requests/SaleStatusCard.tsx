'use client';

import React, { useState } from 'react';
import { ChevronRight, Phone } from 'lucide-react';
import { formatPriceTenThousand } from '@/lib/utils';
import { SITE_CONTENT } from '@/config/siteContent';
import type { BrokerOffer } from '@/lib/requests/types';
import { checkDealPrice, type AgreedFee } from '@/lib/deal/dealFee';
import DealPriceField from '@/components/common/DealPriceField';
import ActionSheet, { ChoiceChips } from './ActionSheet';
import { fill } from './format';
import Switch from './Switch';
import type { LostReason } from '@/lib/analytics/events';

type SaleAction = 'PAUSE' | 'WITHDRAW';

/** 이유 칩 코드 (siteContent saleSheet.pauseReasons·withdrawReasons와 같은 순서, 행동 기록 sale_change reasonChip) */
const PAUSE_CODES = ['MOVE_DATE', 'RETHINK_PRICE', 'REST', 'OTHER'] as const;
const WITHDRAW_CODES = ['NOT_SELLING', 'ELSEWHERE', 'PRICE', 'OTHER'] as const;
const LOST_KEYS = Object.keys(SITE_CONTENT.myRequests.inProgress.saleSheet.lostReasons) as LostReason[];

interface SaleStatusCardProps {
  paused: boolean;
  /** 7일 보호 중이면 잠금 날짜('11월 1일'), 아니면 null */
  lockedUntilLabel: string | null;
  matched: BrokerOffer[];
  onPause: (reason: string) => void;
  onResume: () => void;
  onWithdraw: (reason: string) => void;
  /** offerId 또는 'ELSEWHERE'. 중개사를 고르면 가계약/계약 + 실제 거래금액(만 원) */
  onReportContract: (target: string, step: 'PROVISIONAL' | 'CONTRACT', priceManwon?: number) => void;
  /** 합의 복비 (거래금액이 바뀌면 다시 계산하는 기준) */
  agreed: AgreedFee;
  /** 그 중개사와 이미 확정된 거래금액 (가계약 때 확인한 금액, 없으면 null → 희망가를 먼저 채움) */
  confirmedPrice?: (offerId: string) => number | null;
  /** 중개사를 골랐을 때 확인 창에 보여 줄 결과 줄 */
  contractLines?: (offerId: string, step: 'PROVISIONAL' | 'CONTRACT') => string[];
  /** 그 중개사와 가계약 단계면 "가계약했어요"는 숨김 */
  canDeclareProvisional?: (offerId: string) => boolean;
  /** 멈추기 창에서 중개사 전화를 누름 (기록용) */
  onCallBroker?: (offerId: string) => void;
  /** 멈추거나 거둬들이면 취소될 앞으로 잡힌 방문 수 (deal.pauseCancelVisitIds) */
  visitsToCancel?: number;
  /** 중개사가 알린 보고를 아직 확인 안 했으면: 판매 상태·계약 알리기를 누를 때 그 확인으로 보낸다 (막지 않고 순서만) */
  confirmFirst?: () => void;
  /** 희망가 줄을 누름 (매칭 뒤 희망가 바꾸기 창). 없으면 줄을 숨김 */
  onEditPrice?: () => void;
  /** 행동 기록 (sale_change): 이유 칩 코드 + 다른 곳 계약이면 아쉬웠던 점 */
  onSaleLog?: (action: 'PAUSE' | 'WITHDRAW' | 'SOLD_ELSEWHERE', reasonChip?: string, lost?: LostReason) => void;
}

/** 다른 곳 계약 때 "어떤 점이 아쉬웠나요?" (건너뛰어도 됨, 부동산에는 안 보임) */
function LostReasonChips({ value, onChange }: { value: LostReason | null; onChange: (v: LostReason | null) => void }) {
  const s = SITE_CONTENT.myRequests.inProgress.saleSheet;
  return (
    <div className="mt-4 p-4 rounded-xl border border-border-default" data-testid="lost-reasons">
      <p className="text-[15px] font-bold text-text-primary">{s.lostTitle}</p>
      <p className="mt-1 mb-3 text-[13px] font-medium text-text-tertiary break-keep">{s.lostSub}</p>
      <ChoiceChips
        options={LOST_KEYS.map((k) => s.lostReasons[k])}
        value={value ? s.lostReasons[value] : null}
        onChange={(label) => onChange(LOST_KEYS.find((k) => s.lostReasons[k] === label) ?? null)}
      />
    </div>
  );
}

/**
 * 판매 상태 (확정 후 7일 뒤부터 바꿀 수 있음) + 가계약·계약 알리기.
 * 끄면 "잠시 멈추기 / 매물 거둬들이기" 중 고르고 이유를 버튼으로 한 번 고른다. 맨 위엔 멈추기 전 중개사 상담 (2026-10-26).
 * 알림은 보호 기간과 상관없이 언제든. 플랫폼이 네이버 광고를 내리진 못한다 (다른 곳 계약이면 직접 알려 달라고 안내)
 */
export default function SaleStatusCard({
  paused,
  lockedUntilLabel,
  matched,
  onPause,
  onResume,
  onWithdraw,
  onReportContract,
  contractLines,
  canDeclareProvisional,
  onCallBroker,
  agreed,
  confirmedPrice,
  visitsToCancel = 0,
  confirmFirst,
  onEditPrice,
  onSaleLog,
}: SaleStatusCardProps) {
  const t = SITE_CONTENT.myRequests.inProgress;
  const s = t.saleSheet;
  const [saleOpen, setSaleOpen] = useState(false);
  const [action, setAction] = useState<SaleAction>('PAUSE');
  const [reason, setReason] = useState<string | null>(null);
  const [lost, setLost] = useState<LostReason | null>(null);
  const soldElsewhere = action === 'WITHDRAW' && reason === s.withdrawReasons[WITHDRAW_CODES.indexOf('ELSEWHERE')];
  const [contractOpen, setContractOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [step, setStep] = useState<'PROVISIONAL' | 'CONTRACT'>('CONTRACT');
  const brokerTarget = target && target !== 'ELSEWHERE' ? target : null;
  const provisionalOk = brokerTarget ? canDeclareProvisional?.(brokerTarget) ?? true : false;
  const chosenStep = provisionalOk ? step : 'CONTRACT';
  /** 중개사를 골랐을 때 실제 거래금액 (만 원, 처음엔 희망가) */
  const [price, setPrice] = useState<number | null>(agreed.askingPriceManwon);
  const priceReject = brokerTarget ? checkDealPrice(price, agreed.askingPriceManwon) : null;

  const locked = lockedUntilLabel !== null;
  const closeSale = () => {
    setSaleOpen(false);
    setReason(null);
    setLost(null);
    setAction('PAUSE');
  };

  return (
    // "우리 집 판매 설정" 섹션 (2026-10-27): 희망가 → 판매 상태 → 계약 알리기
    <section className="space-y-2" data-testid="sale-status">
      <h2 className="pt-3 px-1 text-[17px] font-bold text-text-primary">{t.saleSectionTitle}</h2>
      <div className="p-5 rounded-2xl bg-surface-card space-y-4">
      {onEditPrice && (
        <button
          type="button"
          onClick={onEditPrice}
          data-testid="price-row"
          className="w-full min-h-11 pb-4 border-b border-border-light flex items-center justify-between gap-3 text-left"
        >
          <span className="text-[13px] font-bold text-text-tertiary">{t.priceSheet.row}</span>
          <span className="inline-flex items-center gap-2 text-[15px] font-bold text-text-primary tabular-nums">
            {formatPriceTenThousand(agreed.askingPriceManwon)}
            <span className="text-[13px] font-bold text-brand">{t.priceSheet.rowEdit}</span>
            <ChevronRight className="w-4 h-4 text-text-tertiary" aria-hidden />
          </span>
        </button>
      )}
      <div>
        <h3 className="text-[13px] font-bold text-text-tertiary">{t.saleTitle}</h3>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-2 h-8 px-3 rounded-full text-[15px] font-bold ${
              paused ? 'bg-surface-subtle text-text-secondary' : 'bg-status-good-light text-[var(--status-good-strong)]'
            }`}
            data-testid="sale-pill"
          >
            <span className={`w-2 h-2 rounded-full ${paused ? 'bg-text-tertiary' : 'bg-status-good'}`} aria-hidden />
            {paused ? t.salePaused : t.saleOn}
          </span>
          <Switch
            checked={!paused}
            disabled={locked}
            label={t.saleOn}
            testId="sale-switch"
            onChange={() => (confirmFirst ? confirmFirst() : paused ? onResume() : setSaleOpen(true))}
          />
        </div>
        {locked && (
          <p className="mt-1 text-[13px] font-medium text-text-tertiary" data-testid="sale-locked">
            {fill(t.saleLocked, { date: lockedUntilLabel })}
          </p>
        )}
        {confirmFirst && (
          <p className="mt-1 text-[13px] font-bold text-brand break-keep" data-testid="sale-confirm-first">
            {SITE_CONTENT.myRequests.todo.confirmFirst}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => (confirmFirst ? confirmFirst() : setContractOpen(true))}
        data-testid="contract-report"
        className="w-full h-13 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold"
      >
        {t.contractButton}
      </button>
      </div>

      <ActionSheet
        open={saleOpen}
        testId="sale-sheet"
        title={s.title}
        tone={action === 'WITHDRAW' ? 'risk' : 'brand'}
        confirmLabel={action === 'PAUSE' ? s.confirmPause : s.confirmWithdraw}
        confirmDisabled={reason === null}
        cancelLabel={s.cancel}
        onCancel={closeSale}
        onConfirm={() => {
          if (!reason) return;
          const codes = action === 'PAUSE' ? PAUSE_CODES : WITHDRAW_CODES;
          const code = codes[((action === 'PAUSE' ? s.pauseReasons : s.withdrawReasons) as readonly string[]).indexOf(reason)];
          if (action === 'PAUSE') {
            onPause(reason);
            onSaleLog?.('PAUSE', code);
          } else if (soldElsewhere) {
            // 팔렸으면 거둬들임이 아니라 다른 곳 계약으로 끝낸다 (계약 알리기 "다른 곳에서 계약했어요"와 같은 결과)
            onReportContract('ELSEWHERE', 'CONTRACT');
            onSaleLog?.('SOLD_ELSEWHERE', code, lost ?? undefined);
          } else {
            onWithdraw(reason);
            onSaleLog?.('WITHDRAW', code);
          }
          closeSale();
        }}
      >
        {/* 멈추기 전에 상담: 누르면 전화 + 기록 (멈추기 대비 상담 비율이 지표) */}
        {matched.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-brand-light" data-testid="sale-call">
            <p className="text-[15px] font-bold text-text-primary break-keep">{s.callTitle}</p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep">{s.callSub}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {matched
                .filter((o) => o.disclosure.phone)
                .map((o) => (
                  <a
                    key={o.id}
                    href={`tel:${o.disclosure.phone.replace(/[^\d+]/g, '')}`}
                    onClick={() => onCallBroker?.(o.id)}
                    className="h-11 px-4 rounded-xl bg-surface-card text-brand text-[13px] font-bold inline-flex items-center gap-1 active:scale-96 transition-transform duration-fast ease-out-soft"
                  >
                    <Phone className="w-4 h-4" aria-hidden />
                    {fill(s.call, { office: o.disclosure.officeName })}
                  </a>
                ))}
            </div>
          </div>
        )}
        {/* 두 카드 나란히: 차이를 한눈에 (2026-10-27 대표님). 마지막 줄 = 가장 큰 차이 */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" data-testid="sale-compare">
          {(['PAUSE', 'WITHDRAW'] as SaleAction[]).map((a) => {
            const lines = s.compare[a];
            const on = action === a;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                data-testid={`sale-option-${a}`}
                onClick={() => {
                  setAction(a);
                  setReason(null);
                  setLost(null);
                }}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${on ? 'border-brand bg-brand-light' : 'border-border-default'}`}
              >
                <span className="block text-[15px] font-bold text-text-primary">{a === 'PAUSE' ? s.pause : s.withdraw}</span>
                <ul className="mt-2 space-y-1">
                  {lines.map((l, i) => (
                    <li
                      key={l}
                      className={`text-[13px] leading-snug break-keep ${
                        i === lines.length - 1 ? `font-bold ${a === 'PAUSE' ? 'text-brand' : 'text-[var(--status-risk-strong)]'}` : 'font-medium text-text-secondary'
                      }`}
                    >
                      {l}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <p className="mt-4 mb-2 text-[13px] font-bold text-text-secondary">{s.reasonTitle}</p>
        <ChoiceChips options={action === 'PAUSE' ? s.pauseReasons : s.withdrawReasons} value={reason} onChange={setReason} />
        {/* 거둬들이기 이유 "다른 곳에서 계약했어요" → 다른 곳 계약으로 끝내고 아쉬웠던 점 한 칸 */}
        {soldElsewhere && <LostReasonChips value={lost} onChange={setLost} />}
        {/* 멈추기·거둬들이기 모두 앞으로 잡힌 방문은 취소된다 → 누르기 전에 알린다 */}
        {visitsToCancel > 0 && (
          <p className="mt-4 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" data-testid="sale-visits-canceled">
            {fill(s.visitsCanceled, { n: visitsToCancel })}
          </p>
        )}
      </ActionSheet>

      <ActionSheet
        open={contractOpen}
        testId="contract-sheet"
        title={t.contractSheet.title}
        confirmLabel={t.contractSheet.confirm}
        confirmDisabled={target === null || priceReject !== null}
        cancelLabel={t.contractSheet.cancel}
        onCancel={() => {
          setContractOpen(false);
          setTarget(null);
          setLost(null);
        }}
        onConfirm={() => {
          if (!target || priceReject) return;
          onReportContract(target, chosenStep, brokerTarget && price !== null ? price : undefined);
          if (target === 'ELSEWHERE') onSaleLog?.('SOLD_ELSEWHERE', undefined, lost ?? undefined);
          setContractOpen(false);
          setTarget(null);
          setLost(null);
          setStep('CONTRACT');
        }}
      >
        <div className="space-y-2" role="radiogroup">
          {[...matched.map((o) => ({ id: o.id, label: o.disclosure.officeName })), { id: 'ELSEWHERE', label: t.contractSheet.elsewhere }].map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={target === o.id}
              onClick={() => {
                setTarget(o.id);
                if (o.id !== 'ELSEWHERE') setPrice(confirmedPrice?.(o.id) ?? agreed.askingPriceManwon);
              }}
              className={`w-full h-13 px-4 rounded-xl border-2 text-left text-[15px] font-bold transition-colors ${
                target === o.id ? 'border-brand bg-brand-light text-text-primary' : 'border-border-default text-text-secondary'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* 다른 곳에서 계약 → 아쉬웠던 점 한 칸 (거둬들이기 창과 같은 칩) */}
        {target === 'ELSEWHERE' && <LostReasonChips value={lost} onChange={setLost} />}
        {/* 중개사를 고르면 가계약/계약 (가계약 단계 뒤면 계약만) */}
        {brokerTarget && provisionalOk && (
          <div className="mt-4" data-testid="contract-step">
            <p className="mb-2 text-[13px] font-bold text-text-secondary">{t.contractSheet.stepTitle}</p>
            <ChoiceChips
              options={[t.contractSheet.steps.PROVISIONAL, t.contractSheet.steps.CONTRACT]}
              value={t.contractSheet.steps[step]}
              onChange={(v) => setStep(v === t.contractSheet.steps.PROVISIONAL ? 'PROVISIONAL' : 'CONTRACT')}
            />
          </div>
        )}
        {/* 중개사를 고르면 실제 거래금액 → 합의 비율로 다시 계산한 복비 */}
        {brokerTarget && <DealPriceField agreed={agreed} value={price} onChange={setPrice} />}
        {/* 중개사를 고르면 거래 기록이 확정되며 생기는 일 (deal.ts consequences DECLARE), 아니면 기존 안내 */}
        {brokerTarget && contractLines ? (
          <ul className="mt-3 space-y-1" data-testid="contract-consequences">
            {contractLines(brokerTarget, chosenStep).map((l) => (
              <li key={l} className="flex gap-2 text-[13px] font-medium text-text-secondary break-keep">
                <span aria-hidden className="text-text-tertiary">·</span>
                {l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] font-medium text-text-tertiary">{t.contractSheet.notice}</p>
        )}
      </ActionSheet>
    </section>
  );
}
