'use client';

import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import ActionSheet from '@/components/my-requests/ActionSheet';

export type ConsentKey = 'TERMS' | 'COLLECT' | 'PROVIDE';
export type ConsentState = Record<ConsentKey, boolean>;

export const NO_CONSENT: ConsentState = { TERMS: false, COLLECT: false, PROVIDE: false };
export const ALL_CONSENT: ConsentState = { TERMS: true, COLLECT: true, PROVIDE: true };

export const allConsented = (c: ConsentState) => c.TERMS && c.COLLECT && c.PROVIDE;

function Box({ on }: { on: boolean }) {
  return (
    <span
      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
        on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-tertiary'
      }`}
      aria-hidden
    >
      <Check className="w-4 h-4 stroke-[3]" />
    </span>
  );
}

/**
 * 매칭 모달 4단계 동의 묶음 (토스식 전체 동의 + 항목별 ›).
 * 휴대폰 번호가 처음 밖으로 나가는 인증번호 발송 전에 받는다. 제3자 제공은 따로 동의 (개인정보 보호법 제17조)
 */
export interface ConsentContent {
  all: string;
  required: string;
  refusal: string;
  viewFull: string;
  close: string;
  items: readonly { key: string; label: string; title: string; legal: string; rows: readonly (readonly [string, string])[] }[];
}

/** content를 주면 다른 화면(중개사 가입)의 동의 문구로. 기본은 집주인 매칭 모달 */
export default function ConsentGroup({
  value,
  onChange,
  locked,
  content = SITE_CONTENT.matchingModal.step4.consents,
}: {
  value: ConsentState;
  onChange: (v: ConsentState) => void;
  locked: boolean;
  content?: ConsentContent;
}) {
  const t = content;
  const [open, setOpen] = useState<ConsentKey | null>(null);
  const all = allConsented(value);
  const item = t.items.find((i) => i.key === open) ?? null;

  return (
    <div className="rounded-xl bg-surface-subtle p-3" data-testid="consent-group">
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange(all ? NO_CONSENT : ALL_CONSENT)}
        aria-pressed={all}
        data-testid="consent-all"
        className="w-full min-h-[44px] flex items-center gap-3 text-left"
      >
        <Box on={all} />
        <span className="text-[15px] font-bold text-text-primary">{t.all}</span>
      </button>
      <ul className="mt-1 pt-1 border-t border-border-default">
        {t.items.map((i) => {
          const key = i.key as ConsentKey;
          return (
            <li key={key} className="flex items-center">
              <button
                type="button"
                disabled={locked}
                onClick={() => onChange({ ...value, [key]: !value[key] })}
                aria-pressed={value[key]}
                data-testid={`consent-${key}`}
                className="flex-1 min-h-[44px] flex items-center gap-3 text-left"
              >
                <Box on={value[key]} />
                <span className="text-[13px] font-medium text-text-secondary">{i.label}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpen(key)}
                aria-label={`${i.title} 보기`}
                className="w-11 h-11 flex items-center justify-center text-text-tertiary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {!all && !locked && <p className="mt-1 text-[12px] font-medium text-text-tertiary">{t.required}</p>}

      <ActionSheet open={item !== null} testId="consent-sheet" title={item?.title ?? ''} cancelLabel={t.close} onCancel={() => setOpen(null)}>
        {item && (
          <>
            <dl className="divide-y divide-border-light">
              {item.rows.map(([k, v]) => (
                <div key={k} className="py-2 flex gap-3">
                  <dt className="w-16 flex-shrink-0 text-[13px] font-medium text-text-tertiary">{k}</dt>
                  <dd className="text-[15px] font-medium text-text-primary break-keep">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] font-medium text-text-secondary break-keep">{t.refusal}</p>
            <a
              href={`/?legal=${item.legal}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center min-h-[44px] text-[13px] font-bold text-text-secondary"
            >
              {t.viewFull}
              <ChevronRight className="w-4 h-4" aria-hidden />
            </a>
          </>
        )}
      </ActionSheet>
    </div>
  );
}
