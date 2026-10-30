'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, formatDateKo, toDateKey } from '@/components/my-requests/format';
import { addInquiry, BODY_MAX, BODY_MIN, INQUIRY_TOPICS, inquiriesOf, type InquiryError, type InquiryRole, type InquiryTopic } from '@/lib/support/inquiries';
import { track } from '@/lib/analytics/store';
import { loadInquiries, saveInquiries } from './inquiryStore';

const t = SITE_CONTENT.support;
const eventRole = (role: InquiryRole) => (role === 'BROKER' ? 'broker' : 'owner');
const dateOf = (iso: string) => formatDateKo(toDateKey(new Date(iso)));

/** 자주 묻는 질문: 처음엔 3개만, "질문 n개 더 보기"로 펼침. 질문을 누르면 답이 열림 */
function Faq({ role }: { role: InquiryRole }) {
  const all = t.faq[role];
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const shown = more ? all : all.slice(0, t.faqShown);
  return (
    <section data-testid="faq">
      <h3 className="text-[15px] font-bold text-text-primary">{t.faqTitle}</h3>
      <ul className="mt-2 rounded-2xl border border-border-default overflow-hidden">
        {shown.map((f, i) => (
          <li key={f.q} className="border-t border-border-light first:border-t-0">
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => {
                // 행동 기록 (A7): 펼친 질문 번호만 (예: owner-3)
                if (open !== i) track('faq_view', { faqId: `${role.toLowerCase()}-${i + 1}` }, { role: eventRole(role) });
                setOpen(open === i ? null : i);
              }}
              data-testid="faq-q"
              className="w-full min-h-12 px-4 py-3 flex items-center justify-between gap-3 text-left text-[15px] font-medium text-text-primary"
            >
              <span className="min-w-0 break-keep text-pretty">{f.q}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-text-tertiary transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open === i && <p className="px-4 pb-4 text-[13px] font-medium leading-relaxed text-text-secondary break-keep text-pretty">{f.a}</p>}
          </li>
        ))}
      </ul>
      {all.length > t.faqShown && (
        <button type="button" onClick={() => setMore((v) => !v)} data-testid="faq-more" className="mt-1 h-11 px-1 text-[15px] font-bold text-brand">
          {more ? t.faqLess : fill(t.faqMore, { n: all.length - t.faqShown })}
        </button>
      )}
    </section>
  );
}

/**
 * 문의하기 시트 (대표님 2026-10-29): 자주 묻는 질문 → 내 문의(답) → 양식(어떤 일 · 같이 보내는 의뢰 · 내용) → 보내기.
 * phone = 본인 확인한 휴대폰(집주인 의뢰·중개사 가입). 없으면 보내기 대신 안내
 */
export default function InquirySheet({
  role,
  phone,
  request,
  initialTopic = 'REQUEST',
  onClose,
}: {
  role: InquiryRole;
  phone: string;
  request: { id: string; label: string } | null;
  initialTopic?: InquiryTopic;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState<InquiryTopic>(initialTopic);
  const [body, setBody] = useState('');
  const [error, setError] = useState<InquiryError | null>(null);
  const [sent, setSent] = useState(false);
  const [list, setList] = useState(loadInquiries);
  const mine = useMemo(() => inquiriesOf(list, phone), [list, phone]);

  const send = () => {
    const r = addInquiry(list, { role, topic, requestId: request?.id ?? null, requestLabel: request?.label ?? null, phone, body }, new Date());
    if (!r.ok) return setError(r.error);
    saveInquiries(r.list);
    // 행동 기록 (A7): 주제만, 내용·전화는 남기지 않음
    track('inquiry_send', { topic }, { requestId: request?.id ?? null, role: eventRole(role) });
    setList(r.list);
    setBody('');
    setError(null);
    setSent(true);
  };

  const labels = INQUIRY_TOPICS.map((k) => t.topics[k]);

  return (
    <ActionSheet open testId="inquiry-sheet" title={t.title} cancelLabel={t.close} onCancel={onClose} confirmLabel={t.send} onConfirm={send} confirmDisabled={body.trim().length < BODY_MIN}>
      <div className="space-y-6">
        <Faq role={role} />

        {mine.length > 0 && (
          <section data-testid="inquiry-mine">
            <h3 className="text-[15px] font-bold text-text-primary">{t.mineTitle}</h3>
            <ul className="mt-2 space-y-2">
              {mine.map((q) => (
                <li key={q.id} className="p-4 rounded-2xl bg-surface-page">
                  <p className="text-[12px] font-bold text-text-tertiary">
                    {t.topics[q.topic]} · {dateOf(q.at)}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-text-primary break-keep text-pretty whitespace-pre-line">{q.body}</p>
                  {q.answer ? (
                    <div className="mt-2 pt-2 border-t border-border-default">
                      <p className="text-[12px] font-bold text-brand-hover">{t.mineAnswer}</p>
                      <p className="mt-1 text-[13px] font-medium text-text-primary break-keep text-pretty whitespace-pre-line">{q.answer.body}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[12px] font-medium text-text-tertiary">{fill(t.mineWaiting, { date: dateOf(q.dueAt) })}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-4" data-testid="inquiry-form">
          <h3 className="text-[15px] font-bold text-text-primary">{t.formTitle}</h3>
          <div>
            <p className="mb-2 text-[13px] font-bold text-text-secondary">{t.topicTitle}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {INQUIRY_TOPICS.map((k, i) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={topic === k}
                  onClick={() => setTopic(k)}
                  className={`h-11 px-4 rounded-xl text-[13px] font-bold ${topic === k ? 'border-2 border-brand bg-brand-subtle text-brand-hover' : 'border border-border-default bg-surface-card text-text-primary'}`}
                >
                  {labels[i]}
                </button>
              ))}
            </div>
          </div>
          {request && (
            <div className="p-3 rounded-xl bg-surface-page">
              <p className="text-[12px] font-medium text-text-tertiary">{t.attached}</p>
              <p className="mt-1 text-[15px] font-bold text-text-primary break-keep">
                {request.label} · {request.id}
              </p>
            </div>
          )}
          <label className="block">
            <span className="flex justify-between text-[13px] font-bold text-text-secondary">
              {t.bodyLabel}
              <span className="font-medium text-text-tertiary tabular-nums">{fill(t.bodyCount, { n: body.trim().length, max: BODY_MAX })}</span>
            </span>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value.slice(0, BODY_MAX + 50));
                setSent(false);
              }}
              rows={4}
              placeholder={t.bodyPlaceholder}
              data-testid="inquiry-body"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-border-default bg-surface-card text-[15px] text-text-primary placeholder:text-text-tertiary resize-none"
            />
          </label>
          {error && (
            <p role="alert" className="text-[13px] font-bold text-[var(--status-risk-strong)] break-keep">
              {fill(t.errors[error], { min: BODY_MIN, max: BODY_MAX })}
            </p>
          )}
          {sent && (
            <p role="status" data-testid="inquiry-sent" className="text-[13px] font-bold text-[var(--status-good-strong)] break-keep">
              {t.sent}
            </p>
          )}
          <p className="text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.note}</p>
        </section>
      </div>
    </ActionSheet>
  );
}
