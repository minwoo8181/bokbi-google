'use client';

/** 내 의뢰 확인 창 모음: 매칭 확정 · 요청 취소 · 매칭 해제 · 확정 순간 축하 화면 */
import React from 'react';
import { Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import StatusPill from '@/components/common/StatusPill';
import type { BrokerOffer } from '@/lib/requests/types';
import ActionSheet from './ActionSheet';
import { fill } from './format';

const t = SITE_CONTENT.myRequests;

export function ConfirmMatchSheet({
  open,
  count,
  feeLabel,
  discountPct,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  count: number;
  feeLabel: string;
  /** 법정 상한 대비 할인율 (dealFee.discountPct). 모르면 금액만 */
  discountPct: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const lines = [...t.confirmSheet.lines, discountPct !== null ? t.confirmSheet.feeLine : t.confirmSheet.feeLineNoPct];
  return (
    <ActionSheet
      open={open}
      testId="confirm-sheet"
      title={fill(t.confirmSheet.title, { count })}
      confirmLabel={t.confirmSheet.confirm}
      cancelLabel={t.confirmSheet.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l} className="flex gap-2 text-[15px] font-medium text-text-secondary break-keep">
            <span aria-hidden>·</span>
            {fill(l, { fee: feeLabel, pct: discountPct ?? '' })}
          </li>
        ))}
      </ul>
    </ActionSheet>
  );
}

export function CancelRequestSheet({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ActionSheet
      open={open}
      testId="cancel-sheet"
      tone="risk"
      title={t.cancelSheet.title}
      confirmLabel={t.cancelSheet.confirm}
      cancelLabel={t.cancelSheet.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p className="text-[15px] font-medium text-text-secondary break-keep">{t.cancelSheet.body}</p>
    </ActionSheet>
  );
}

/** 매칭 해제 확인: 해제 전에 전화로 사정을 물어볼 수 있게 "전화해 보기"를 왼쪽에, 중개사가 남긴 늦어진 이유도 함께 (2026-10-27) */
export function ReleaseSheet({ target, onConfirm, onCancel }: { target: BrokerOffer | null; onConfirm: () => void; onCancel: () => void }) {
  const s = t.inProgress.releaseSheet;
  const delay = target?.delayNote ? fill(t.inProgress.delayNote, { reason: SITE_CONTENT.brokerAgent.listing.delay.reasons[target.delayNote.reason] }) : null;
  return (
    <ActionSheet
      open={target !== null}
      testId="release-sheet"
      tone="risk"
      title={s.title}
      confirmLabel={s.confirm}
      cancelLabel={s.cancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      secondary={target?.disclosure.phone ? { label: s.call, href: `tel:${target.disclosure.phone}`, icon: <Phone className="w-4 h-4" aria-hidden /> } : undefined}
    >
      <p className="text-[15px] font-bold text-text-primary">{target?.disclosure.officeName}</p>
      <p className="mt-1 text-[15px] font-medium text-text-secondary break-keep whitespace-pre-line">{s.body}</p>
      {delay && (
        <p className="mt-2" data-testid="release-delay-note">
          <StatusPill tone="WAIT">{delay}</StatusPill>
        </p>
      )}
      {target?.disclosure.phone && <p className="mt-3 text-[13px] font-medium text-text-tertiary break-keep">{s.callHint}</p>}
    </ActionSheet>
  );
}

/** 매칭 확정 순간: 한 번만 */
export function Celebration({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-surface-card flex flex-col" role="dialog" aria-modal="true" data-testid="celebration">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-status-good-light text-[var(--status-good-strong)] flex items-center justify-center text-[26px]" aria-hidden>
          ✓
        </div>
        <h2 className="mt-5 text-[26px] font-extrabold text-text-primary tracking-tight whitespace-pre-line">{fill(t.celebration.title, { count })}</h2>
        <p className="mt-3 text-[15px] font-medium text-text-secondary break-keep whitespace-pre-line">{t.celebration.body}</p>
      </div>
      <div className="max-w-md w-full mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} data-testid="celebration-close" className="w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold">
          {t.celebration.button}
        </button>
      </div>
    </div>
  );
}
