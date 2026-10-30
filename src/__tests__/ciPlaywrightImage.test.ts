/**
 * CI e2e는 Playwright 공식 이미지(브라우저·시스템 라이브러리 포함)에서 돈다 (2026-10-27)
 * 이미지 버전과 설치된 @playwright/test 버전이 다르면 브라우저를 못 찾아 CI가 깨진다 → @playwright/test를 올리면 ci.yml 이미지 태그도 같이 올릴 것
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('CI Playwright 이미지', () => {
  it('ci.yml 이미지 태그 = package-lock의 @playwright/test 버전', () => {
    const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
    const tag = ci.match(/mcr\.microsoft\.com\/playwright:v([\d.]+)-/)?.[1];
    expect(tag).toBe(lock.packages['node_modules/@playwright/test'].version);
  });

  it('이미지에 브라우저가 있으니 playwright install 단계는 없다 (apt 설치로 1회 10분 넘게 걸렸음)', () => {
    const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toMatch(/playwright install/);
  });
});
