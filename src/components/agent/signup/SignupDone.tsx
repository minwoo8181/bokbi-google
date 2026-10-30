'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import type { BrokerApplication } from '@/lib/broker/application';
import { primaryButton } from './SignupParts';

const t = SITE_CONTENT.brokerSignup;

/**
 * 다른 휴대폰·저장을 지운 경우 (A4, 대표님 2026-10-29 A안): 서버엔 코드 해시만 있어 원문을 다시 못 보여 줌 → 새 코드 받기.
 * 새로 받으면 예전 코드는 못 쓰고, 틀린 횟수는 그대로 (서버 reissue_signup_code)
 */
function CodeMissing({ onReissue }: { onReissue: () => Promise<boolean> }) {
  const d = t.done;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const press = async () => {
    setBusy(true);
    setFailed(!(await onReissue()));
    setBusy(false);
  };
  return (
    <div className="mt-2 space-y-2" data-testid="signup-code-missing">
      <p className="text-[15px] font-bold text-text-primary break-keep text-pretty">{d.codeMissingTitle}</p>
      <p className="text-[13px] font-medium text-text-secondary break-keep text-pretty">{d.codeMissingBody}</p>
      <button
        type="button"
        onClick={() => void press()}
        disabled={busy}
        data-testid="signup-code-reissue"
        className="mt-1 h-12 px-5 rounded-xl border border-border-default bg-surface-card text-[15px] font-bold text-text-primary disabled:opacity-50"
      >
        {d.codeReissue}
      </button>
      <p className="text-[12px] font-medium text-text-tertiary break-keep">{d.codeReissueNote}</p>
      {failed && (
        <p role="alert" className="text-[13px] font-bold text-[var(--status-risk-strong)] break-keep text-pretty">
          {d.codeReissueFailed}
        </p>
      )}
    </div>
  );
}

/** 가입 신청 뒤 화면: 확인 대기(확인 코드) · 승인 · 반려. onReissue: Supabase일 때만 (코드가 이 휴대폰에 없으면 새 코드 받기) */
export default function SignupDone({ app, onRetry, onReissue }: { app: BrokerApplication; onRetry: () => void; onReissue?: () => Promise<boolean> }) {
  const d = t.done;
  return (
    <section className="space-y-5" data-testid="signup-done" data-status={app.status}>
      <h1 className="text-[20px] font-bold text-text-primary">
        {app.status === 'APPROVED' ? d.approvedTitle : app.status === 'REJECTED' ? d.rejectedTitle : d.title}
      </h1>

      {app.status === 'PENDING' && (
        <>
          <div className="p-5 rounded-2xl bg-surface-card text-center">
            <p className="text-[13px] font-bold text-text-secondary">{d.codeLabel}</p>
            {app.code || !onReissue ? (
              <p className="mt-1 text-[40px] font-bold tracking-[0.3em] text-brand tabular-nums" data-testid="signup-confirm-code">
                {app.code}
              </p>
            ) : (
              <CodeMissing onReissue={onReissue} />
            )}
            <p className="mt-3 text-[15px] font-bold text-text-primary break-keep text-pretty">{d.callNotice}</p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep whitespace-pre-line text-pretty">{d.callHow}</p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep text-pretty">{t.auditNotice}</p>
          </div>
          <p className="text-[13px] font-medium text-text-secondary break-keep whitespace-pre-line text-pretty">{d.approvedNotice}</p>
        </>
      )}

      {app.status === 'APPROVED' && (
        <p className="flex items-start gap-2 text-[15px] font-bold text-status-good break-keep text-pretty">
          <Check className="w-5 h-5 flex-shrink-0" aria-hidden />
          {d.approvedSub}
        </p>
      )}

      {app.status === 'REJECTED' && app.rejectReason && (
        <p className="text-[15px] font-medium text-[var(--status-risk-strong)] break-keep text-pretty">{fill(d.rejectedReason, { reason: app.rejectReason })}</p>
      )}

      <dl className="p-4 rounded-2xl bg-surface-card">
        <div className="flex justify-between gap-3">
          <dt className="text-[13px] font-medium text-text-tertiary flex-shrink-0">{d.office}</dt>
          <dd className="text-[13px] font-bold text-text-primary text-right break-keep text-pretty">{app.office}</dd>
        </div>
      </dl>

      {app.status === 'PENDING' && <p className="text-[13px] font-medium text-text-tertiary break-keep text-pretty">{d.revisit}</p>}

      {app.status === 'REJECTED' && (
        <button type="button" onClick={onRetry} className={primaryButton}>
          {d.retry}
        </button>
      )}

      {app.status === 'APPROVED' && (
        <Link href="/agent" className={`${primaryButton} flex items-center justify-center`}>
          {d.goFeed}
        </Link>
      )}

      <Link href="/" className="w-full h-14 rounded-xl bg-surface-card text-text-primary text-[17px] font-bold flex items-center justify-center">
        {d.home}
      </Link>
    </section>
  );
}
