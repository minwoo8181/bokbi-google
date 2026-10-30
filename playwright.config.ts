import { defineConfig, devices } from '@playwright/test';

/**
 * 화면끼리 이어지는 흐름 자동 확인 (npm run e2e). 시나리오는 e2e/*.spec.ts
 * - 3006에 dev 서버가 떠 있으면 그대로 쓰고, 없으면 띄운다 (실험용 복사본: 원본 3004 서버를 재사용하지 않게)
 * - 테스트마다 새 브라우저 상태 (대표님 브라우저 저장값과 무관)
 * - local 모드(브라우저 저장소)라 세 화면이 한 저장소를 공유 → 한 탭에서 주소만 옮겨 다닌다
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3006';
/** GitHub Actions (.github/workflows/ci.yml): 첫 페이지 컴파일이 느려 1번 재시도 (통과해도 flaky로 표시), test.only 금지 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  timeout: 90_000,
  expect: { timeout: CI ? 20_000 : 10_000 },
  reporter: CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL,
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-mobile' }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
