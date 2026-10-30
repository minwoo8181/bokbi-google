'use client';

import React, { useState } from 'react';
import { SITE_CONTENT } from '@/config/siteContent';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill } from '@/components/my-requests/format';

const t = SITE_CONTENT.brokerAgent.office;
const { groups, conditions: CONDITIONS } = SITE_CONTENT.brokerStrengths;

interface StrengthsEditSheetProps {
  strengths: string[];
  conditions: string[];
  /** 칩 칸 수 (strengthSlots.ts) */
  max: number;
  onSave: (next: { strengths: string[]; conditions: string[] }) => void;
  onClose: () => void;
}

/** 내 사무소 "잘하는 점 고치기": 가입 때 고른 칩·가능 조건을 바꾼다. 이미 보낸 요청의 칩은 그대로 */
export default function StrengthsEditSheet({ strengths, conditions, max, onSave, onClose }: StrengthsEditSheetProps) {
  const [picked, setPicked] = useState<string[]>(() => strengths.slice(0, max));
  const [conds, setConds] = useState<string[]>(conditions);
  const full = picked.length >= max;

  const toggle = (chip: string) => setPicked((p) => (p.includes(chip) ? p.filter((c) => c !== chip) : p.length >= max ? p : [...p, chip]));
  const toggleCond = (c: string) => setConds((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const chipClass = (on: boolean) =>
    `h-10 px-4 rounded-full text-[13px] font-bold transition-colors disabled:opacity-40 ${on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`;

  return (
    <ActionSheet
      open
      testId="strengths-edit-sheet"
      title={t.edit.title}
      confirmLabel={t.edit.save}
      cancelLabel={t.edit.close}
      confirmDisabled={picked.length === 0}
      onConfirm={() => onSave({ strengths: picked, conditions: conds })}
      onCancel={onClose}
    >
      <p className="-mt-1 text-[13px] font-medium text-text-tertiary break-keep">{fill(t.edit.sub, { max })}</p>
      <p className="mt-2 text-[13px] font-bold text-brand tabular-nums">
        {picked.length}/{max}
      </p>
      <div className="mt-1 divide-y divide-border-light">
        {groups.map((g) => (
          <div key={g.label} className="py-3">
            <p className="text-[13px] font-bold text-text-secondary">{g.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.chips.map((c) => (
                <button key={c} type="button" onClick={() => toggle(c)} disabled={full && !picked.includes(c)} aria-pressed={picked.includes(c)} className={chipClass(picked.includes(c))}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="py-3">
          <p className="text-[13px] font-bold text-text-secondary">{t.conditionsTitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => toggleCond(c)} aria-pressed={conds.includes(c)} className={chipClass(conds.includes(c))}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ActionSheet>
  );
}
