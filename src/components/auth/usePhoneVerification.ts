'use client';

/**
 * 휴대폰 인증 상태 하나 (A1): 매칭 모달 4단계·중개사 가입·재방문 로그인이 같이 쓴다.
 * 번호 형식·인증번호 6자리·3분 만료는 lib/auth/phone.ts 규칙, 보내기·확인은 AuthPort (지금 흉내 / Supabase)
 */
import { useEffect, useState } from 'react';
import { digitsOnly, isMobileKr, OTP_SECONDS, type AuthError } from '@/lib/auth/phone';
import type { AuthPort } from '@/lib/auth/port';
import { authClient } from './authClient';

/** 테스트 채우기 버튼이 넣는 번호 (흉내 구현은 6자리면 통과, Supabase 테스트 번호도 같은 번호로 등록) */
export const TEST_OTP = '123456';

/** existingOnly: 로그인 화면 — 계정이 없는 번호면 NO_ACCOUNT (새 계정은 동의를 받는 화면에서만) */
export function usePhoneVerification(opts: { initialPhone?: string; auth?: AuthPort; existingOnly?: boolean } = {}) {
  const auth = opts.auth ?? authClient;
  const [phone, setPhone] = useState(opts.initialPhone ?? '');
  const [code, setCodeRaw] = useState('');
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const [error, setError] = useState<AuthError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sent || verified || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sent, verified, secondsLeft]);

  const phoneOk = isMobileKr(phone);

  const send = async () => {
    if (!phoneOk || busy || verified) return;
    setBusy(true);
    const r = await auth.sendCode(phone, { existingOnly: opts.existingOnly });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSent(true);
    setSecondsLeft(OTP_SECONDS);
    setCodeRaw('');
    setError(null);
  };

  const verify = async (override?: string) => {
    if (busy) return;
    if (secondsLeft <= 0) return setError('EXPIRED');
    setBusy(true);
    const r = await auth.verifyCode(phone, override ?? code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setVerified(true);
    setError(null);
  };

  return {
    phone,
    setPhone,
    code,
    /** 숫자만 6자리까지 */
    setCode: (v: string) => setCodeRaw(digitsOnly(v).slice(0, 6)),
    sent,
    verified,
    secondsLeft,
    error,
    busy,
    phoneOk,
    send,
    verify,
    /** 테스트 채우기: 번호를 넣고 바로 확인 */
    autofill: () => {
      setCodeRaw(TEST_OTP);
      return verify(TEST_OTP);
    },
    /** 번호 바꾸기: 처음부터 */
    reset: () => {
      setVerified(false);
      setSent(false);
      setCodeRaw('');
      setError(null);
    },
    /** 다시 요청: 처음 요청 때 인증을 끝낸 요청서 */
    markVerified: () => {
      setSent(true);
      setVerified(true);
    },
  };
}

export type PhoneVerification = ReturnType<typeof usePhoneVerification>;
