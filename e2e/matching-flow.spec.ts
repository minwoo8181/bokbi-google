import { expect, test } from '@playwright/test';
import { BROKER, OWNER, approveBroker, sendOffer, submitOwnerRequest } from './steps';

/**
 * 핵심 흐름: 집주인 요청 → 중개사 피드(블라인드) → 요청 보내기 → 집주인 선택 → 양쪽 거래 페이지에 실제 정보
 */
test('집주인 요청이 중개사에게 가고, 매칭되면 양쪽 거래 페이지가 열린다', async ({ page }) => {
  await test.step('집주인: 매칭 모달 6단계 제출', () => submitOwnerRequest(page));

  await test.step('중개사: 승인', () => approveBroker(page));

  await test.step('중개사: 피드·요청 시트에서 개인정보는 가려짐, 요청 보내기 (크레딧 3 → 2)', () => sendOffer(page));

  await test.step('집주인: 4번 제안(방금 보낸 중개사)을 골라 확정', async () => {
    await page.goto('/my-requests');
    await expect(page.getByTestId('stage-receiving')).toBeVisible();
    await expect(page.getByTestId('offer-card-4')).toBeVisible();
    await page.getByTestId('offer-select-4').click();
    await page.getByTestId('confirm-match-cta').click();
    await page.getByTestId('confirm-sheet-confirm').click();
    await expect(page.getByTestId('celebration')).toBeVisible();
    await page.getByTestId('celebration-close').click();
    await expect(page.getByTestId('stage-in-progress')).toBeVisible();
    await expect(page.getByTestId('matched-4')).toContainText(BROKER.office);
  });

  await test.step('집주인 거래 페이지: 사무소 이름과 중개사 전화', async () => {
    await page.getByTestId('owner-deal-open-4').click();
    const deal = page.getByTestId('owner-deal-page');
    await expect(deal).toBeVisible();
    await expect(page.getByTestId('owner-deal-office')).toHaveText(BROKER.office);
    await expect(deal.locator('a[href^="tel:"]').first()).toBeVisible();
  });

  await test.step('중개사 거래 페이지: 실제 동·호수·집주인 이름·전화', async () => {
    await page.goto('/agent');
    await page.getByTestId('tab-listings-button').click();
    await page.locator('[data-testid="sent-card"][data-status="SELECTED"]').first().getByTestId('listing-open').click();
    await expect(page.getByTestId('listing-panel')).toBeVisible();
    const address = page.getByTestId('deal-address');
    await expect(address).toContainText(`${OWNER.dong} ${OWNER.ho}호`);
    await expect(address).toContainText(OWNER.name);
    await expect(page.getByTestId('deal-info').locator('a[href^="tel:"]').first()).toBeVisible();
  });
});
