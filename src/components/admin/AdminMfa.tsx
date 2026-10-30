'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE_CONTENT } from '@/config/siteContent';
import { cleanTotpCode, groupSecret } from '@/lib/admin/gate';
import { supabaseMfa, type MfaApi, type MfaClientLike, type TotpEnrollment } from '@/lib/auth/mfa';
import { browserSupabase } from '@/lib/supabase/browser';
import { previewMfa } from './mfaPreview';

const t = SITE_CONTENT.adminConsole.mfa;
type ErrorKey = keyof typeof t.errors;

const FAILING: MfaApi = {
  startEnroll: async () => ({ ok: false, error: 'FAILED' }),
  verifiedFactor: async () => null,
  verify: async () => ({ ok: false, error: 'FAILED' }),
};

/**
 * 관리자 2단계 인증 (A5, 대표님 2026-10-29 C안). 서버 관문이 ENROLL·VERIFY일 때 콘솔 대신 보인다.
 * 등록: 휴대폰은 "인증 앱에 추가하기"(otpauth 주소) + 키 복사, 넓은 화면(lg)은 QR. 확인: 6자리를 다 넣으면 바로.
 * 통과하면 세션이 aal2가 되고 서버가 다시 판정해 콘솔을 연다
 */
export default function AdminMfa({ step, preview = false }: { step: 'ENROLL' | 'VERIFY'; preview?: boolean }) {
  const router = useRouter();
  const api = useMemo<MfaApi>(() => {
    if (preview) return previewMfa();
    const client = browserSupabase();
    return client ? supabaseMfa(client as unknown as MfaClientLike) : FAILING;
  }, [preview]);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    if (step === 'ENROLL') {
      const r = await api.startEnroll();
      if (!r.ok) return setError('FAILED');
      setEnrollment(r.value);
      setFactorId(r.value.factorId);
      return;
    }
    const id = await api.verifiedFactor();
    if (id) setFactorId(id);
    else setError('NO_FACTOR');
  }, [api, step]);

  useEffect(() => {
    // 등록은 부를 때마다 새 키가 생기므로 한 번만
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const onCode = async (raw: string) => {
    const next = cleanTotpCode(raw);
    setCode(next);
    if (next.length > 0) setError(null);
    if (next.length < 6 || !factorId || busy) return;
    setBusy(true);
    const r = await api.verify(factorId, next);
    if (r.ok) {
      router.replace('/admin');
      router.refresh();
      return;
    }
    setBusy(false);
    setCode('');
    setError(r.error);
  };

  const copy = () => {
    if (!enrollment) return;
    navigator.clipboard
      ?.writeText(enrollment.secret)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  const ready = !!factorId;
  const blocking = error === 'FAILED' && !ready;

  return (
    <div className="admin-wide min-h-[100dvh] bg-surface-page">
      <main className="max-w-md lg:max-w-3xl mx-auto px-4 pt-8 lg:pt-16 pb-12 space-y-4" data-testid="admin-mfa" data-step={step}>
        {preview && <p className="text-[12px] font-medium text-text-tertiary break-keep">{t.previewNotice}</p>}

        <section className="p-5 lg:p-8 rounded-3xl bg-surface-card lg:flex lg:gap-8 lg:items-center">
          {step === 'ENROLL' && enrollment && (
            // 넓은 화면: 휴대폰으로 찍을 QR
            // eslint-disable-next-line @next/next/no-img-element
            <img src={enrollment.qr} alt={t.qrAlt} width={200} height={200} className="hidden lg:block shrink-0 w-[200px] h-[200px] rounded-xl border border-border-default bg-white" data-testid="admin-mfa-qr" />
          )}

          <div className="min-w-0 flex-1 space-y-4">
            <h1 className="text-[20px] font-bold text-text-primary leading-snug text-pretty">{step === 'ENROLL' ? t.enrollTitle : t.verifyTitle}</h1>

            {step === 'ENROLL' && (
              <>
                <p className="lg:hidden text-[15px] font-medium text-text-secondary text-pretty">{t.enrollSubPhone}</p>
                <p className="hidden lg:block text-[15px] font-medium text-text-secondary text-pretty">{t.enrollSubWide}</p>
                {enrollment && (
                  <>
                    <a
                      href={enrollment.uri}
                      className="lg:hidden h-14 w-full rounded-xl bg-brand text-white text-[17px] font-bold inline-flex items-center justify-center active:scale-96 transition-transform duration-fast ease-out-soft"
                      data-testid="admin-mfa-open-app"
                    >
                      {t.openApp}
                    </a>
                    <div className="min-h-[44px] py-2 pl-3 pr-1 rounded-xl bg-surface-subtle flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[12px] font-medium text-text-tertiary break-keep">{t.keyLabel}</span>
                        <span className="block text-[15px] font-bold text-text-primary tabular-nums break-all" data-testid="admin-mfa-secret">
                          {groupSecret(enrollment.secret)}
                        </span>
                      </span>
                      <button type="button" onClick={copy} className="shrink-0 h-11 px-3 text-[13px] font-bold text-brand-hover" data-testid="admin-mfa-copy">
                        {copied ? t.copied : t.copy}
                      </button>
                    </div>
                    <p className="text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.apps}</p>
                  </>
                )}
              </>
            )}

            {ready && (
              <div className="space-y-2">
                {step === 'ENROLL' && <p className="text-[15px] font-bold text-text-primary">{t.codeLabel}</p>}
                <CodeBoxes code={code} disabled={busy} onChange={(v) => void onCode(v)} />
                <p className={`text-[13px] font-medium break-keep ${error ? 'text-[var(--status-risk-strong)]' : 'text-text-secondary'}`} role={error ? 'alert' : undefined} data-testid="admin-mfa-message">
                  {error ? t.errors[error] : busy ? t.checking : t.autoCheck}
                </p>
              </div>
            )}

            {!ready && error && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-[var(--status-risk-strong)] break-keep" role="alert" data-testid="admin-mfa-message">
                  {t.errors[error]}
                </p>
                {blocking && (
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="h-11 px-4 rounded-xl border border-border-default text-[15px] font-bold text-text-primary"
                  >
                    {t.retry}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <p className="px-1 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.lost}</p>
      </main>
    </div>
  );
}

/** 6칸 숫자 (실제 입력은 칸 위에 겹친 투명 입력 하나 — 붙여 넣기·문자 자동 채우기·화면 낭독기 그대로) */
function CodeBoxes({ code, disabled, onChange }: { code: string; disabled: boolean; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && i === Math.min(code.length, 5);
          const filled = i < code.length;
          return (
            <span
              key={i}
              className={`flex-1 min-w-0 h-[52px] rounded-xl flex items-center justify-center text-[20px] font-bold tabular-nums text-text-primary bg-surface-card ${
                filled || active ? 'border-2 border-brand' : 'border border-border-default'
              }`}
            >
              {code[i] ?? ''}
            </span>
          );
        })}
      </div>
      <input
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={t.codeLabel}
        autoFocus
        data-testid="admin-mfa-code"
        className="absolute inset-0 w-full h-full opacity-0 cursor-text"
      />
    </div>
  );
}
