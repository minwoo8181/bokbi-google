'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { COMPANY_INFO, SITE_CONTENT } from '@/config/siteContent';
import { NO_CONSENT, type ConsentKey, type ConsentState } from '@/components/analysis/ConsentGroup';
import { checkBrokerOffice, reissueSignupCode, submitBrokerApplication } from '@/app/agent/register/actions';
import type { SignupCheck } from '@/lib/broker/signup';
import { type BrokerApplication, saveApplication } from '@/lib/broker/application';
import { loadSignupCode, saveSignupCode, withStoredCode } from '@/lib/broker/signupCode';
import { browserStore } from '@/lib/data/local';
import { usePhoneVerification } from '@/components/auth/usePhoneVerification';
import { DATA_BACKEND, repos } from '@/components/data/repos';
import { track } from '@/lib/analytics/store';
import OfficeStep, { type OfficeFields } from './signup/OfficeStep';
import PhoneVerifySection from './signup/PhoneVerifySection';
import StrengthsStep from './signup/StrengthsStep';
import PromiseStep from './signup/PromiseStep';
import SignupDone from './signup/SignupDone';

/**
 * 중개사 가입 (대표님 2026-10-28 순서): ① 사무소·본인 확인(사무소 → "맞아요" → 같은 화면 아래 휴대폰 인증) → ② 잘하는 점 → ③ 약속 → 신청 완료(확인 코드)
 * 신청은 서버 액션(명단 대조 다시 + 확인 코드 서버 발급, A4). 브라우저 저장소 단계는 이 브라우저에 저장, Supabase는 서버 저장(코드는 해시만)
 */
const t = SITE_CONTENT.brokerSignup;
type QaKey = Exclude<keyof typeof t.qa, 'title' | 'admin'>;
const EMPTY_FIELDS: OfficeFields = { regNo: '', ceo: '', office: '' };

export default function BrokerSignupFlow() {
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<BrokerApplication | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ① 사무소 확인 ("이 사무소가 맞나요?"에 맞다고 하면 confirmed → 휴대폰 인증이 열림)
  const [fields, setFields] = useState<OfficeFields>(EMPTY_FIELDS);
  const [check, setCheck] = useState<SignupCheck | null>(null);
  const [checking, startCheck] = useTransition();
  const [notMine, setNotMine] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // 휴대폰 인증: 공통 훅 (A1 — 지금은 흉내, Supabase 스위치 때 실제 로그인)
  const [consents, setConsents] = useState<ConsentState>(NO_CONSENT);
  const sms = usePhoneVerification();

  // ②·③ 잘하는 점, 약속
  const [strengths, setStrengths] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [promises, setPromises] = useState<boolean[]>(() => t.promise.items.map(() => false));

  // 신청은 저장소에서 (Supabase면 서버 — 코드는 해시만이라 이 휴대폰에 남긴 원문을 붙임, A4)
  useEffect(() => {
    void repos.applications
      .get()
      .then((a) => setApplication(withStoredCode(a, loadSignupCode(browserStore))))
      .catch(() => setApplication(null))
      .finally(() => setLoaded(true));
  }, []);

  const matched = check?.ok ? check : null;

  const onField = (key: keyof OfficeFields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setCheck(null);
    setNotMine(false);
    setConfirmed(false);
  };

  // 행동 기록 (A7): 가입 단계별 통과·실패 (어디서 그만두는지)
  const logStep = (s: 'OFFICE' | 'PHONE' | 'STRENGTHS' | 'SUBMIT', ok: boolean) => track('broker_signup', { step: s, result: ok ? 'OK' : 'FAIL' });
  const submitOffice = () =>
    startCheck(async () => {
      const r = await checkBrokerOffice(fields);
      logStep('OFFICE', r.ok);
      setCheck(r);
    });
  // 휴대폰 인증 직후: 행동 기록 + 가입 동의 기록 (A6, 대표님 2026-10-29 — 번호를 받은 순간의 동의 증빙, 같은 약관 버전은 한 번만)
  useEffect(() => {
    if (!sms.verified) return;
    logStep('PHONE', true);
    const agreed = (Object.keys(consents) as ConsentKey[]).filter((k) => consents[k]);
    void repos.applications.recordConsents(agreed, COMPANY_INFO.policyEffectiveDate, new Date()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sms.verified]);

  /**
   * 신청 (A4): 서버가 명단 대조를 다시 하고 확인 코드를 만든다. Supabase = 서버 저장(코드 해시) + 원문은 이 휴대폰에만,
   * 브라우저 저장소 단계 = 이 브라우저에 신청 저장. 실패하면 ① 사무소 확인으로 돌아가 이유를 보여 줌
   */
  const [submitting, setSubmitting] = useState(false);
  const submitApplication = async () => {
    if (!matched || submitting) return;
    setSubmitting(true);
    try {
      const r = await submitBrokerApplication({ ...fields, strengths, conditions });
      logStep('SUBMIT', r.ok);
      if (!r.ok) {
        setCheck({ ok: false, error: r.error });
        setConfirmed(false);
        if (r.error === 'NOT_SIGNED_IN') sms.reset();
        setStep(0);
        return;
      }
      if (DATA_BACKEND === 'supabase') {
        saveSignupCode(browserStore, r.value.check.regNo, r.value.code);
        setApplication(withStoredCode(await repos.applications.get(), loadSignupCode(browserStore)));
        return;
      }
      const app: BrokerApplication = {
        regNo: r.value.check.regNo,
        office: r.value.check.office,
        ceo: fields.ceo.trim(),
        code: r.value.code,
        strengths,
        conditions,
        phone: sms.phone.trim(),
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
        reviewedAt: null,
        rejectReason: null,
        openYear: r.value.check.openYear,
      };
      await repos.applications.save(app);
      setApplication(app);
    } finally {
      setSubmitting(false);
    }
  };

  /** 다른 휴대폰에서 새 확인 코드 받기 (대표님 2026-10-29 A안, Supabase만). 실패면 false */
  const reissue = async (): Promise<boolean> => {
    if (!application) return false;
    const r = await reissueSignupCode();
    if (!r.ok) return false;
    saveSignupCode(browserStore, application.regNo, r.value);
    setApplication({ ...application, code: r.value });
    return true;
  };

  /** 반려 뒤 다시 신청: 저장된 신청을 지우고 처음부터 (Supabase는 반려된 행을 새 신청이 덮어씀) */
  const retry = () => {
    void repos.applications.save(null);
    saveSignupCode(browserStore, '', null);
    setApplication(null);
    setStep(0);
    setCheck(null);
    setConfirmed(false);
    sms.reset();
    setPromises(t.promise.items.map(() => false));
  };

  // ── 테스트 스위처: 단계별 화면 바로 보기 (배포 전 제거) ──
  /** "다른 휴대폰" 예시: 서버 대신 이 화면에서 새 코드를 만들어 보여 줌 */
  const [qaReissue, setQaReissue] = useState(false);
  const qaReissueCode = async () => {
    if (!application) return false;
    setApplication({ ...application, code: String(1000 + Math.floor(Math.random() * 9000)) });
    return true;
  };
  const QA_SAMPLE = { regNo: '41360-2024-60048', ceo: '이상현', office: '1등이편한' };
  const qa = async (k: QaKey) => {
    setQaReissue(k === 'codeMissing');
    if (k === 'pending' || k === 'approved' || k === 'rejected' || k === 'codeMissing') {
      const app: BrokerApplication = {
        regNo: QA_SAMPLE.regNo,
        office: '1등이편한공인중개사사무소',
        ceo: QA_SAMPLE.ceo,
        // 다른 휴대폰 = 서버엔 해시만이라 이 휴대폰에 코드 원문이 없는 상태 (A4)
        code: k === 'codeMissing' ? '' : '3180',
        strengths: ['손님을 잘 데려와요', '사진을 잘 찍어요'],
        conditions: ['주말 안내 가능'],
        phone: '010-1234-5678',
        submittedAt: new Date().toISOString(),
        status: k === 'pending' || k === 'codeMissing' ? 'PENDING' : k === 'approved' ? 'APPROVED' : 'REJECTED',
        reviewedAt: k === 'pending' ? null : new Date().toISOString(),
        rejectReason: k === 'rejected' ? SITE_CONTENT.adminBrokers.rejectReasons[0] : null,
        openYear: 2024,
      };
      saveApplication(app);
      setApplication(app);
      return;
    }
    saveApplication(null);
    setApplication(null);
    setNotMine(false);
    setConfirmed(false);
    sms.reset();
    if (k === 'officeEmpty') {
      setFields(EMPTY_FIELDS);
      setCheck(null);
      setStep(0);
      return;
    }
    const sample = { ...QA_SAMPLE, ceo: k === 'officeError' ? '김예시' : QA_SAMPLE.ceo };
    setFields(sample);
    setCheck(await checkBrokerOffice(sample));
    // 휴대폰 인증 = 사무소 맞음 + 아래 인증 열림, 잘하는 점·약속 = 인증까지 끝난 상태
    if (k === 'phone' || k === 'strengths' || k === 'promise') setConfirmed(true);
    if (k === 'strengths' || k === 'promise') {
      sms.markVerified();
      setConsents({ TERMS: true, COLLECT: true, PROVIDE: true });
    }
    setStep(k === 'strengths' ? 1 : k === 'promise' ? 2 : 0);
  };

  const showDone = loaded && application !== null;
  // 저장된 신청을 읽기 전에는 폼을 그리지 않는다 (완료 화면 앞에 입력 폼이 잠깐 보이지 않게)
  const showForm = loaded && application === null;
  const stepCount = t.steps.length - 1;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface-page pb-10">
      <header className="h-14 px-2 flex items-center justify-between bg-surface-card border-b border-border-default sticky top-0 z-30">
        {step > 0 && showForm ? (
          <button type="button" onClick={() => setStep(step - 1)} aria-label={t.backLabel} className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary">
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <Link href="/" aria-label={t.backLabel} className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        )}
        <span className="font-bold text-[17px] text-text-primary">{t.headerTitle}</span>
        <div className="w-11" />
      </header>

      {showForm && (
        <div className="px-5 pt-4" aria-label={`${step + 1}/${stepCount} ${t.steps[step]}`}>
          <div className="flex gap-1">
            {t.steps.slice(0, -1).map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-border-default'}`} />
            ))}
          </div>
          <p className="mt-2 text-[13px] font-bold text-brand">{t.steps[step]}</p>
        </div>
      )}

      <main className="flex-1 px-5 pt-4 space-y-6">
        {showDone && application && <SignupDone app={application} onRetry={retry} onReissue={DATA_BACKEND === 'supabase' ? reissue : qaReissue ? qaReissueCode : undefined} />}

        {showForm && step === 0 && (
          <OfficeStep
            fields={fields}
            onField={onField}
            check={check}
            checking={checking}
            onSubmit={submitOffice}
            notMine={notMine}
            onNotMine={() => {
              setCheck(null);
              setNotMine(true);
            }}
            confirmed={confirmed}
            onConfirm={() => setConfirmed(true)}
            canNext={sms.verified}
            onNext={() => setStep(1)}
          >
            <PhoneVerifySection sms={sms} consents={consents} onConsents={setConsents} />
          </OfficeStep>
        )}

        {showForm && step === 1 && (
          <StrengthsStep strengths={strengths} onStrengths={setStrengths} conditions={conditions} onConditions={setConditions} onNext={() => {
            logStep('STRENGTHS', true);
            setStep(2);
          }} />
        )}

        {showForm && step === 2 && (
          <PromiseStep promises={promises} onToggle={(i) => setPromises((cur) => cur.map((v, j) => (j === i ? !v : v)))} onSubmit={() => void submitApplication()} />
        )}

        {/* 테스트 스위처 (배포 전 제거) */}
        <div className="pt-6 border-t border-border-default text-center space-y-2">
          <p className="text-[12px] font-bold text-text-tertiary">{t.qa.title}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(Object.keys(t.qa) as (keyof typeof t.qa)[])
              .filter((k): k is QaKey => k !== 'title' && k !== 'admin')
              .map((k) => (
                <button key={k} type="button" data-testid={`qa-${k}`} onClick={() => qa(k)} className="h-9 px-3 rounded-lg bg-surface-card text-[12px] font-bold text-text-secondary">
                  {t.qa[k]}
                </button>
              ))}
            <Link href="/admin/brokers" className="h-9 px-3 rounded-lg bg-surface-card text-[12px] font-bold text-brand inline-flex items-center">
              {t.qa.admin}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
