'use client';

import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { fill } from '@/components/my-requests/format';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { type AdminCallInfo, getAdminCallInfo } from '@/app/admin/brokers/actions';
import { track } from '@/lib/analytics/store';
import { CALL_DEADLINE_HOURS, hoursSince } from '@/lib/broker/application';
import type { AdminApplication, ApplicationDecideError, ApplicationDecision } from '@/lib/data/repo';
import { DATA_BACKEND, repos } from '@/components/data/repos';

/**
 * 관리자 가입 확인 한 건: 확인 전화 번호 안내 → 신청자가 불러 준 코드 입력 → 승인 / 반려.
 * 목록은 중개사 탭(AdminBrokersTab), 판정은 저장소 admin.decideApplication (Supabase = approve_broker 한 트랜잭션, A2'')
 */
const t = SITE_CONTENT.adminBrokers;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2 flex gap-3">
      <dt className="w-24 flex-shrink-0 text-[13px] font-medium text-text-tertiary">{label}</dt>
      <dd className="min-w-0 text-[15px] font-medium text-text-primary break-keep">{children}</dd>
    </div>
  );
}

/** app: 목록에서 고른 신청 한 건, onChange: 판정·지우기 뒤 목록을 다시 읽게 */
export default function AdminBrokerReview({ app, onChange }: { app: AdminApplication; onChange: () => void }) {
  const [info, setInfo] = useState<AdminCallInfo | null>(null);
  const [code, setCode] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<ApplicationDecideError | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void getAdminCallInfo(app.regNo).then(setInfo);
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [app.regNo]);

  const decide = async (decision: ApplicationDecision) => {
    const r = await repos.admin.decideApplication(app.id, decision, new Date());
    if (!r.ok) return setError(r.error);
    setError(null);
    track('admin_action', { action: decision.kind === 'APPROVE' ? 'SIGNUP_APPROVED' : 'SIGNUP_REJECTED' });
    onChange();
  };

  const approve = () => void decide({ kind: 'APPROVE', spokenCode: code, registryOpenYear: info?.openYear ?? null, enteredYear: year });

  const hours = hoursSince(app.submittedAt, now);
  const left = CALL_DEADLINE_HOURS - hours;

  return (
    <div>
      <main className="space-y-4">
        <article className="p-5 rounded-2xl bg-surface-card space-y-4" data-testid="admin-application">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[17px] font-bold text-text-primary break-keep">{app.office}</h1>
                {app.status === 'PENDING' && (
                  <p className={`mt-1 text-[13px] font-bold ${left <= 0 ? 'text-[var(--status-risk-strong)]' : left <= 12 ? 'text-status-caution' : 'text-text-tertiary'}`}>
                    {fill(t.elapsed, { hours })} · {left <= 0 ? t.overdue : fill(t.dueSoon, { hours: left })}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 px-2 py-1 rounded-md text-[13px] font-bold ${
                  app.status === 'APPROVED'
                    ? 'bg-status-good-light text-[var(--status-good-strong)]'
                    : app.status === 'REJECTED'
                      ? 'bg-status-risk-light text-[var(--status-risk-strong)]'
                      : 'bg-brand-light text-brand-hover'
                }`}
              >
                {t.status[app.status]}
              </span>
            </div>

            <dl className="divide-y divide-border-light">
              <Row label={t.regNo}>{app.regNo}</Row>
              <Row label={t.ceo}>{info?.ceo ?? '-'}</Row>
              <Row label={t.address}>{info?.address ?? '-'}</Row>
              <Row label={t.applicantPhone}>{app.phone}</Row>
              <Row label={t.strengths}>{app.strengths.join(', ') || '-'}</Row>
            </dl>

            {app.status === 'PENDING' && (
              <>
                <section className="p-4 rounded-xl bg-surface-subtle space-y-2" data-testid="admin-call">
                  <h2 className="text-[15px] font-bold text-text-primary">{t.callTitle}</h2>
                  {info?.phone ? (
                    <>
                      <a href={`tel:${info.phone}`} className="min-h-[44px] inline-flex items-center gap-2 text-[17px] font-bold text-brand">
                        <Phone className="w-4 h-4" aria-hidden />
                        {info.phone}
                      </a>
                      <p className="text-[13px] font-medium text-text-tertiary">{info.phoneSource === 'office-name' ? t.phoneInName : t.vworldPhone}</p>
                      {info.altPhones.length > 0 && (
                        <p className="text-[13px] font-medium text-text-secondary">
                          {t.altPhones}: {info.altPhones.join(', ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[15px] font-medium text-text-primary break-keep whitespace-pre-line text-pretty">{fill(t.naverGuide, { regNo: app.regNo })}</p>
                      <p className="text-[13px] font-medium text-text-tertiary break-keep">{t.smsGuide}</p>
                    </>
                  )}
                </section>

                <label className="block">
                  <span className="text-[13px] font-bold text-text-secondary block mb-1">{t.codeLabel}</span>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      setError(null);
                    }}
                    placeholder={t.codePlaceholder}
                    data-testid="admin-code"
                    className="w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-4 font-bold text-[20px] tracking-[0.3em] text-text-primary focus:outline-none focus:border-brand"
                  />
                </label>

                {info && info.openYear === null ? (
                  <label className="block">
                    <span className="text-[13px] font-bold text-text-secondary block mb-1">{t.yearLabel}</span>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={year}
                      onChange={(e) => {
                        setYear(e.target.value.replace(/\D/g, ''));
                        setError(null);
                      }}
                      placeholder={t.yearPlaceholder}
                      data-testid="admin-year"
                      className="w-full h-12 rounded-xl bg-surface-subtle border border-border-default px-4 font-bold text-[15px] text-text-primary focus:outline-none focus:border-brand"
                    />
                  </label>
                ) : (
                  info && <p className="text-[13px] font-medium text-text-tertiary">{fill(t.yearFromRegistry, { year: info.openYear ?? '' })}</p>
                )}

                {error && (
                  <p role="alert" className="text-[15px] font-bold text-[var(--status-risk-strong)]">
                    {t.errors[error]}
                  </p>
                )}

                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <button type="button" onClick={() => setRejecting(true)} className="h-14 rounded-xl bg-surface-subtle text-text-primary text-[17px] font-bold">
                    {t.reject}
                  </button>
                  <button
                    type="button"
                    onClick={approve}
                    disabled={code.length !== 4 || !info}
                    data-testid="admin-approve"
                    className="h-14 rounded-xl bg-brand text-white text-[17px] font-bold disabled:bg-surface-subtle disabled:text-text-tertiary"
                  >
                    {t.approve}
                  </button>
                </div>
              </>
            )}

            {app.status === 'REJECTED' && app.rejectReason && <p className="text-[15px] font-medium text-[var(--status-risk-strong)]">{app.rejectReason}</p>}
          </article>

        {/* 목업만: 이 브라우저의 신청 지우기 (서버 신청은 지우지 않음) */}
        {DATA_BACKEND === 'local' && (
          <button type="button" onClick={() => void repos.applications.save(null).then(onChange)} className="min-h-[44px] text-[13px] font-medium text-text-tertiary underline">
            {t.reset}
          </button>
        )}
      </main>

      <ActionSheet open={rejecting} testId="admin-reject-sheet" title={t.rejectTitle} cancelLabel={t.cancel} onCancel={() => setRejecting(false)}>
        <ul className="space-y-1">
          {t.rejectReasons.map((r) => (
            <li key={r}>
              <button
                type="button"
                onClick={() => {
                  setRejecting(false);
                  void decide({ kind: 'REJECT', reason: r });
                }}
                className="w-full min-h-[48px] px-1 text-left text-[15px] font-medium text-text-primary"
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      </ActionSheet>
    </div>
  );
}
