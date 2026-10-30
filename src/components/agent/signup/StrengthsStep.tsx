'use client';

import React from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import { StepTitle, primaryButton } from './SignupParts';

const t = SITE_CONTENT.brokerSignup;
const chipClass = (on: boolean) =>
  `h-11 px-4 rounded-full text-[13px] font-bold transition-colors ${
    on ? 'bg-brand text-white' : 'bg-surface-card text-text-secondary border border-border-default disabled:text-text-disabled'
  }`;

/** 가입 2단계: 잘하는 점(최대 3) + 가능한 것(제한 없음) */
export default function StrengthsStep({
  strengths,
  onStrengths,
  conditions,
  onConditions,
  onNext,
}: {
  strengths: string[];
  onStrengths: (v: string[]) => void;
  conditions: string[];
  onConditions: (v: string[]) => void;
  onNext: () => void;
}) {
  const max = SITE_CONTENT.brokerStrengths.max;
  const toggle = (s: string) =>
    onStrengths(strengths.includes(s) ? strengths.filter((x) => x !== s) : strengths.length < max ? [...strengths, s] : strengths);

  return (
    <section className="space-y-5" data-testid="signup-strengths">
      <StepTitle title={t.strengths.title} sub={fill(t.strengths.sub, { max })} />
      <p className="text-[13px] font-medium text-text-tertiary break-keep text-pretty">{t.strengths.endorseNote}</p>
      <p className="text-[13px] font-bold text-brand" aria-live="polite">
        {fill(t.strengths.counter, { count: strengths.length, max })}
      </p>
      {SITE_CONTENT.brokerStrengths.groups.map((g) => (
        <div key={g.label} role="group" aria-label={g.label}>
          <p className="text-[13px] font-medium text-text-tertiary">{g.label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {g.chips.map((c) => {
              const on = strengths.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} disabled={!on && strengths.length >= max} onClick={() => toggle(c)} className={chipClass(on)}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {/* 가능한 것: 강점과 따로, 개수 제한 없음 */}
      <div role="group" aria-label={t.strengths.conditionsTitle} className="pt-2 border-t border-border-default">
        <p className="pt-3 text-[13px] font-bold text-text-secondary">{t.strengths.conditionsTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SITE_CONTENT.brokerStrengths.conditions.map((c) => {
            const on = conditions.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => onConditions(on ? conditions.filter((x) => x !== c) : [...conditions, c])}
                className={chipClass(on)}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={onNext} className={primaryButton}>
        {t.strengths.next}
      </button>
    </section>
  );
}
