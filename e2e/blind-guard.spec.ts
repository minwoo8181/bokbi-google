import { expect, test } from '@playwright/test';
import { approveBroker, expectNoOwnerSecrets, sendOffer, submitOwnerRequest } from './steps';

/**
 * 블라인드 원칙 회귀 방지: 집주인이 다른 중개사를 고르면, 요청을 보냈던 나에게는 끝까지 동·호수·이름·전화가 보이지 않는다
 */
test('선택받지 못한 중개사에게는 집주인 개인정보가 열리지 않는다', async ({ page }) => {
  await submitOwnerRequest(page);
  await approveBroker(page);
  await sendOffer(page);

  await test.step('집주인이 다른 중개사를 선택 (테스트 스위처)', async () => {
    await page.getByTestId('qa-ownerPicksOther').click();
    await page.goto('/agent');
  });

  await test.step('피드·내 매물·내 사무소 지난 요청 어디에도 개인정보 없음', async () => {
    await expectNoOwnerSecrets(page);
    await page.getByTestId('tab-listings-button').click();
    await expect(page.getByTestId('tab-listings')).toBeVisible();
    await expect(page.locator('[data-testid="sent-card"][data-status="SELECTED"]')).toHaveCount(0);
    await expectNoOwnerSecrets(page);
    // 선택되지 않은 요청은 내 매물에서 빠지고 내 사무소 "지난 요청"으로 (2026-10-27)
    await page.getByTestId('tab-office-button').click();
    await expect(page.getByTestId('past-list')).toBeVisible();
    await expectNoOwnerSecrets(page);
  });
});
