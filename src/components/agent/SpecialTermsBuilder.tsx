'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react';
import { SITE_CONTENT } from '@/config/siteContent';
import raw from '@/data/special-terms/terms.json';
import { loadApplication } from '@/lib/broker/application';
import { applyMarket, loadMarket } from '@/lib/broker/mockMarket';
import { REQUEST_SUMMARY_KEY } from '@/lib/requests/requestDraft';
import type { OwnerRequest } from '@/lib/requests/types';
import {
  AFTER_OPTIONS,
  NOW_OPTIONS,
  NO_ANSWERS,
  answersFromListing,
  applicableClauses,
  buildCopyText,
  buildProvisionalText,
  collectBlanks,
  addRecommended,
  toggleClause,
  fillClause,
  groupTopics,
  nextQuestion,
  provisionalItems,
  templateBlankItems,
  typeFromAnswers,
  type After,
  type Answers,
  type Clause,
  type NowLiving,
  type TermsData,
  type Trade,
} from '@/lib/broker/specialTerms';
import ActionSheet from '@/components/my-requests/ActionSheet';
import { fill, SECTION_COUNT } from '@/components/my-requests/format';
import { demoFeedRequests } from './mock-feed';
import TermsHero from './TermsHero';
import { AddRow, AnswerChips, SelectedRow, answerLabel, type Question } from './SpecialTermsParts';

const data = raw as unknown as TermsData;
const t = SITE_CONTENT.brokerTerms;
const tpl = t.provisionalTemplate;

type Kind = 'MAIN' | 'PROVISIONAL';

/** 이 휴대폰에만 저장 (Supabase 연결 시 계정으로). 이름·계좌·주소·빈칸 값은 저장하지 않는다 */
const LAST_KEY = 'bokbi_special_terms_last';
const FAV_KEY = 'bokbi_special_terms_favorites';

interface Saved {
  kind: Kind;
  answers: Answers;
  /** 고른 특약을 만든 유형 (상황이 바뀌면 기본 특약으로 다시 담는다) */
  typeCode: string;
  selected: string[];
  custom: string[];
  attached: boolean;
}
interface Favorites {
  ids: string[];
  custom: string[];
}

const readJson = <T,>(key: string): T | null => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const writeJson = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};

/** 엑셀에는 "[기본]잔금시 말소"와 "잔금시 말소"처럼 이름이 같은 변형이 있어 기본 문구에 표시를 붙인다 */
const variantName = (c: Clause) => (c.variant ? (c.isDefault ? `${c.variant} (${t.step3.defaultTag})` : c.variant) : c.topic);

/**
 * 복비 특약 만들기 (그릴링 2026-10-25 2차): ① 무엇을 → ② 상황(버튼) → ③ 특약 고르기(고른 특약 위·빼기, 주제 카드) → ④ 빈칸 채우고 복사
 * requestId: 매칭 매물에서 열면 거래·지금 사는 사람을 미리 답하고, 단지·동호수를 주소 칸 참고로만 보여 준다
 */
export default function SpecialTermsBuilder({ requestId }: { requestId: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [approved, setApproved] = useState(false);
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind>('MAIN');
  const [answers, setAnswers] = useState<Answers>(NO_ANSWERS);
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [attached, setAttached] = useState(false);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [address, setAddress] = useState('');
  const [favs, setFavs] = useState<Favorites>({ ids: [], custom: [] });
  const [writeText, setWriteText] = useState('');
  const [changeQ, setChangeQ] = useState<Question | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [last, setLast] = useState<Saved | null>(null);
  const [listing, setListing] = useState<OwnerRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setApproved(loadApplication()?.status === 'APPROVED');
    // 예전 저장 모양({ clauses })도 읽는다
    const f = readJson<Partial<Favorites> & { clauses?: string[] }>(FAV_KEY);
    setFavs({ ids: f?.ids ?? f?.clauses ?? [], custom: f?.custom ?? [] });
    setLast(requestId ? null : readJson<Saved>(LAST_KEY));
    if (requestId) {
      // 목업: 중개사 화면과 같은 저장소에서 그 의뢰를 찾는다 (Supabase 연결 시 서버가 매칭 확정된 의뢰만 내려 줌)
      let summary: Record<string, unknown> | null = null;
      try {
        const v = localStorage.getItem(REQUEST_SUMMARY_KEY);
        summary = v ? JSON.parse(v) : null;
      } catch {}
      const r = demoFeedRequests(new Date(), summary).map((x) => applyMarket(x, loadMarket())).find((x) => x.id === requestId) ?? null;
      setListing(r);
      if (r) setAnswers(answersFromListing(r.tradeType, r.occupancy));
    }
    setLoaded(true);
  }, [requestId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const type = typeCode ? data.types.find((x) => x.code === typeCode) ?? null : null;
  const pvItems = useMemo(() => (type ? provisionalItems(data, type) : []), [type]);
  const applicable = useMemo(() => (type ? applicableClauses(data, type.code) : []), [type]);
  const template = type ? tpl[type.trade] : [];

  // 저장: 특약 선택만
  useEffect(() => {
    if (loaded && typeCode) writeJson(LAST_KEY, { kind, answers, typeCode, selected, custom, attached } satisfies Saved);
  }, [loaded, kind, answers, typeCode, selected, custom, attached]);

  const saveFavs = (f: Favorites) => {
    setFavs(f);
    writeJson(FAV_KEY, f);
  };

  /** 상황이 정해지면: 유형이 바뀌었을 때 고른 특약을 비운다 (빈 상태로 시작, 직접 쓴 것·빈칸 값은 그대로) */
  const settle = (a: Answers, k: Kind) => {
    const code = typeFromAnswers(a);
    if (!code) return;
    if (code !== typeCode || k !== kind) setSelected([]);
    setTypeCode(code);
    setStep(3);
  };

  const answer = (q: Question, value: string) => {
    const next: Answers =
      q === 'trade' ? { trade: value as Trade, now: null, after: null } : q === 'now' ? { ...answers, now: value as NowLiving, after: null } : { ...answers, after: value as After };
    setAnswers(next);
    if (!nextQuestion(next)) settle(next, kind);
    else if (step !== 2) setStep(2);
  };

  // ── 고른 특약 ──
  const selectedClauses = applicable.filter((c) => selected.includes(c.id));
  const selectedPv = pvItems.filter((p) => selected.includes(p.id));
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));
  const addId = (id: string) => setSelected((s) => (s.includes(id) ? s : kind === 'MAIN' ? toggleClause(data, s, id) : [...s, id]));
  const toggleFav = (id: string) => saveFavs({ ...favs, ids: favs.ids.includes(id) ? favs.ids.filter((x) => x !== id) : [...favs.ids, id] });

  // ── 4단계 ──
  const blankItems = kind === 'MAIN' ? selectedClauses.map((c) => ({ id: c.id, text: c.text })) : [...templateBlankItems(template), ...selectedPv];
  const fields = collectBlanks(blankItems);
  const unfilled = fields.filter((f) => !fills[f.key]?.trim()).length;
  const finalText =
    !type
      ? ''
      : kind === 'MAIN'
        ? buildCopyText(data, { selected, fills, custom, attached })
        : buildProvisionalText({
            template,
            address,
            terms: [...selectedPv.map((p) => fillClause(p.id, p.text, fills)), ...custom],
            fills,
            termsHeader: tpl.termsHeader,
          });

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(finalText);
      ok = true;
    } catch {
      // 클립보드 권한이 막힌 브라우저: 숨긴 입력칸으로 복사
      const ta = document.createElement('textarea');
      ta.value = finalText;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {}
      document.body.removeChild(ta);
    }
    setToast(!ok ? t.step4.copyFailed : unfilled > 0 ? fill(t.step4.copiedWithBlanks, { b: unfilled }) : t.step4.copied);
  };

  if (!loaded) return null;
  if (!approved) {
    return (
      <main className="min-h-screen bg-surface-page px-5 pt-16 text-center">
        <p className="text-[17px] font-bold text-text-primary">{t.gate}</p>
        <Link href="/agent/register" className="mt-6 inline-flex h-13 px-6 items-center rounded-xl bg-brand text-white text-[17px] font-bold">
          {t.gateCta}
        </Link>
      </main>
    );
  }

  const q = nextQuestion(answers);
  const questions: Question[] = answers.trade === '전세' ? ['trade', 'now'] : ['trade', 'now', 'after'];
  const optionsFor = (qq: Question): string[] =>
    qq === 'trade' ? ['매매', '전세'] : qq === 'now' ? (answers.trade ? NOW_OPTIONS[answers.trade] : []) : answers.now === 'OWNER' || answers.now === 'TENANT' ? AFTER_OPTIONS[answers.now] : [];
  const optionLabel = (qq: Question, v: string) =>
    qq === 'trade' ? t.step2.trade[v as Trade] : qq === 'now' ? (answers.trade === '매매' && v === 'OWNER' ? t.step2.now.OWNER_SALE : t.step2.now[v as NowLiving]) : t.step2.after[v as After];
  const bigButton = 'w-full min-h-14 px-4 py-3 rounded-2xl bg-surface-card border border-border-default text-left text-[17px] font-bold text-text-primary active:scale-[0.99] transition-transform';
  const favPv = pvItems.filter((p) => favs.ids.includes(p.id) && !selected.includes(p.id));
  const favClauses = applicable.filter((c) => favs.ids.includes(c.id) && !selected.includes(c.id));
  const favCustom = favs.custom.filter((x) => !custom.includes(x));

  return (
    <div className="min-h-screen bg-surface-page text-text-primary">
      <div className="w-full max-w-md mx-auto min-h-screen px-4 pb-36">
        <header className="sticky top-0 z-30 -mx-4 px-2 h-14 flex items-center justify-between bg-surface-page">
          <div className="flex items-center min-w-0">
            {step === 1 ? (
              <Link href="/agent" aria-label={t.back} className="w-11 h-11 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" aria-hidden />
              </Link>
            ) : (
              <button type="button" aria-label={t.prev} onClick={() => setStep((s) => s - 1)} className="w-11 h-11 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" aria-hidden />
              </button>
            )}
            <h1 className="text-[17px] font-bold truncate">{t.title}</h1>
          </div>
        </header>
        {/* 단계 머리 카드: 제목 · 진행 동그라미 · 안내 · 내 상황 (A안 2026-10-27, 예전 막대·3/4·흩어진 안내를 합침) */}
        <TermsHero
          title={[t.step1.title, t.step2.title, t.step3.title, t.step4.title][step - 1]}
          step={step}
          situation={step >= 3 ? <AnswerChips questions={questions} answers={answers} onPick={(qq) => setChangeQ(qq)} /> : undefined}
        />

        {/* ① 무엇을 만들까요 */}
        {step === 1 && (
          <section className="mt-4 space-y-3" data-testid="terms-step1">
            {last && data.types.some((x) => x.code === last.typeCode) && (
              <button
                type="button"
                data-testid="terms-resume"
                onClick={() => {
                  setKind(last.kind);
                  setAnswers(last.answers);
                  setTypeCode(last.typeCode);
                  setSelected(last.selected);
                  setCustom(last.custom);
                  setAttached(last.attached);
                  setStep(3);
                }}
                className="w-full p-4 rounded-2xl bg-brand-light text-left flex items-center justify-between gap-2"
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold text-brand">{t.step1.resume}</span>
                  <span className="block text-[13px] font-medium text-text-secondary break-keep">
                    {fill(t.step1.resumeSub, {
                      kind: t.step1[last.kind].title,
                      situation: (['trade', 'now', 'after'] as Question[]).map((qq) => answerLabel(qq, last.answers)).filter(Boolean).join(' · '),
                      n: last.selected.length + last.custom.length,
                    })}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 text-brand shrink-0" aria-hidden />
              </button>
            )}
            {(['MAIN', 'PROVISIONAL'] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                data-testid={`terms-kind-${k}`}
                onClick={() => {
                  setKind(k);
                  setFills({});
                  if (!nextQuestion(answers)) settle(answers, k);
                  else setStep(2);
                }}
                className={bigButton}
              >
                <span className="block">{t.step1[k].title}</span>
                <span className="block text-[13px] font-medium text-text-tertiary">{t.step1[k].sub}</span>
              </button>
            ))}
          </section>
        )}

        {/* ② 어떤 상황인가요: 버튼으로 답하면 바로 다음 질문 */}
        {step === 2 && (
          <section className="mt-4 space-y-3" data-testid="terms-step2">
            <AnswerChips questions={questions} answers={answers} onPick={(qq) => setChangeQ(qq)} />
            {q && (
              <>
                <p className="pt-2 text-[17px] font-bold">{t.step2[q].q}</p>
                {optionsFor(q).map((v) => (
                  <button key={v} type="button" data-testid={`terms-answer-${v}`} onClick={() => answer(q, v)} className={bigButton}>
                    {optionLabel(q, v)}
                  </button>
                ))}
              </>
            )}
          </section>
        )}

        {/* ③ 특약 고르기 */}
        {step === 3 && type && (
          <section className="mt-4" data-testid="terms-step3">
            {/* 고른 특약: 제목 카드 밖 + 무채색 개수 칩, 오른쪽 끝 "전부 빼기" (2026-10-27) */}
            <div className="pt-1 px-1 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[17px] font-bold">
                {t.step3.selected}
                <span className={SECTION_COUNT}>{fill(t.step3.sectionCount, { n: selected.length + custom.length })}</span>
              </h3>
              {selected.length + custom.length > 0 && (
                <button type="button" data-testid="terms-clear-all" onClick={() => setClearOpen(true)} className="h-11 px-2 text-[13px] font-bold text-text-secondary">
                  {t.step3.clearAll}
                </button>
              )}
            </div>
            <ul className="mt-2 rounded-2xl bg-surface-card divide-y divide-border-light" data-testid="terms-selected">
              {selected.length + custom.length === 0 && <li className="p-4 text-[13px] font-medium text-text-tertiary">{t.step3.selectedEmpty}</li>}
              {(kind === 'MAIN'
                ? selectedClauses.map((c) => ({ id: c.id, title: c.variant ? `${c.topic} · ${variantName(c)}` : c.topic, text: c.text, recommended: c.required }))
                : selectedPv.map((p) => ({ id: p.id, title: '', text: p.text, recommended: false }))
              ).map((it, i) => (
                <SelectedRow
                  key={it.id}
                  n={i + 1}
                  title={it.title}
                  text={it.text}
                  recommended={it.recommended}
                  fav={favs.ids.includes(it.id)}
                  onFav={() => toggleFav(it.id)}
                  onRemove={() => remove(it.id)}
                />
              ))}
              {custom.map((txt, j) => (
                <SelectedRow
                  key={`c-${j}`}
                  n={(kind === 'MAIN' ? selectedClauses.length : selectedPv.length) + j + 1}
                  title={t.step3.custom}
                  text={txt}
                  recommended={false}
                  fav={favs.custom.includes(txt)}
                  onFav={() => saveFavs({ ...favs, custom: favs.custom.includes(txt) ? favs.custom.filter((x) => x !== txt) : [...favs.custom, txt] })}
                  onRemove={() => setCustom((cs) => cs.filter((_, x) => x !== j))}
                />
              ))}
            </ul>

            {/* 자주 쓰는 특약 (있을 때만) */}
            {favClauses.length + favPv.length + favCustom.length > 0 && (
              <>
                <h3 className="mt-5 text-[15px] font-bold flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-brand" aria-hidden />
                  {t.step3.favorites}
                </h3>
                <div className="mt-2 space-y-2">
                  {kind === 'MAIN' && favClauses.map((c) => <AddRow key={c.id} title={variantName(c)} text={c.text} onAdd={() => addId(c.id)} />)}
                  {kind === 'PROVISIONAL' && favPv.map((p) => <AddRow key={p.id} title="" text={p.text} onAdd={() => addId(p.id)} />)}
                  {favCustom.map((x) => (
                    <AddRow key={x} title={t.step3.custom} text={x} onAdd={() => setCustom((cs) => [...cs, x])} />
                  ))}
                </div>
              </>
            )}

            {/* 넣을 수 있는 특약 */}
            <h3 className="mt-6 px-1 text-[17px] font-bold">{kind === 'MAIN' ? t.step3.candidates : t.step3.provisionalCandidates}</h3>
            {kind === 'MAIN' && (
              <button
                type="button"
                data-testid="terms-add-recommended"
                onClick={() => setSelected((s) => addRecommended(data, type.code, s))}
                className="mt-2 w-full h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" aria-hidden />
                {t.step3.addRecommended}
              </button>
            )}
            {/* 큰 주제 + 작은 버튼: 누르면 위에 쌓이고 다시 누르면 빠진다. 같은 주제는 하나만 (자리 바꿈) */}
            <div className="mt-2 rounded-2xl bg-surface-card divide-y divide-border-light" data-testid="terms-candidates">
              {kind === 'MAIN' &&
                groupTopics(applicable).map((g) => (
                  <div key={g.key} className="px-4 py-3" data-testid="terms-topic">
                    <h4 className="text-[15px] font-bold break-keep">
                      {g.topic}
                      {g.clauses.some((c) => c.required) && <span className="ml-2 text-[12px] font-bold text-brand">{t.step3.recommendedTag}</span>}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {g.clauses.map((c) => {
                        const on = selected.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSelected((s) => toggleClause(data, s, c.id))}
                            className={`h-9 px-3 rounded-full text-[13px] font-bold inline-flex items-center gap-1 ${on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`}
                          >
                            {on && <Check className="w-3.5 h-3.5" aria-hidden />}
                            {c.variant ? variantName(c) : on ? t.step3.added : t.step3.add}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              {kind === 'PROVISIONAL' &&
                pvItems.map((p) => {
                  const on = selected.includes(p.id);
                  return (
                    <div key={p.id} className="px-4 py-3 flex items-start gap-2">
                      <p className="flex-1 min-w-0 text-[13px] leading-relaxed text-text-secondary break-keep">{p.text}</p>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => (on ? remove(p.id) : addId(p.id))}
                        className={`shrink-0 h-9 px-3 rounded-full text-[13px] font-bold inline-flex items-center gap-1 ${on ? 'bg-brand text-white' : 'bg-surface-subtle text-text-secondary'}`}
                      >
                        {on ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Plus className="w-3.5 h-3.5" aria-hidden />}
                        {on ? t.step3.added : t.step3.add}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* 직접 쓰기 */}
            <h3 className="mt-6 px-1 text-[17px] font-bold">{t.step3.write}</h3>
            <textarea
              value={writeText}
              onChange={(e) => setWriteText(e.target.value)}
              placeholder={t.step3.writePlaceholder}
              rows={3}
              data-testid="terms-write"
              className="mt-2 w-full p-3 rounded-xl bg-surface-card border border-border-default text-[15px] focus:outline-none focus:border-brand"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!writeText.trim()}
                onClick={() => {
                  setCustom((cs) => [...cs, writeText.trim()]);
                  setWriteText('');
                }}
                className="flex-1 h-12 rounded-xl bg-brand-light text-brand-hover text-[15px] font-bold disabled:opacity-40"
              >
                {t.step3.writeAdd}
              </button>
              <button
                type="button"
                disabled={!writeText.trim()}
                aria-label={t.step3.favoriteOn}
                onClick={() => saveFavs({ ...favs, custom: favs.custom.includes(writeText.trim()) ? favs.custom : [...favs.custom, writeText.trim()] })}
                className="w-12 h-12 rounded-xl bg-surface-card border border-border-default flex items-center justify-center disabled:opacity-40"
              >
                <Star className="w-5 h-5 text-text-tertiary" aria-hidden />
              </button>
            </div>
          </section>
        )}

        {/* ④ 빈칸 채우고 복사 */}
        {step === 4 && type && (
          <section className="mt-4" data-testid="terms-step4">

            {kind === 'PROVISIONAL' && (
              <div className="mt-4">
                <label className="block text-[13px] font-bold text-text-secondary break-keep" htmlFor="terms-address">
                  {t.step4.address}
                </label>
                <input
                  id="terms-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.step4.addressPlaceholder}
                  className="mt-2 w-full h-12 rounded-xl bg-surface-card border border-border-default px-4 text-[15px] font-bold focus:outline-none focus:border-brand"
                />
                {/* 우리 정보는 참고로만 (자동으로 넣지 않음) */}
                {listing && (listing.stage === 'IN_PROGRESS' || listing.stage === 'CONTRACTED') && (
                  <p className="mt-1 text-[12px] font-medium text-text-tertiary">{fill(t.step4.addressRef, { ref: `${listing.complexName} ${listing.dongHo}` })}</p>
                )}
              </div>
            )}

            <h3 className="mt-5 text-[15px] font-bold">{fields.length ? fill(t.step4.blanksTitle, { n: fields.length }) : t.step4.noBlanks}</h3>
            {fields.length > 0 && <p className="mt-1 text-[12px] font-medium text-text-tertiary">{t.step4.blanksSub}</p>}
            <div className="mt-2 space-y-2" data-testid="terms-fields">
              {fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="block text-[12px] font-medium text-text-secondary break-keep">{f.label || f.original}</span>
                  <input
                    value={fills[f.key] ?? ''}
                    onChange={(e) => setFills((m) => ({ ...m, [f.key]: e.target.value }))}
                    placeholder={t.step4.placeholder[f.kind]}
                    className={`mt-1 w-full h-11 rounded-xl border px-3 text-[15px] font-bold focus:outline-none focus:border-brand ${
                      fills[f.key]?.trim() ? 'bg-surface-card border-border-default' : 'bg-status-caution-light border-transparent'
                    }`}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[12px] font-medium text-text-tertiary">{t.step4.notSaved}</p>

            {kind === 'MAIN' && (
              <label className="mt-3 min-h-11 px-1 flex items-center gap-2 text-[13px] font-medium text-text-secondary">
                <input type="checkbox" checked={attached} onChange={(e) => setAttached(e.target.checked)} className="w-5 h-5 accent-brand" />
                {t.step4.attached}
              </label>
            )}

            <h3 className="mt-5 text-[15px] font-bold">{t.step4.preview}</h3>
            <pre className="mt-2 p-4 rounded-2xl bg-surface-card text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap break-keep font-sans select-all" data-testid="terms-preview">
              {finalText}
            </pre>
          </section>
        )}
      </div>

      {/* 하단 고정: 3단계 다음 / 4단계 복사 */}
      {(step === 3 || step === 4) && type && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="max-w-md mx-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] bg-surface-page">
            {step === 4 && <p className="mb-2 text-[12px] font-medium text-text-tertiary break-keep text-pretty">{t.notice}</p>}
            {step === 3 ? (
              <button type="button" data-testid="terms-next" onClick={() => setStep(4)} className="w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold">
                {t.step3.next}
              </button>
            ) : (
              <button type="button" data-testid="terms-copy" onClick={copy} className="w-full h-13 rounded-xl bg-brand text-white text-[17px] font-bold">
                {t.step4.copy}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 고른 특약 전부 빼기 확인 (빈칸 값도 같이 지워져 되돌리기 어려움) */}
      <ActionSheet
        open={clearOpen}
        testId="terms-clear-sheet"
        tone="risk"
        title={fill(t.step3.clearSheet.title, { n: selected.length + custom.length })}
        confirmLabel={t.step3.clearSheet.confirm}
        cancelLabel={t.step3.clearSheet.cancel}
        onConfirm={() => {
          setSelected([]);
          setCustom([]);
          setFills({});
          setClearOpen(false);
        }}
        onCancel={() => setClearOpen(false)}
      >
        <p className="text-[15px] font-medium text-text-secondary">{t.step3.clearSheet.body}</p>
      </ActionSheet>

      {/* 상황 칩 바꾸기 */}
      {changeQ && (
        <ActionSheet open testId="terms-change-sheet" title={t.step2[changeQ].q} cancelLabel={t.step3.changeSheet.cancel} onCancel={() => setChangeQ(null)}>
          <div className="space-y-2">
            {optionsFor(changeQ).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setChangeQ(null);
                  answer(changeQ, v);
                }}
                className={`${bigButton} ${
                  (changeQ === 'trade' ? answers.trade : changeQ === 'now' ? answers.now : answers.after) === v ? 'border-brand bg-brand-light' : ''
                }`}
              >
                {optionLabel(changeQ, v)}
              </button>
            ))}
          </div>
        </ActionSheet>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-28 z-50 px-4 pointer-events-none" role="status">
          <p className="max-w-md mx-auto px-4 py-3 rounded-xl bg-text-primary text-surface-card text-[13px] font-bold text-center break-keep">{toast}</p>
        </div>
      )}
    </div>
  );
}

