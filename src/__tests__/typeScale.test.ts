/**
 * 글자 크기 7단계 + 간격 4의 배수 (대표님 2026-10-29 A안 "항상 디자인은 통일성 있게")
 * 크기: 12 캡션 · 13 작은 글 · 15 본문 · 17 카드 제목 · 20 섹션·화면 제목 · 26 큰 제목·금액 · 40 홈·분석 큰 금액
 * 간격: p·m·gap·space에 0.5·1.5·2.5·3.5(2·6·10·14px)를 쓰지 않는다. 그래프 막대 사이 2px 틈(gap-0.5)만 예외
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const SCALE = new Set(['12', '13', '15', '17', '20', '26', '40']);
const TEXT_PX = /text-\[(\d+(?:\.\d+)?)px\]/g;
const NAMED = /(?<![\w-])text-(xs|sm|base|lg|xl|2xl|3xl)(?![\w-])/g;
const HALF_SPACE = /(?<![\w[-])-?(?:[a-z]+:)*(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?:0\.5|1\.5|2\.5|3\.5)(?![\w.])/g;
/** 데이터 그래프 막대 사이 2px 틈 (dataviz 규칙) */
const HALF_SPACE_OK = new Set(['components/home/HomeStatsCard.tsx: gap-0.5']);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(p);
    return /\.(tsx|ts)$/.test(e.name) ? [p] : [];
  });
}

const files = sourceFiles(path.join(SRC, 'components')).concat(sourceFiles(path.join(SRC, 'app')));
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');

describe('글자 크기·간격', () => {
  it('글자 크기는 12·13·15·17·20·26·40px 중 하나', () => {
    const found = files.flatMap((f) =>
      [...fs.readFileSync(f, 'utf8').matchAll(TEXT_PX)].filter((m) => !SCALE.has(m[1])).map((m) => `${rel(f)}: ${m[0]}`),
    );
    expect(found, '가까운 단계로 바꿔 주세요').toEqual([]);
  });

  it('text-xs 같은 이름 크기 대신 text-[12px] 형식', () => {
    const found = files.flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(NAMED)].map((m) => `${rel(f)}: ${m[0]}`));
    expect(found).toEqual([]);
  });

  it('간격은 4의 배수 (2·6·10·14px 금지)', () => {
    const found = files
      .flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(HALF_SPACE)].map((m) => `${rel(f)}: ${m[0]}`))
      .filter((s) => !HALF_SPACE_OK.has(s));
    expect(found, '1·2·3·4 단위로 바꿔 주세요').toEqual([]);
  });
});
