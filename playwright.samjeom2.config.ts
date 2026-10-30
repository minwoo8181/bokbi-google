import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * design-lab: 같은 e2e 시나리오를 삼쩜삼 심화 테마(bokbi_lab_theme=samjeom2)로 한 번 더.
 * 실행: npx playwright test --config playwright.samjeom2.config.ts
 */
export default defineConfig({
  ...base,
  outputDir: 'test-results/samjeom2',
  use: { ...base.use, storageState: 'e2e/lab/samjeom2-state.json' },
});
