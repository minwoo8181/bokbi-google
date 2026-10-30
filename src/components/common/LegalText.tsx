import React from 'react';
import { COMPANY_INFO, COMPANY_TOKENS, SITE_CONTENT, type CompanyTokenKey, type LegalBlock } from '@/config/siteContent';

const TOKEN = /\{company\.([A-Za-z]+)\}/g;
const pending = new Set<string>(COMPANY_INFO.pendingFields);

/** {company.키}를 실제 값으로 바꾼 순수 문자열 (aria-label, 테스트용) */
export function resolveCompanyTokens(text: string): string {
  return text.replace(TOKEN, (m, key: string) => (key in COMPANY_TOKENS ? COMPANY_TOKENS[key as CompanyTokenKey] : m));
}

/** 배포 전 교체 항목이 남아 있는지 (초안 고지 표시용) */
export const hasPendingCompanyFields = COMPANY_INFO.pendingFields.length > 0;

/**
 * 문구 속 {company.키}를 치환해 렌더링한다. pendingFields에 남은 값은 빨간 글씨 + "수정 필요" 배지로 표시해
 * 배포 전에 바꿔야 할 자리를 화면에서 바로 찾을 수 있게 한다 (대표님 지시 2026-10-24)
 */
export default function LegalText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const key = m[1];
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const value = key in COMPANY_TOKENS ? COMPANY_TOKENS[key as CompanyTokenKey] : m[0];
    parts.push(
      pending.has(key) ? (
        <span key={idx} className="text-[var(--status-risk-strong)] font-bold">
          {value}
          <span className="ml-1 align-middle inline-block px-1 rounded bg-status-risk-light text-[12px] font-bold leading-4 whitespace-nowrap">
            {SITE_CONTENT.home.footer.pendingBadge}
          </span>
        </span>
      ) : (
        value
      ),
    );
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * 법적 고지 본문 블록 렌더러. 목록은 두 번째 줄부터 들여쓰기(hanging indent),
 * 표는 360px에서도 가로 스크롤 없이 항목별 카드(라벨: 값)로 보여준다
 */
export function LegalBlocks({ blocks }: { blocks: readonly LegalBlock[] }) {
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if ('p' in b) {
          return (
            <p key={i} className="break-keep">
              <LegalText text={b.p} />
            </p>
          );
        }
        if ('ul' in b) {
          return (
            <ul key={i} className="space-y-1">
              {b.ul.map((item, j) => (
                <li key={j} className="relative pl-4 break-keep">
                  <span aria-hidden className="absolute left-0 top-[0.6em] w-1 h-1 rounded-full bg-text-tertiary" />
                  <LegalText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        const { head, rows } = b.table;
        return (
          <div key={i} className="space-y-2">
            {rows.map((row, r) => (
              <dl key={r} className="rounded-lg bg-surface-subtle border border-border-light px-3 py-2 space-y-1">
                <dt className="font-bold text-text-primary break-keep">
                  <LegalText text={row[0]} />
                </dt>
                {row.slice(1).map((cell, c) => (
                  <dd key={c} className="grid grid-cols-[4.5rem_1fr] gap-x-2 break-keep">
                    <span className="text-text-tertiary">{head[c + 1]}</span>
                    <span>
                      <LegalText text={cell} />
                    </span>
                  </dd>
                ))}
              </dl>
            ))}
          </div>
        );
      })}
    </div>
  );
}
