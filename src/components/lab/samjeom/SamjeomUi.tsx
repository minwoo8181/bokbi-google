'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, UserRound } from 'lucide-react';
import { LAB_CONTENT } from '@/config/labContent';

/**
 * 삼쩜삼 레퍼런스 공용 부품 (wwit 2024 삼쩜삼: 회색 바탕 + 구획 제목 + 흰 카드, 결과 리포트 "내 질문 말풍선 → 답 카드").
 * 시선: 말풍선이 왼쪽에 줄지어 세로 축(F 패턴 왼쪽 줄)을 만들고, 답 카드는 굵은 결론 첫 줄 → 오른쪽 값 칸으로 훑는다
 */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pt-10 pb-3 text-[20px] font-bold text-text-primary">{children}</h2>;
}

/** 내 질문 말풍선 */
export function Ask({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-2">
      <span className="w-8 h-8 flex-shrink-0 rounded-full bg-surface-card border border-border-default flex items-center justify-center" aria-hidden>
        <UserRound className="w-4 h-4 text-text-tertiary" />
      </span>
      <p className="rounded-2xl rounded-tl-md bg-border-default px-4 py-2 text-[15px] font-medium text-text-primary">{children}</p>
    </div>
  );
}

/** 답 카드: 굵은 결론 첫 줄 + 내용 */
export function Answer({
  lead,
  children,
  testId,
  flush,
}: {
  lead?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
  flush?: boolean;
}) {
  return (
    <section className={`rounded-2xl bg-surface-card overflow-hidden ${flush ? '' : 'px-5 py-6'}`} data-testid={testId}>
      {lead && <h3 className="text-[17px] font-bold text-text-primary leading-snug whitespace-pre-line">{lead}</h3>}
      {children}
    </section>
  );
}

/** 이름 왼쪽 · 값 오른쪽 줄 */
export function FactRows({ rows, strong }: { rows: readonly { label: string; value: string }[]; strong?: boolean }) {
  return (
    <dl className="mt-4 divide-y divide-border-light">
      {rows.map((r) => (
        <div key={r.label} className="py-3 flex items-baseline justify-between gap-4">
          <dt className="text-[15px] text-text-secondary flex-shrink-0">{r.label}</dt>
          <dd className={`text-[15px] font-bold text-right tabular-nums ${strong ? 'text-brand-hover' : 'text-text-primary'}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 진행 단계 막대: 얇은 막대 + 단계 이름 (지금 단계만 파랑 굵게). 홈·분석 같은 단계 이름 */
export function StepBar({ current }: { current: number }) {
  const steps = LAB_CONTENT.samjeom.steps;
  return (
    <div aria-label={`${steps.join(' → ')} 중 ${steps[current]}`}>
      <div className="h-1 rounded-full bg-border-light overflow-hidden">
        <div className="h-full rounded-full bg-brand" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-2 grid grid-cols-4 text-[12px] text-text-tertiary">
        {steps.map((s, k) => (
          <li
            key={s}
            aria-current={k === current ? 'step' : undefined}
            className={`${k === current ? 'font-bold text-brand-hover' : ''} ${k === steps.length - 1 ? 'text-right' : k > 0 ? 'text-center' : ''}`}
          >
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

const t = LAB_CONTENT.samjeom.tabs;
const TABS = [
  { href: '/', label: t.home, Icon: Home },
  { href: '/my-requests', label: t.requests, Icon: ClipboardList },
  { href: '/my-info', label: t.me, Icon: UserRound },
] as const;

/** 아래 탭 바 (중개사 입구는 홈 맨 위 보기 바꾸기가 맡아 3칸) */
export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-40 max-w-[440px] mx-auto bg-surface-card border-t border-border-light pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-3">
        {TABS.map(({ href, label, Icon }) => {
          const on = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={`h-14 flex flex-col items-center justify-center gap-1 text-[12px] font-medium ${on ? 'text-text-primary' : 'text-text-tertiary'}`}
              >
                <Icon className="w-6 h-6" strokeWidth={on ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
