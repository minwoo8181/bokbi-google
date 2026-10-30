import React from 'react';
import { UserRound } from 'lucide-react';

/**
 * 삼쩜삼 결과 리포트 부품 (wwit 2024 종합소득세 결과 "왜 납부인가요?" 말풍선 → 흰 답 카드).
 * 시선: 말풍선이 왼쪽에 줄지어 세로 축을 만들고(F 패턴 왼쪽 줄), 답 카드는 첫 줄 굵은 결론 → 오른쪽 숫자 칸 순서로 읽힌다
 */

/** 내 질문 말풍선: 동그란 사람 + 회색 말풍선 (왼쪽 정렬) */
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

/** 답 카드: 흰 둥근 카드, 맨 위 굵은 결론 한 줄 */
export function Answer({
  lead,
  children,
  testId,
  flush,
}: {
  lead?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
  /** 안쪽 여백 없이 (원래 카드·킵 부품을 그대로 넣을 때) */
  flush?: boolean;
}) {
  return (
    <section className={`rounded-2xl bg-surface-card overflow-hidden ${flush ? '' : 'px-5 py-6'}`} data-testid={testId}>
      {lead && <h3 className="text-[17px] font-bold text-text-primary leading-snug whitespace-pre-line">{lead}</h3>}
      {children}
    </section>
  );
}

/** 사실 줄: 왼쪽 이름 · 오른쪽 값 (숫자·결론은 오른쪽 한 줄로 훑는다) */
export function FactRows({ rows, strong }: { rows: readonly { label: string; value: string }[]; strong?: boolean }) {
  return (
    <dl className="mt-4 divide-y divide-border-light">
      {rows.map((r) => (
        <div key={r.label} className="py-3 flex items-baseline justify-between gap-4">
          <dt className="text-[15px] text-text-secondary">{r.label}</dt>
          <dd className={`text-[15px] font-bold text-right ${strong ? 'text-brand-hover' : 'text-text-primary'}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
