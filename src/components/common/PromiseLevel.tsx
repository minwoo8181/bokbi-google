import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';

/**
 * 약속 레벨 칩 (A안, 대표님 2026-10-29): 방패 하나 + "약속 레벨 n" (+ 뒤에 붙는 글자).
 * 내 사무소 프로필·집주인 익명 카드·가입 약속 미리보기가 같이 쓴다. 레벨은 stage.ts promiseLevel(건수)
 * - md: 내 사무소 (h-8 알약) / sm: 카드 안 칩 줄
 */
export default function PromiseLevel({
  level,
  suffix,
  size = 'sm',
  testId,
}: {
  level: 1 | 2 | 3 | 4;
  /** 예: "12건" — " · " 뒤에 붙는다 */
  suffix?: string;
  size?: 'sm' | 'md';
  testId?: string;
}) {
  const box = size === 'md' ? 'h-8 px-3 rounded-full gap-1' : 'px-2 py-1 rounded-md gap-1';
  return (
    <span className={`inline-flex items-center bg-brand-light text-brand-hover text-[13px] font-bold ${box}`} data-testid={testId}>
      <ShieldCheck className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden />
      <span>
        {fill(SITE_CONTENT.brokerAgent.office.level, { lv: level })}
        {suffix && ` · ${suffix}`}
      </span>
    </span>
  );
}
