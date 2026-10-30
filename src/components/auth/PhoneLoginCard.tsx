'use client';

/**
 * 로그인 화면 /login (A1): 기존 회원만. 로그인이 필요한 화면에서 미들웨어가 보냄(?next=), 인증되면 그 화면으로.
 * 처음 오는 사람은 동의를 받는 곳(복비 계산 → 매칭 요청 / 중개사 가입)으로 안내
 */
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Clock, Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { countdown } from '@/lib/auth/phone';
import { safeNext } from '@/lib/auth/routes';
import { TEST_OTP, usePhoneVerification } from './usePhoneVerification';

const t = SITE_CONTENT.login;

export default function PhoneLoginCard() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const sms = usePhoneVerification({ existingOnly: true });
  const error = sms.error ? SITE_CONTENT.auth.errors[sms.error] : null;

  useEffect(() => {
    if (sms.verified) router.replace(next);
  }, [sms.verified, next, router]);

  return (
    <section className="space-y-5" data-testid="login-card">
      <div>
        <h1 className="text-[20px] font-bold text-text-primary leading-snug text-pretty">{t.title}</h1>
        <p className="mt-2 text-[15px] font-medium text-text-secondary text-pretty">{t.sub}</p>
      </div>

      <label className="block">
        <span className="text-[13px] font-bold text-text-secondary block mb-1">{t.phoneLabel}</span>
        <div className="flex gap-2">
          <div className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default flex items-center px-4 gap-2 focus-within:border-brand">
            <Phone className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden />
            <input
              type="tel"
              data-testid="login-phone"
              value={sms.phone}
              disabled={sms.verified}
              onChange={(e) => sms.setPhone(e.target.value)}
              placeholder={t.placeholder}
              className="w-full min-w-0 bg-transparent font-bold text-[15px] text-text-primary focus:outline-none disabled:opacity-75"
            />
          </div>
          {!sms.verified && (
            <button
              type="button"
              data-testid="login-send"
              onClick={() => void sms.send()}
              disabled={!sms.phoneOk || sms.busy}
              className="h-12 px-4 rounded-xl bg-brand text-white text-[15px] font-bold flex-shrink-0 disabled:bg-surface-subtle disabled:text-text-tertiary"
            >
              {sms.sent ? t.resend : t.send}
            </button>
          )}
        </div>
      </label>

      {sms.sent && !sms.verified && (
        <div className="p-4 rounded-xl bg-surface-card border border-border-default space-y-3">
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span className="text-text-secondary">{t.sentNotice}</span>
            <span className="text-brand flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {countdown(sms.secondsLeft)}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              data-testid="login-code"
              value={sms.code}
              onChange={(e) => sms.setCode(e.target.value)}
              placeholder={t.codePlaceholder}
              className="h-12 flex-1 min-w-0 rounded-xl bg-surface-subtle border border-border-default px-3 font-bold text-[17px] tracking-wider text-text-primary focus:outline-none focus:border-brand"
            />
            <button type="button" data-testid="login-confirm" onClick={() => void sms.verify()} disabled={sms.busy} className="h-12 px-4 rounded-xl bg-brand text-white text-[15px] font-bold flex-shrink-0">
              {t.confirm}
            </button>
          </div>
          <button type="button" onClick={() => sms.setCode(TEST_OTP)} className="min-h-[44px] text-[13px] font-medium text-text-tertiary underline">
            {t.testFill}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[13px] font-bold text-[var(--status-risk-strong)]" role="alert" data-testid="login-error">
          {error}
        </p>
      )}

      {sms.verified && (
        <p className="flex items-center gap-2 text-[15px] font-bold text-status-good">
          <Check className="w-5 h-5" aria-hidden />
          {SITE_CONTENT.brokerSignup.phone.verified}
        </p>
      )}

      {/* 처음 오는 사람: 계정은 동의를 받는 화면에서만 생김 */}
      <div className="pt-2 space-y-2 border-t border-border-default">
        <p className="pt-3 text-[13px] font-medium text-text-secondary">
          {t.newOwner}{' '}
          <Link href="/" className="font-bold text-brand-hover underline inline-flex min-h-[44px] items-center">
            {t.newOwnerLink}
          </Link>
        </p>
        <p className="text-[13px] font-medium text-text-secondary">
          {t.newBroker}{' '}
          <Link href="/agent/register" className="font-bold text-brand-hover underline inline-flex min-h-[44px] items-center">
            {t.newBrokerLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
