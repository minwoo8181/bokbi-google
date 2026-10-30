import React from 'react';

/** 리포트 목록 한 줄: 이름·설명 왼쪽, 값 오른쪽 굵게 (킵 K1·K2 공용, 삼쩜삼 소득 목록 방식) */
export default function ReportRow({ label, sub, value, strong }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[15px] text-text-primary">{label}</span>
        {sub && <span className="block text-[13px] text-text-tertiary">{sub}</span>}
      </span>
      <span className={`flex-shrink-0 text-[15px] font-bold tabular-nums ${strong ? 'text-brand' : 'text-text-primary'}`}>{value}</span>
    </li>
  );
}
