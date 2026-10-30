import React from 'react';

/** 중개사 가입 단계 화면 공용 모양 (BrokerSignupFlow에서 나눔, 2026-10-28) */
export const inputClass =
  'w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-4 font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand disabled:opacity-75';
export const primaryButton =
  'w-full h-14 rounded-xl bg-brand text-white text-[17px] font-bold active:scale-[0.98] transition-transform disabled:bg-surface-subtle disabled:text-text-tertiary';

export function StepTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-[20px] font-bold text-text-primary leading-snug break-keep text-pretty">{title}</h1>
      <p className="mt-2 text-[15px] font-medium text-text-secondary break-keep whitespace-pre-line text-pretty">{sub}</p>
    </div>
  );
}
