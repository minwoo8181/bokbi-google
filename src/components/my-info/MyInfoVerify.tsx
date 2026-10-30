'use client';

import React from 'react';
import { Clock, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { countdown } from '@/lib/auth/phone';
import { TEST_OTP, type PhoneVerification } from '@/components/auth/usePhoneVerification';

const t = SITE_CONTENT.myInfo;
const l = SITE_CONTENT.login;

/** 내 정보 관리 첫 단계: 휴대폰 인증 (모양은 로그인 카드와 같음, 공통 훅) */
export default function MyInfoVerify({ sms }: { sms: PhoneVerification }) {
  const error = sms.error ? SITE_CONTENT.auth.errors[sms.error] : null;
  return (
    <section className="space-y-5" data-testid="my-info-verify">
      <div>
        <h1 className="text-[20px] font-bold text-text-primary leading-snug text-pretty">{t.verifyTitle}</h1>
        <p className="mt-2 text-[15px] font-medium text-text-secondary text-pretty">{t.verifySub}</p>
      </div>
      <label className="block">
        <span className="text-[13px] font-bold text-text-secondary block mb-1">{l.phoneLabel}</span>
        <div className="flex gap-2">
          <div className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 gap-2 focus-within:border-brand">
            <Phone className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden />
            <input
              type="tel"
              data-testid="my-info-phone"
              value={sms.phone}
              onChange={(e) => sms.setPhone(e.target.value)}
              placeholder={l.placeholder}
              className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            data-testid="my-info-send"
            onClick={() => void sms.send()}
            disabled={!sms.phoneOk || sms.busy}
            className="h-12 px-4 rounded-xl bg-brand text-white text-[13px] font-bold flex-shrink-0 disabled:bg-surface-subtle disabled:text-text-tertiary"
          >
            {sms.sent ? l.resend : l.send}
          </button>
        </div>
      </label>
      {sms.sent && (
        <div className="p-4 rounded-xl bg-surface-card border border-border-default space-y-3">
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span className="text-text-secondary">{l.sentNotice}</span>
            <span className="text-brand flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {countdown(sms.secondsLeft)}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              data-testid="my-info-code"
              value={sms.code}
              onChange={(e) => sms.setCode(e.target.value)}
              placeholder={l.codePlaceholder}
              className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default px-3 font-bold text-[15px] tracking-wider text-text-primary focus:outline-none focus:border-brand"
            />
            <button type="button" data-testid="my-info-confirm" onClick={() => void sms.verify()} disabled={sms.busy} className="h-12 px-4 rounded-xl bg-brand text-white text-[13px] font-bold flex-shrink-0">
              {l.confirm}
            </button>
          </div>
          <button type="button" onClick={() => sms.setCode(TEST_OTP)} className="min-h-[44px] text-[13px] font-medium text-text-tertiary underline">
            {l.testFill}
          </button>
        </div>
      )}
      {error && (
        <p className="text-[13px] font-bold text-[var(--status-risk-strong)]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
