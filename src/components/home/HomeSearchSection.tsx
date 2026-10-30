'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Building2, ArrowRight, Lock, Search } from 'lucide-react';
import { formatPriceTenThousand } from '@/lib/utils';
import { track } from '@/lib/analytics/store';
import { SITE_CONTENT } from '@/config/siteContent';
import HomeGuideSheet from './HomeGuideSheet';
import HomeResumeRow from './HomeResumeRow';

// ─── 초성 검색 유틸 ────────────────────────────────────────────────────────────
const CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
];
function getChosung(str: string): string {
  return [...str].map((ch) => {
    const code = ch.charCodeAt(0) - 44032;
    return code >= 0 && code <= 11171 ? CHOSUNG[Math.floor(code / 588)] : ch;
  }).join('');
}
function isPureChosung(str: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(str.replace(/\s+/g, ''));
}

/** 결과 없음이 이만큼 그대로면 "못 찾음" 기록 */
const NO_RESULT_MS = 2000;

const QUICK_TAGS = [
  { label: '다산자이 아이비', word: '다산자이아이비' },
  { label: '힐스테이트 다산', word: '힐스테이트다산' },
  { label: '다산 푸르지오', word: '다산푸르지오' },
  { label: '다산e편한세상자이', word: '다산e편한세상자이' },
  { label: '다산 롯데캐슬', word: '다산롯데캐슬' },
];

/** 검색 목록 항목 (서버에서 실데이터 58개 단지로 내려준다) */
export interface SearchComplex {
  id: number;
  apt_name: string;
  pyeong_type: string;
  total_households: number;
  built_year?: number;
  recent_avg_price: number;
  aliases?: string[];
}

export default function HomeSearchSection({ complexes }: { complexes: SearchComplex[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 검색 필터링
  const searchResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return [];
    const cleanQuery = raw.replace(/\s+/g, '').toLowerCase();
    const isChosung = isPureChosung(raw.replace(/\s+/g, ''));

    return complexes.filter((apt) => {
      const cleanName = apt.apt_name.replace(/\s+/g, '').toLowerCase();
      if (cleanName.includes(cleanQuery)) return true;
      if (apt.aliases?.some((a) => a.replace(/\s+/g, '').toLowerCase().includes(cleanQuery))) return true;
      if (isChosung) {
        if (getChosung(cleanName).includes(cleanQuery)) return true;
        if (apt.aliases?.some((a) => getChosung(a.replace(/\s+/g, '')).includes(cleanQuery))) return true;
      }
      return false;
    }).slice(0, 7);
  }, [searchQuery, complexes]);

  // 행동 기록 (A7, 대표님 2026-10-29): 고른 단지 번호 또는 "못 찾음"만 — 검색어 원문은 남기지 않음
  const go = (apt: SearchComplex) => {
    track('complex_search', { found: true, complexId: String(apt.id) });
    router.push(`/analysis/${apt.id}`);
  };
  const noResultLogged = useRef<string | null>(null);
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || searchResults.length > 0 || noResultLogged.current === q) return;
    // 입력을 멈추고 결과 없음이 그대로일 때 한 번
    const timer = setTimeout(() => {
      noResultLogged.current = q;
      track('complex_search', { found: false });
    }, NO_RESULT_MS);
    return () => clearTimeout(timer);
  }, [searchQuery, searchResults.length]);

  const handleSelect = (apt: SearchComplex) => go(apt);

  const handleQuickTag = (word: string) => {
    setSearchQuery(word);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) {
      inputRef.current?.focus();
      return;
    }
    if (searchResults.length > 0) go(searchResults[0]);
  };

  return (
    <section className="relative">
      <div className="relative">
        {/* 명패 검색창 (헤이딜러 번호판 입력처럼 굵은 테두리·큰 글씨, 대표님 2026-10-28 A안) */}
        <form
          onSubmit={handleSearchSubmit}
          className={`lab-plate w-full h-[60px] rounded-2xl bg-surface-card flex items-center px-4 gap-3 transition-all duration-200 border-2 samjeom:h-13 samjeom:rounded-xl samjeom:ring-0 heydealer:h-16 heydealer:px-8 heydealer:ring-0 ${
            isFocused ? 'border-brand ring-4 ring-brand-glow' : 'border-text-primary samjeom:border-transparent samjeom:bg-surface-subtle'
          }`}
        >
          {/* 검색창임을 바로 알게 파랑 돋보기 (대표님 2026-10-29) */}
          <Search className="w-5 h-5 flex-shrink-0 text-brand" aria-hidden />
          <input
            ref={inputRef}
            id="home-search-input"
            type="text"
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={SITE_CONTENT.home.search.placeholder}
            className="w-full h-full bg-transparent text-[17px] heydealer:text-[20px] font-bold text-text-primary placeholder:text-text-disabled placeholder:font-medium focus:outline-none min-w-0"
            autoComplete="off"
            aria-label={SITE_CONTENT.home.search.placeholder}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-surface-subtle flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              aria-label="지우기"
            >
              <X className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-text-tertiary" />
            </button>
          )}
        </form>

        {/* 검색 결과 드롭다운: 검색창 바로 아래(top-full mt-2)에 완벽하게 분리되어 노출 */}
        {searchQuery && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-full mt-2 left-0 right-0 bg-surface-card rounded-2xl border border-border-default shadow-[0_12px_36px_rgba(0,0,0,0.12)] overflow-hidden z-30 divide-y divide-border-light max-h-[360px] overflow-y-auto"
          >
            {searchResults.length > 0 ? (
              searchResults.map((apt) => (
                <button
                  key={apt.id}
                  type="button"
                  onClick={() => handleSelect(apt)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-subtle active:bg-brand-light transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-brand" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] sm:text-[15px] font-bold text-text-primary truncate">
                        {apt.apt_name}
                      </div>
                      <div className="text-[12px] sm:text-[12px] font-medium text-text-tertiary mt-1 truncate">
                        {apt.pyeong_type} · {apt.total_households.toLocaleString()}세대{apt.built_year ? ` · ${apt.built_year}년` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[13px] sm:text-[13px] font-extrabold text-brand">
                        {apt.recent_avg_price > 0 ? formatPriceTenThousand(apt.recent_avg_price) : '—'}
                      </div>
                      <div className="text-[12px] text-text-tertiary font-medium">최근 6개월 실거래 중위</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-disabled" />
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-[13px] font-medium text-text-tertiary">'{searchQuery}' 단지를 찾을 수 없어요.</p>
                <p className="text-[12px] text-text-disabled mt-1">{SITE_CONTENT.home.search.emptyResultText}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 추천 빠른 태그: 검색창을 누를 때만 펼침 (대표님 채택 2026-10-27 "검색창 하나만 또렷하게") */}
      {isFocused && !searchQuery && (
        <div className="flex flex-wrap gap-2 mt-3 animate-rise-in" data-testid="home-quick-tags" onMouseDown={(e) => e.preventDefault()}>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => handleQuickTag(tag.word)}
              className="h-9 px-4 rounded-full bg-surface-card border border-border-default text-[13px] font-medium text-text-secondary hover:border-brand-line-strong hover:text-brand active:scale-95 transition-all"
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {/* 큰 주 버튼은 바닥 플로팅으로 옮김 (HomeFloatingCta, 대표님 2026-10-29 A안: 단지를 고르면 바로 분석으로 간다) */}

      {/* 안심 한 줄 + 처음 쓰는 사람용 이용 방법 (저절로 뜨지 않음) */}
      <div className="mt-3 px-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-text-tertiary min-w-0">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          <span className="truncate">{SITE_CONTENT.home.hero.safeNote}</span>
        </span>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          data-testid="home-guide-open"
          className="h-11 -my-2 flex-shrink-0 whitespace-nowrap text-[13px] font-bold text-brand underline underline-offset-4 decoration-brand-line-strong"
        >
          {SITE_CONTENT.home.hero.guideLink}
        </button>
      </div>

      <HomeResumeRow complexes={complexes} />

      <HomeGuideSheet
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onDone={() => {
          setGuideOpen(false);
          inputRef.current?.focus();
        }}
      />
    </section>
  );
}
