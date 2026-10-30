'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import type { SignupCheck } from '@/lib/broker/signup';
import { OFFICE_MAP, officeMapSrc } from '@/lib/requests/officeMap';
import { StepTitle, inputClass, primaryButton } from './SignupParts';

const t = SITE_CONTENT.brokerSignup;

export type OfficeFields = { regNo: string; ceo: string; office: string };

/**
 * 가입 1단계 "사무소·본인 확인" (대표님 2026-10-28): 세 칸 → "이 사무소가 맞나요?"(주소·지도) → "네, 맞아요"를 누르면
 * 아래에 휴대폰 인증(children)이 열리고, 인증이 끝나야 다음
 */
export default function OfficeStep({
  fields,
  onField,
  check,
  checking,
  onSubmit,
  notMine,
  onNotMine,
  confirmed,
  onConfirm,
  canNext,
  onNext,
  children,
}: {
  fields: OfficeFields;
  onField: (key: keyof OfficeFields, value: string) => void;
  check: SignupCheck | null;
  checking: boolean;
  onSubmit: () => void;
  notMine: boolean;
  onNotMine: () => void;
  confirmed: boolean;
  onConfirm: () => void;
  canNext: boolean;
  onNext: () => void;
  children: React.ReactNode;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  const regNoRef = useRef<HTMLInputElement>(null);
  const matchedRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const matched = check?.ok ? check : null;

  useEffect(() => {
    if (!matched) return;
    setMapFailed(false);
    matchedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [matched?.regNo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (confirmed) phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [confirmed]);

  const rows = [
    ['regNo', t.office.regNoLabel, t.office.regNoPlaceholder],
    ['ceo', t.office.ceoLabel, t.office.ceoPlaceholder],
    ['office', t.office.officeLabel, t.office.officePlaceholder],
  ] as const;

  return (
    <section className="space-y-5" data-testid="signup-office">
      <StepTitle title={t.office.title} sub={t.office.sub} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {rows.map(([key, label, placeholder]) => (
          <label key={key} className="block">
            <span className="text-[13px] font-bold text-text-secondary block mb-1">
              {label}
              {key === 'regNo' && <span className="ml-2 font-medium text-text-tertiary">{t.office.regNoHint}</span>}
            </span>
            <input
              ref={key === 'regNo' ? regNoRef : undefined}
              data-testid={`signup-${key}`}
              value={fields[key]}
              onChange={(e) => onField(key, e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className={inputClass}
            />
          </label>
        ))}

        {check && !check.ok && (
          <p role="alert" className="flex items-start gap-2 text-[13px] font-bold leading-snug text-[var(--status-risk-strong)] break-keep whitespace-pre-line text-pretty">
            <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0" aria-hidden />
            {t.office.errors[check.error]}
          </p>
        )}

        {!matched && (
          <button
            type="submit"
            disabled={checking || !fields.regNo.trim() || !fields.ceo.trim() || !fields.office.trim()}
            className={primaryButton}
          >
            {checking ? t.office.checking : t.office.submit}
          </button>
        )}
      </form>

      {notMine && !check && (
        <p role="status" className="text-[13px] font-bold text-text-secondary break-keep whitespace-pre-line text-pretty">
          {t.office.notMine}
        </p>
      )}

      {matched && (
        <div ref={matchedRef} className="space-y-4 scroll-mt-20" data-testid="signup-matched">
          <div className="p-4 rounded-2xl bg-surface-card">
            <p className="flex items-center gap-2 text-[17px] font-bold text-text-primary">
              <ShieldCheck className="w-5 h-5 text-brand flex-shrink-0" aria-hidden />
              {t.office.confirmTitle}
            </p>
            <p className="mt-3 text-[15px] font-bold text-text-primary break-keep text-pretty">{matched.office}</p>
            <p className="mt-1 text-[13px] font-medium text-text-secondary break-keep text-pretty" data-testid="signup-address">
              {matched.address}
            </p>
            {!mapFailed ? (
              // 지도는 서버가 등록번호로 그때그때 그린다 (키·좌표는 화면에 없음)
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={officeMapSrc(matched.regNo)}
                alt={fill(t.office.mapAlt, { office: matched.office })}
                width={OFFICE_MAP.width}
                height={OFFICE_MAP.height}
                onError={() => setMapFailed(true)}
                data-testid="signup-map"
                className="mt-3 w-full h-auto rounded-xl bg-surface-subtle"
              />
            ) : (
              <p className="mt-3 text-[13px] font-medium text-text-tertiary">{t.office.mapError}</p>
            )}
            {matched.nameClose && <p className="mt-2 text-[13px] font-medium text-text-secondary">{t.office.nameClose}</p>}
            <p className="mt-3 text-[13px] font-medium text-text-tertiary break-keep text-pretty">{t.office.callPreview}</p>
            <p className="mt-1 text-[13px] font-medium text-text-tertiary break-keep text-pretty" data-testid="signup-audit-notice">
              {t.auditNotice}
            </p>
          </div>
          {!confirmed && (
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <button
                type="button"
                onClick={() => {
                  onNotMine();
                  regNoRef.current?.focus();
                }}
                className="h-14 rounded-xl bg-surface-card text-text-primary text-[17px] font-bold"
              >
                {t.office.confirmNo}
              </button>
              <button type="button" onClick={onConfirm} data-testid="signup-confirm-office" className={primaryButton}>
                {t.office.confirmYes}
              </button>
            </div>
          )}
        </div>
      )}

      {matched && confirmed && (
        <div ref={phoneRef} className="pt-5 border-t border-border-default space-y-5 scroll-mt-20">
          {children}
          <button type="button" disabled={!canNext} onClick={onNext} data-testid="signup-office-next" className={primaryButton}>
            {t.phone.next}
          </button>
        </div>
      )}
    </section>
  );
}
