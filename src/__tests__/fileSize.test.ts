/**
 * 컴포넌트 파일 길이 검사 (대표님 2026-10-26: 한 화면을 고칠 때 파일 1~2개만 열면 되게, 토큰 절약)
 * - 화면 파일(.tsx)은 400줄 이하. 300줄을 넘기기 시작하면 하위 컴포넌트·훅으로 나눌 때 (docs/COMPONENT_MAP.md)
 * - 아래 목록은 이미 긴 파일(정리 대기). 지금 줄 수를 넘으면 실패 → 늘지만 않게 묶어 두고, 나누면 목록에서 지운다
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const MAX_LINES = 400;
const SRC = path.resolve(__dirname, '..');

/** 정리 대기 (파일 → 지금 줄 수 상한). 줄이면 숫자도 같이 낮춘다 */
const LEGACY: Record<string, number> = {
  'components/agent/SpecialTermsBuilder.tsx': 611,
  'components/analysis/CommunityRetentionSection.tsx': 407,
};

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : tsxFiles(p);
    return e.name.endsWith('.tsx') ? [p] : [];
  });
}

/** 편집기에 보이는 줄 수 (마지막 줄바꿈은 세지 않음) */
const lineCount = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/).length;

describe('화면 파일 길이', () => {
  const files = tsxFiles(SRC).map((f) => ({ rel: path.relative(SRC, f).split(path.sep).join('/'), lines: lineCount(f) }));

  it(`새 화면 파일은 ${MAX_LINES}줄 이하`, () => {
    const over = files.filter((f) => !(f.rel in LEGACY) && f.lines > MAX_LINES).map((f) => `${f.rel} (${f.lines}줄)`);
    expect(over, '나눠 주세요 (하위 컴포넌트·훅). 방법은 .claude/skills/bokbi-component/SKILL.md').toEqual([]);
  });

  it('정리 대기 파일은 지금보다 길어지지 않음', () => {
    const grown = files.filter((f) => f.rel in LEGACY && f.lines > LEGACY[f.rel]).map((f) => `${f.rel} (${f.lines}줄 > ${LEGACY[f.rel]})`);
    expect(grown).toEqual([]);
  });

  it('정리 대기 목록에 없어진 파일이 남아 있지 않음 (나눴으면 목록에서 지우기)', () => {
    const rels = new Set(files.map((f) => f.rel));
    const stale = Object.keys(LEGACY).filter((r) => !rels.has(r) || files.find((f) => f.rel === r)!.lines <= MAX_LINES);
    expect(stale).toEqual([]);
  });
});
