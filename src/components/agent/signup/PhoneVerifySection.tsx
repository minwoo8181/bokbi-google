'use client';

import React from 'react';
import { Check, Clock, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import ConsentGroup, { allConsented, type ConsentState } from '@/components/analysis/ConsentGroup';
import { countdown } from '@/lib/auth/phone';
import { TEST_OTP, usePhoneVerification } from '@/components/auth/usePhoneVerification';

const t = SITE_CONTENT.brokerSignup;

/**
 * 가입 1단계 아래쪽: 동의 + 휴대폰 인증. "이 사무소가 맞나요?"에 "네, 맞아요"를 누르면 같은 화면 아래에 열린다
 * (대표님 2026-10-28: 사무소 확인과 휴대폰 인증을 한 단계로)
 */
export default function PhoneVerifySection({
  sms,
  consents,
  onConsents,
}: {
  sms: ReturnType<typeof usePhoneVerification>;
  consents: ConsentState;
  onConsents: (c: ConsentState) => void;
}) {
  const { phone, setPhone, sent, code, setCode, verified } = sms;
  const phoneError = !sms.error
    ? null
    : sms.error === 'WRONG_CODE'
      ? t.phone.wrongCode
      : sms.error === 'EXPIRED'
        ? t.phone.expired
        : SITE_CONTENT.auth.errors[sms.error];

  return (
    <div className="space-y-4" data-testid="signup-phone">
      <div>
        <p className="text-[17px] font-bold text-text-primary break-keep">{t.phone.title}</p>
        <p className="mt-1 text-[15px] font-medium text-text-secondary break-keep text-pretty">{t.phone.sub}</p>
      </div>
      <ConsentGroup value={consents} onChange={onConsents} locked={verified} content={t.consents} />
      <label className="block">
        <span className="text-[13px] font-bold text-text-secondary block mb-1">{t.phone.label}</span>
        <div className="flex gap-2">
          <div className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 gap-2 focus-within:border-brand">
            <Phone className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden />
            <input
              type="tel"
              data-testid="signup-phone-input"
              value={phone}
              disabled={verified}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.phone.placeholder}
              className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none disabled:opacity-75"
            />
          </div>
          {!verified && (
            <button
              type="button"
              onClick={() => allConsented(consents) && void sms.send()}
              disabled={!allConsented(consents) || !sms.phoneOk || sms.busy}
              className="h-12 px-4 rounded-xl bg-brand text-white text-[13px] font-bold flex-shrink-0 disabled:bg-surface-subtle disabled:text-text-tertiary"
            >
              {sent ? t.phone.resend : t.phone.send}
            </button>
          )}
        </div>
      </label>

      {sent && !verified && (
        <div className="p-4 rounded-xl bg-surface-card border border-border-default space-y-3">
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span className="text-text-secondary">{t.phone.sentNotice}</span>
            <span className="text-brand flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {countdown(sms.secondsLeft)}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              data-testid="signup-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.phone.codePlaceholder}
              className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default px-3 font-bold text-[15px] tracking-wider text-text-primary focus:outline-none focus:border-brand"
            />
            <button type="button" onClick={() => void sms.verify()} className="h-12 px-4 rounded-xl bg-brand text-white text-[13px] font-bold flex-shrink-0">
              {t.phone.confirm}
            </button>
          </div>
          {phoneError && <p className="text-[13px] font-bold text-[var(--status-risk-strong)]">{phoneError}</p>}
          <button type="button" onClick={() => setCode(TEST_OTP)} className="min-h-[44px] text-[13px] font-medium text-text-tertiary underline">
            {t.phone.testFill}
          </button>
        </div>
      )}

      {verified && (
        <p className="flex items-center gap-2 text-[15px] font-bold text-status-good">
          <Check className="w-5 h-5" aria-hidden />
          {t.phone.verified}
        </p>
      )}
    </div>
  );
}
