'use client';

import React, { useState } from 'react';
import { Check, MessageSquare, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { formatPriceTenThousand, formatWon } from '@/lib/utils';
import type { AgreedFee } from '@/lib/deal/dealFee';
import { checkPriceChange, priceChangePlan } from '@/lib/deal/priceChange';
import type { BrokerOffer } from '@/lib/requests/types';
import ActionSheet from './ActionSheet';
import { fill } from './format';

const t = SITE_CONTENT.myRequests.inProgress.priceSheet;
const step2 = SITE_CONTENT.matchingModal.step2;
const STEPS = [
  [-5000, step2.stepperMinus5000],
  [-1000, step2.stepperMinus1000],
  [1000, step2.stepperPlus1000],
  [5000, step2.stepperPlus5000],
] as const;

const tel = (phone: string) => phone.replace(/[^\d+]/g, '');

interface PriceChangeSheetProps {
  open: boolean;
  /** 처음 열 화면: 바꾸기 / (안 알린 곳이 있을 때) 알리기 */
  mode: 'EDIT' | 'NOTIFY';
  agreed: AgreedFee;
  matched: BrokerOffer[];
  /** 아직 알리지 않은 곳 (priceChange.pendingPriceNotices) */
  pending: { offerId: string; priceManwon: number }[];
  onChange: (priceManwon: number) => Promise<boolean>;
  onNotify: (offerId: string, priceManwon: number) => void;
  onClose: () => void;
}

/**
 * 매칭 뒤 희망가 바꾸기 (대표님 시안 2026-10-27):
 * ① 새 희망가 → 복비를 합의 할인 그대로 바로 다시 계산 ② 부동산마다 전화·문자 + "알렸어요" 체크 (안 알린 곳은 지금 확인할 일에 빨강)
 * 문자는 집주인 휴대폰 문자 앱을 미리 채운 문구로 연다 (자동 발송은 유료 문자 서비스를 켜는 배포 직전에)
 */
export default function PriceChangeSheet({ open, mode, agreed, matched, pending, onChange, onNotify, onClose }: PriceChangeSheetProps) {
  const [price, setPrice] = useState<number | null>(agreed.askingPriceManwon);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notifying, setNotifying] = useState(mode === 'NOTIFY');
  const reject = checkPriceChange(price, agreed.askingPriceManwon);
  const plan = price !== null && !reject ? priceChangePlan(agreed, price) : null;

  const close = () => {
    setPrice(agreed.askingPriceManwon);
    setFailed(false);
    setNotifying(false);
    onClose();
  };

  if (notifying || mode === 'NOTIFY') {
    // 알리기: 지금 희망가 기준 문구 (바꾼 직후면 새 값이 agreed로 들어와 있음)
    const pct = priceChangePlan(agreed, agreed.askingPriceManwon).discountPct;
    const body = fill(t.smsBody, { price: formatPriceTenThousand(agreed.askingPriceManwon), pct, fee: formatWon(agreed.commissionWon) });
    const left = new Set(pending.map((p) => p.offerId));
    return (
      <ActionSheet
        open={open}
        testId="price-notify-sheet"
        title={fill(t.notifyTitle, { n: matched.length })}
        confirmLabel={left.size === 0 ? t.finish : undefined}
        onConfirm={close}
        cancelLabel={left.size === 0 ? t.cancel : t.later}
        onCancel={close}
      >
        <p className="text-[13px] font-medium text-text-secondary break-keep">{t.notifySub}</p>
        <ul className="mt-3 divide-y divide-border-light">
          {matched.map((o) => {
            const done = !left.has(o.id);
            return (
              <li key={o.id} className="py-3" data-testid={`price-notify-${o.order}`}>
                <p className="text-[15px] font-bold text-text-primary break-keep">{o.disclosure.officeName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <a href={`tel:${tel(o.disclosure.phone)}`} className="h-10 px-3 rounded-xl border border-border-default text-[13px] font-bold text-text-primary inline-flex items-center gap-1">
                    <Phone className="w-4 h-4" aria-hidden />
                    {t.call}
                  </a>
                  <a
                    href={`sms:${tel(o.disclosure.phone)}?&body=${encodeURIComponent(body)}`}
                    className="h-10 px-3 rounded-xl border border-border-default text-[13px] font-bold text-text-primary inline-flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" aria-hidden />
                    {t.sms}
                  </a>
                  <button
                    type="button"
                    disabled={done}
                    aria-pressed={done}
                    onClick={() => onNotify(o.id, agreed.askingPriceManwon)}
                    data-testid={`price-notified-${o.order}`}
                    className={`ml-auto h-10 px-3 rounded-xl text-[13px] font-bold inline-flex items-center gap-1 ${
                      done ? 'bg-status-good-light text-[var(--status-good-strong)]' : 'bg-surface-subtle text-text-secondary'
                    }`}
                  >
                    {done && <Check className="w-4 h-4" strokeWidth={3} aria-hidden />}
                    {t.done}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </ActionSheet>
    );
  }

  return (
    <ActionSheet
      open={open}
      testId="price-sheet"
      title={t.title}
      confirmLabel={t.next}
      confirmDisabled={!plan || saving}
      cancelLabel={t.cancel}
      onCancel={close}
      onConfirm={() => {
        if (!plan) return;
        setSaving(true);
        setFailed(false);
        void onChange(plan.priceManwon).then((ok) => {
          setSaving(false);
          if (ok) setNotifying(true);
          else setFailed(true);
        });
      }}
    >
      <p className="text-[13px] font-medium text-text-tertiary tabular-nums">{fill(t.current, { price: formatPriceTenThousand(agreed.askingPriceManwon) })}</p>
      <div className="mt-2 flex items-center gap-2 h-13 px-4 rounded-xl bg-surface-subtle focus-within:ring-2 focus-within:ring-brand">
        <input
          inputMode="numeric"
          aria-label={t.row}
          data-testid="price-input"
          value={price === null ? '' : price.toLocaleString('ko-KR')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 7);
            setPrice(digits ? Number(digits) : null);
          }}
          className="min-w-0 flex-1 bg-transparent text-[17px] font-bold text-text-primary tabular-nums outline-none"
        />
        <span className="shrink-0 text-[15px] font-bold text-text-tertiary">{t.unit}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {STEPS.map(([d, label]) => (
          <button
            key={d}
            type="button"
            onClick={() => setPrice((p) => Math.max(1000, (p ?? agreed.askingPriceManwon) + d))}
            className="h-10 rounded-lg border border-border-default text-[12px] font-bold text-text-secondary active:scale-95 transition-transform"
          >
            {label}
          </button>
        ))}
      </div>
      {reject && reject !== 'SAME' && price !== null ? (
        <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)] break-keep" role="alert">
          {t.errors[reject]}
        </p>
      ) : plan ? (
        <div className="mt-3 p-3 rounded-xl bg-surface-subtle" data-testid="price-preview">
          <p className="text-[13px] font-medium text-text-secondary">{fill(t.feeLine, { pct: plan.discountPct })}</p>
          <p className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-bold text-text-secondary">{t.feeLabel}</span>
            <span className="text-[15px] font-bold tabular-nums">
              <span className="text-text-tertiary line-through mr-2">{formatWon(agreed.commissionWon)}</span>
              <span className="text-brand">{formatWon(plan.feeWon)}</span>
            </span>
          </p>
        </div>
      ) : null}
      {failed && (
        <p className="mt-2 text-[13px] font-bold text-[var(--status-risk-strong)]" role="alert">
          {t.failed}
        </p>
      )}
    </ActionSheet>
  );
}
