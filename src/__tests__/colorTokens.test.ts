/**
 * 색 토큰에 투명도(/30 등)를 붙이지 않는다 (2026-10-27)
 * 우리 색은 var(--brand-primary) 같은 변수라 Tailwind가 /숫자를 못 붙이고 조용히 무시한다 → 코드엔 연한 파랑인데 화면은 회색·투명.
 * 연한 색이 필요하면 토큰을 쓴다: brand-subtle·brand-light(배경), brand-line·brand-line-strong(테두리), shadow-brand-glow, status-caution-line
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const OPACITY = /(?<=^|[\s'"`:])(?:bg|text|border|ring|shadow|outline|fill|stroke|from|to|via|divide|placeholder|decoration|accent|caret)-(?:brand|surface|text|border|status|toss)[a-z-]*\/\d+(?=$|[\s'"`])/gm;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(p);
    return /\.(tsx|ts)$/.test(e.name) ? [p] : [];
  });
}

describe('색 토큰', () => {
  it('변수 색에 /숫자 투명도를 붙이지 않음 (화면에 안 그려짐)', () => {
    const found = sourceFiles(SRC).flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(OPACITY)].map((m) => `${path.relative(SRC, f).split(path.sep).join('/')}: ${m[0]}`),
    );
    expect(found, '연한 색 토큰으로 바꿔 주세요 (brand-line, brand-subtle 등)').toEqual([]);
  });
});
