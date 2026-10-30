'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import InquirySheet from '@/components/support/InquirySheet';
import { ownerInquiryContext } from '@/components/support/InquiryEntry';
import { usePhoneVerification } from '@/components/auth/usePhoneVerification';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, formatDateKo, toDateKey } from '@/components/my-requests/format';
import { loadApplication } from '@/lib/broker/application';
import { REQUEST_SUMMARY_KEY } from '@/lib/requests/requestDraft';
import { PRIVACY_DUE_DAYS, PRIVACY_REQUESTS_KEY, addWithdrawRequest, maskPhone, parsePrivacyRequests, samePhone, withdrawBlock } from '@/lib/privacy/myInfo';
import MyInfoVerify from './MyInfoVerify';

const t = SITE_CONTENT.myInfo;

type Row = [label: string, value: string];

/** 이 휴대폰에 남은 정보 중 인증한 번호와 같은 것만 (목업: localStorage, Supabase 연결 때 서버 본인 열람으로) */
function readMine(phone: string) {
  let summary: Record<string, unknown> | null = null;
  try {
    summary = JSON.parse(localStorage.getItem(REQUEST_SUMMARY_KEY) ?? 'null');
  } catch {
    summary = null;
  }
  const owner = summary && typeof summary.ownerPhone === 'string' && samePhone(summary.ownerPhone, phone) ? summary : null;
  const app = loadApplication();
  const broker = app && samePhone(app.phone, phone) ? app : null;
  return { owner, broker };
}

const dueText = (iso: string) => formatDateKo(toDateKey(new Date(iso)));

/**
 * 내 정보 관리 /my-info (A안, 대표님 2026-10-29): 본인 확인 → 내 정보 · 정정·삭제 문의 한 줄 · 탈퇴하기.
 * 탈퇴는 요청으로만 받고 운영팀이 처리 (지우는 동작 없음). 규칙은 lib/privacy/myInfo.ts
 */
export default function MyInfoPage() {
  const router = useRouter();
  const sms = usePhoneVerification();
  const [done, setDone] = useState<{ dueAt: string } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [mine, setMine] = useState<ReturnType<typeof readMine> | null>(null);
  const [inquiry, setInquiry] = useState(false);

  useEffect(() => {
    if (sms.verified) setMine(readMine(sms.phone));
  }, [sms.verified, sms.phone]);

  const rows = useMemo<Row[]>(() => {
    if (!mine) return [];
    const r = t.rows;
    const out: Row[] = [];
    const o = mine.owner;
    if (o) {
      if (typeof o.ownerName === 'string' && o.ownerName) out.push([r.name, o.ownerName]);
      out.push([r.phone, maskPhone(String(o.ownerPhone))]);
      if (o.dongInput || o.hoInput) out.push([r.dongHo, `${String(o.dongInput ?? '')} ${String(o.hoInput ?? '')}호`.trim()]);
      const consents = o.consents && typeof o.consents === 'object' ? Object.values(o.consents).filter(Boolean).length : 0;
      if (consents > 0 && typeof o.consentedAt === 'string') out.push([r.consents, fill(r.consentsValue, { n: consents, date: formatDateKo(toDateKey(new Date(o.consentedAt))) })]);
      out.push([r.requests, fill(r.requestsValue, { n: 1 })]);
    }
    const b = mine.broker;
    if (b) {
      out.push([r.office, b.office]);
      if (!o) out.push([r.phone, maskPhone(b.phone)]);
      out.push([r.signup, t.signupStatus[b.status]]);
    }
    return out;
  }, [mine]);

  const activeRequests = mine?.owner ? 1 : 0;
  const block = withdrawBlock({ activeRequests });

  const requestWithdraw = () => {
    let list = parsePrivacyRequests(null);
    try {
      list = parsePrivacyRequests(JSON.parse(localStorage.getItem(PRIVACY_REQUESTS_KEY) ?? '[]'));
    } catch {
      /* 깨졌으면 새로 */
    }
    const r = addWithdrawRequest(list, { phone: sms.phone, now: new Date() });
    try {
      localStorage.setItem(PRIVACY_REQUESTS_KEY, JSON.stringify(r.list));
    } catch {
      /* 저장소를 못 쓰면 화면 안내만 */
    }
    const mineNow = r.list.filter((x) => samePhone(x.phone, sms.phone)).at(-1);
    if (mineNow) setDone({ dueAt: mineNow.dueAt });
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface-page pb-10">
      <header className="h-14 px-2 flex items-center justify-between bg-surface-card border-b border-border-default sticky top-0 z-30">
        <button type="button" onClick={() => router.back()} aria-label={t.backLabel} className="w-11 h-11 rounded-full flex items-center justify-center text-text-primary">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-[17px] text-text-primary">{t.headerTitle}</span>
        <div className="w-11" />
      </header>

      <main className="flex-1 px-5 pt-6 space-y-6">
        {!sms.verified && <MyInfoVerify sms={sms} />}

        {sms.verified && mine && rows.length === 0 && (
          <p className="text-[15px] font-bold text-text-secondary" data-testid="my-info-empty">
            {t.noData}
          </p>
        )}

        {sms.verified && rows.length > 0 && (
          <>
            <section data-testid="my-info-rows">
              <h2 className="text-[17px] font-bold text-text-primary">{t.infoTitle}</h2>
              <dl className="mt-2 px-4 rounded-2xl bg-surface-card divide-y divide-border-light">
                {rows.map(([k, v]) => (
                  <div key={k} className="py-3 flex justify-between gap-3">
                    <dt className="text-[13px] font-medium text-text-tertiary flex-shrink-0">{k}</dt>
                    <dd className="text-[13px] font-bold text-text-primary text-right break-keep">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* 정정·삭제·휴대폰 변경은 문의하기 시트 (주제 "내 정보 정정", 대표님 2026-10-29: 카카오톡은 나중에 결정) */}
            <button
              type="button"
              onClick={() => setInquiry(true)}
              data-testid="my-info-inquiry"
              className="w-full p-4 rounded-2xl bg-surface-card flex items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-text-primary break-keep text-pretty">{t.inquiryTitle}</span>
                <span className="mt-1 block text-[13px] font-medium text-text-secondary break-keep text-pretty">{fill(t.inquirySub, { days: PRIVACY_DUE_DAYS })}</span>
              </span>
              <span className="shrink-0 inline-flex items-center text-[13px] font-bold text-brand">
                {t.inquiryButton}
                <ChevronRight className="w-4 h-4" aria-hidden />
              </span>
            </button>
            {inquiry && (
              <InquirySheet
                role={mine?.owner ? 'OWNER' : 'BROKER'}
                phone={sms.phone}
                request={ownerInquiryContext().request}
                initialTopic="CORRECTION"
                onClose={() => setInquiry(false)}
              />
            )}

            {done && (
              <p role="status" className="text-[13px] font-bold text-status-good break-keep" data-testid="my-info-done">
                {fill(t.withdrawDone, { date: dueText(done.dueAt) })}
              </p>
            )}

            <div className="text-center">
              <button type="button" onClick={() => setSheet(true)} data-testid="my-info-withdraw" className="min-h-[44px] px-3 text-[13px] font-medium text-text-tertiary underline">
                {t.withdrawLink}
              </button>
            </div>
          </>
        )}
      </main>

      <ActionSheet
        open={sheet}
        testId="my-info-withdraw-sheet"
        title={block ? t.blockedTitle : t.withdrawSheetTitle}
        cancelLabel={t.close}
        onCancel={() => setSheet(false)}
        confirmLabel={block ? t.blockedConfirm : t.withdrawConfirm}
        tone={block ? 'brand' : 'risk'}
        onConfirm={() => {
          setSheet(false);
          if (block) router.push('/my-requests');
          else requestWithdraw();
        }}
      >
        <div className="text-[15px] font-medium text-text-secondary leading-relaxed break-keep">
          {block ? <p>{t.blockedBody}</p> : t.withdrawLines.map((line) => <p key={line}>{fill(line, { days: PRIVACY_DUE_DAYS })}</p>)}
        </div>
      </ActionSheet>
    </div>
  );
}
