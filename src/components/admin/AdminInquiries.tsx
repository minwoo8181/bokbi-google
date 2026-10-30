'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import { maskPhone } from '@/lib/privacy/myInfo';
import { splitInquiries, type Inquiry } from '@/lib/support/inquiries';
import { deadlineLeft, todayItems } from '@/lib/admin/today';
import { fill } from '@/components/my-requests/format';
import { kstLabel } from './AdminReportsTab';
import type { AdminData } from './useAdminData';

const t = SITE_CONTENT.adminConsole.requestsTab;
const q = t.inquiries;
const topics = SITE_CONTENT.support.topics;
const today = SITE_CONTENT.adminConsole.today;

function Row({ item, now, onOpen }: { item: Inquiry; now: number; onOpen: () => void }) {
  // 남은 날은 오늘 할 일과 같은 계산 (todayItems → deadlineLeft)
  const left = item.answer ? null : deadlineLeft(todayItems({ application: null, requests: [], deals: {}, log: [], now: new Date(now), inquiries: [item] })[0]);
  return (
    <li className="border-t border-border-light first:border-t-0">
      <button type="button" onClick={onOpen} data-testid="admin-inquiry-row" className="w-full min-h-16 px-5 py-3 flex items-center gap-3 text-left active:bg-surface-subtle">
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-text-secondary">
            {q.role[item.role]} · {topics[item.topic]}
          </span>
          <span className="block text-[15px] font-bold text-text-primary truncate">{item.body}</span>
          <span className="block text-[12px] font-medium text-text-tertiary tabular-nums">
            {item.answer ? fill(q.answeredAt, { date: kstLabel(item.answer.at) }) : fill(q.received, { date: kstLabel(item.at) })}
          </span>
        </span>
        {left && (
          <span className={`shrink-0 px-2 py-1 rounded-lg text-[12px] font-bold ${left.n === 0 ? 'bg-status-risk-light text-[var(--status-risk-strong)]' : 'bg-surface-page text-text-secondary'}`}>
            {fill(today.daysLeft, { n: left.n })}
          </span>
        )}
        <ChevronRight className="w-5 h-5 shrink-0 text-text-tertiary" aria-hidden />
      </button>
    </li>
  );
}

function Detail({ item, data, onBack }: { item: Inquiry; data: AdminData; onBack: () => void }) {
  const [body, setBody] = useState('');
  return (
    <section className="space-y-3" data-testid="admin-inquiry-detail">
      <button type="button" onClick={onBack} className="-ml-2 h-11 px-2 inline-flex items-center gap-1 text-[15px] font-bold text-text-secondary">
        <ChevronLeft className="w-5 h-5" aria-hidden />
        {t.back}
      </button>
      <article className="p-5 rounded-3xl bg-surface-card space-y-3">
        <p className="text-[12px] font-medium text-text-tertiary tabular-nums">
          {kstLabel(item.at)} · {q.role[item.role]} {maskPhone(item.phone)} · {topics[item.topic]}
        </p>
        <p className="p-3 rounded-xl bg-surface-page text-[15px] font-medium text-text-primary leading-relaxed break-keep text-pretty whitespace-pre-line">{item.body}</p>
        {item.requestLabel && (
          <p className="text-[13px] font-medium text-text-secondary">
            {item.requestLabel} · {item.requestId}
          </p>
        )}
        {item.answer ? (
          <div className="pt-3 border-t border-border-light">
            <p className="text-[12px] font-bold text-brand-hover">{fill(q.answeredAt, { date: kstLabel(item.answer.at) })}</p>
            <p className="mt-1 text-[15px] font-medium text-text-primary break-keep text-pretty whitespace-pre-line">{item.answer.body}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[13px] font-bold text-text-secondary">{q.quickTitle}</p>
              <div className="flex flex-wrap gap-2">
                {q.quick.map((a) => (
                  <button key={a} type="button" onClick={() => setBody(a)} className="min-h-11 px-3 py-2 rounded-xl border border-border-default bg-surface-card text-[13px] font-bold text-text-primary text-left break-keep">
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-[13px] font-bold text-text-secondary">{q.answerLabel}</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                data-testid="admin-inquiry-answer"
                className="mt-2 w-full px-4 py-3 rounded-xl border border-border-default bg-surface-card text-[15px] text-text-primary resize-none"
              />
            </label>
            <button
              type="button"
              disabled={!body.trim()}
              onClick={() => data.answer(item.id, body)}
              data-testid="admin-inquiry-send"
              className="w-full h-12 rounded-xl bg-brand text-white text-[15px] font-bold disabled:bg-border-default disabled:text-text-tertiary"
            >
              {q.send}
            </button>
            <p className="text-[12px] font-medium text-text-tertiary break-keep">{q.sendNote}</p>
          </div>
        )}
      </article>
    </section>
  );
}

/** 의뢰 탭 "문의": 답할 문의(오래된 것부터, 남은 날) → 답한 문의. 누르면 원문 + 자주 쓰는 답 + 답변 보내기 (한 번만) */
export default function AdminInquiries({ data }: { data: AdminData }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? data.inquiries.find((i) => i.id === openId) ?? null : null;
  if (open) return <Detail item={open} data={data} onBack={() => setOpenId(null)} />;
  const { open: waiting, answered } = splitInquiries(data.inquiries);
  if (waiting.length + answered.length === 0) return <p className="py-12 text-center text-[15px] font-medium text-text-secondary">{t.inquiriesEmpty}</p>;
  return (
    <div className="space-y-4" data-testid="admin-inquiries">
      {(
        [
          [q.openTitle, waiting],
          [q.answeredTitle, answered],
        ] as const
      ).map(([title, rows]) =>
        rows.length ? (
          <section key={title}>
            <h2 className="mb-2 text-[15px] font-bold text-text-secondary">
              {title} <span className="text-brand">{rows.length}</span>
            </h2>
            <ul className="rounded-3xl bg-surface-card overflow-hidden">
              {rows.map((r) => (
                <Row key={r.id} item={r} now={data.now} onOpen={() => setOpenId(r.id)} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
