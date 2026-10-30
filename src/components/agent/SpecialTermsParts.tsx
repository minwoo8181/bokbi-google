'use client';

/** 복비 특약 만들기 화면 조각: 상황 알약 · 고른 특약 한 줄 · 자주 쓰는 특약 넣기 줄 (SpecialTermsBuilder에서 분리) */
import React from 'react';
import { ChevronRight, Plus, Star } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import type { Answers } from '@/lib/broker/specialTerms';

const t = SITE_CONTENT.brokerTerms;

export type Question = 'trade' | 'now' | 'after';

export const answerLabel = (q: Question, a: Answers): string => {
  if (q === 'trade') return a.trade ? t.step2.trade[a.trade] : '';
  if (q === 'now') return a.now ? (a.trade === '매매' && a.now === 'OWNER' ? t.step2.now.OWNER_SALE : t.step2.now[a.now]) : '';
  return a.after ? t.step2.after[a.after] : '';
};

/** 지금까지 고른 상황: 누르면 그 질문만 바꾸기. 무채색 알약 + › (색은 아래 주 버튼에만, 2026-10-27) */
export function AnswerChips({ questions, answers, onPick }: { questions: Question[]; answers: Answers; onPick: (q: Question) => void }) {
  const answered = questions.filter((q) => answerLabel(q, answers));
  if (answered.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="terms-answer-chips">
      {answered.map((q) => (
        <button key={q} type="button" onClick={() => onPick(q)} className="h-9 px-3 rounded-full bg-surface-subtle text-text-primary text-[13px] font-bold inline-flex items-center gap-1">
          {answerLabel(q, answers)}
          <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** 고른 특약 한 줄: 전문은 여기서 읽는다 (아래 주제 쪽은 짧은 이름 버튼만). 빼기는 확인 없이 바로 */
export function SelectedRow(props: { n: number; title: string; text: string; recommended: boolean; fav: boolean; onFav: () => void; onRemove: () => void }) {
  const { n, title, text, recommended, fav, onFav, onRemove } = props;
  return (
    <li className="pl-4 pr-2 py-3 flex items-start gap-2" data-testid="terms-row">
      <span className="shrink-0 w-6 text-[13px] font-bold text-text-tertiary tabular-nums">{n}.</span>
      <span className="flex-1 min-w-0">
        {title && (
          <span className="block text-[13px] font-bold text-text-primary break-keep">
            {title}
            {recommended && <span className="ml-2 text-[12px] font-bold text-brand">{t.step3.recommendedTag}</span>}
          </span>
        )}
        <span className="block text-[13px] leading-relaxed text-text-secondary break-keep">{text}</span>
      </span>
      <span className="shrink-0 flex flex-col items-end gap-1">
        <button type="button" onClick={onRemove} className="h-10 px-3 rounded-lg bg-surface-subtle text-[13px] font-bold text-text-secondary">
          {t.step3.remove}
        </button>
        <button type="button" onClick={onFav} aria-pressed={fav} aria-label={fav ? t.step3.favoriteOff : t.step3.favoriteOn} className="w-10 h-10 flex items-center justify-center">
          <Star className={`w-5 h-5 ${fav ? 'fill-current text-brand' : 'text-text-tertiary'}`} aria-hidden />
        </button>
      </span>
    </li>
  );
}

export function AddRow({ title, text, onAdd }: { title: string; text: string; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} className="w-full p-3 rounded-xl bg-surface-card text-left flex items-start gap-2">
      <Plus className="w-4 h-4 mt-1 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0">
        {title && <span className="block text-[13px] font-bold text-text-primary">{title}</span>}
        <span className="block text-[12px] font-medium text-text-secondary line-clamp-2 break-keep">{text}</span>
      </span>
    </button>
  );
}
