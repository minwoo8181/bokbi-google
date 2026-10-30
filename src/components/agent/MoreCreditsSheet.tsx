'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { MORE_CREDITS_ANSWERS, type MoreCreditsAnswer } from '@/lib/broker/credits';
import ActionSheet from '@/components/my-requests/ActionSheet';

const t = SITE_CONTENT.brokerAgent.moreCredits;

/** "크레딧 더 받기" 페이크 도어: 한 문항 투표만 받고 크레딧은 주지 않는다. 결과는 화면에 보여 주지 않는다 (가짜 숫자 금지) */
export default function MoreCreditsSheet({ onSubmit, onClose }: { onSubmit: (a: MoreCreditsAnswer) => void; onClose: () => void }) {
  const [answer, setAnswer] = useState<MoreCreditsAnswer | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <ActionSheet open testId="more-credits-thanks" title={t.thanks} cancelLabel={t.close} onCancel={onClose} />;
  }

  return (
    <ActionSheet
      open
      testId="more-credits-sheet"
      title={t.title}
      confirmLabel={t.submit}
      cancelLabel={t.close}
      confirmDisabled={answer === null}
      onConfirm={() => {
        if (!answer) return;
        onSubmit(answer);
        setDone(true);
      }}
      onCancel={onClose}
    >
      <p className="text-[15px] font-medium text-text-secondary break-keep">{t.sub}</p>
      <div className="mt-4 space-y-2" role="radiogroup">
        {MORE_CREDITS_ANSWERS.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={answer === a}
            onClick={() => setAnswer(a)}
            className={`w-full h-13 px-4 rounded-xl text-left text-[15px] font-bold transition-colors ${
              answer === a ? 'bg-brand-light text-brand-hover ring-2 ring-brand' : 'bg-surface-subtle text-text-primary'
            }`}
          >
            {t.options[a]}
          </button>
        ))}
      </div>
    </ActionSheet>
  );
}
