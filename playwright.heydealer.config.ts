import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * design-lab: 같은 e2e 시나리오를 헤이딜러 테마(브라우저 저장값 bokbi_lab_theme=heydealer)로 한 번 더.
 * 실행: npx playwright test --config playwright.heydealer.config.ts
 */
export default defineConfig({
  ...base,
  outputDir: 'test-results/heydealer',
  use: { ...base.use, storageState: 'e2e/lab/heydealer-state.json' },
});
