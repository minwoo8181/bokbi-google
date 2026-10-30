import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * design-lab: 같은 e2e 시나리오를 삼쩜삼 실험 테마(bokbi_lab_theme=samjeom)로 한 번 더.
 * 실험 화면이 원래 흐름(요청 → 중개사 → 매칭 → 거래 페이지)을 깨지 않는지 확인한다.
 * 실행: npx playwright test --config playwright.samjeom.config.ts
 */
export default defineConfig({
  ...base,
  outputDir: 'test-results/samjeom',
  use: { ...base.use, storageState: 'e2e/lab/samjeom-state.json' },
});
