'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronRight, Home, Lock } from 'lucide-react';
import PromiseLevel from '@/components/common/PromiseLevel';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import { PROMISE_TIER_MIN } from '@/lib/requests/stage';
import ActionSheet from '@/components/my-requests/ActionSheet';
import FeeRuleExamples from '@/components/common/FeeRuleExamples';
import { StepTitle, primaryButton } from './SignupParts';

const t = SITE_CONTENT.brokerSignup;

/**
 * 가입 3단계 "약속" (A안, 대표님 2026-10-28): 지켜드리는 것 2개 → 약속 4개 체크 → 신청.
 * 거래금액이 바뀔 때 예시 표는 첫 약속의 "예시 보기" 시트로 (화면 길이 절반). 명의 경고는 빨강 대신 회색 한 줄
 */
export default function PromiseStep({
  promises,
  onToggle,
  onSubmit,
}: {
  promises: boolean[];
  onToggle: (i: number) => void;
  onSubmit: () => void;
}) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const all = promises.every(Boolean);

  return (
    <section className="space-y-5" data-testid="signup-promise">
      <StepTitle title={t.promise.title} sub={t.promise.sub} />

      {/* 복비가 지켜드려요: 블라인드·직접 맡긴 매물 (주고받는 구조라 약속보다 먼저) */}
      <div className="p-4 rounded-2xl bg-surface-card space-y-3" data-testid="promise-protect">
        <p className="text-[13px] font-bold text-brand">{t.promise.protectTitle}</p>
        {t.promise.protectItems.map((p, i) => (
          <div key={p.title} className="flex items-start gap-3">
            {i === 0 ? <Lock className="w-5 h-5 mt-1 text-brand flex-shrink-0" aria-hidden /> : <Home className="w-5 h-5 mt-1 text-brand flex-shrink-0" aria-hidden />}
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-text-primary break-keep text-balance">{p.title}</p>
              <p className="mt-1 text-[13px] font-medium leading-relaxed text-text-secondary break-keep whitespace-pre-line text-pretty">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[13px] font-bold text-text-secondary">{t.promise.keepTitle}</p>
        <ul className="mt-2 rounded-2xl bg-surface-card px-2 divide-y divide-border-default" data-testid="promise-keep">
          {t.promise.items.map((p, i) => (
            <li key={p.title} className="py-1">
              <button
                type="button"
                aria-pressed={promises[i]}
                onClick={() => onToggle(i)}
                className="w-full min-h-[52px] px-2 py-3 flex items-start gap-3 text-left"
              >
                <span
                  className={`w-6 h-6 mt-1 rounded-full flex items-center justify-center flex-shrink-0 ${promises[i] ? 'bg-brand text-white' : 'bg-surface-subtle text-text-tertiary'}`}
                  aria-hidden
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-text-primary break-keep text-balance">{p.title}</span>
                  <span className="mt-1 block text-[13px] font-medium leading-relaxed text-text-secondary break-keep whitespace-pre-line text-pretty">{p.desc}</span>
                </span>
              </button>
              {i === 0 && (
                <button
                  type="button"
                  onClick={() => setExamplesOpen(true)}
                  data-testid="promise-fee-examples"
                  className="ml-11 -mt-1 mb-1 min-h-[44px] inline-flex items-center gap-1 text-[13px] font-bold text-brand"
                >
                  {t.promise.feeExamplesLink}
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              )}
              {i === 2 && (
                <span className="ml-11 mb-3 flex flex-wrap items-center gap-2 text-[13px] font-bold text-brand" data-testid="promise-tiers">
                  <span className="text-text-tertiary font-medium">{t.promise.tierPreview}</span>
                  {PROMISE_TIER_MIN.map((min, n) => (
                    <PromiseLevel key={min} level={(n + 2) as 2 | 3 | 4} suffix={fill(t.promise.tierStep, { count: min })} />
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!all && <p className="text-[13px] font-medium text-text-tertiary">{t.promise.required}</p>}
      <p className="flex items-start gap-2 text-[13px] font-medium leading-snug text-text-tertiary break-keep whitespace-pre-line text-pretty">
        <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0" aria-hidden />
        {t.promise.warning}
      </p>
      <button type="button" disabled={!all} onClick={onSubmit} data-testid="signup-submit" className={primaryButton}>
        {t.promise.submit}
      </button>

      <ActionSheet
        open={examplesOpen}
        testId="promise-fee-sheet"
        title={t.promise.feeExamplesTitle}
        cancelLabel={SITE_CONTENT.common.close}
        onCancel={() => setExamplesOpen(false)}
      >
        <FeeRuleExamples />
      </ActionSheet>
    </section>
  );
}
