import { expect, type Page } from '@playwright/test';

/**
 * 화면 흐름 공통 단계 (local 모드). 모든 값은 테스트용
 * - 집주인: 매칭 모달 6단계 → 요청서 저장
 * - 중개사: 테스트 스위처로 가입 승인 → 피드에서 요청 보내기
 */
export const OWNER = {
  aptPath: '/analysis/16',
  aptName: '다산자이아이비플레이스',
  dong: '1502동',
  ho: '1001',
  name: '김테스트',
  phone: '010-5555-0101',
};
/** AgentQa 승인 데이터의 사무소 (components/agent/AgentQa.tsx QA_APPLICATION) */
export const BROKER = { office: '1등이편한공인중개사사무소' };

const id = (page: Page, testId: string) => page.getByTestId(testId);

/** 매칭 모달 처음부터 완료까지 (세입자 없음·근저당 없음) */
export async function submitOwnerRequest(page: Page) {
  await page.goto(OWNER.aptPath);
  await id(page, 'matching-sticky-cta').click();
  await expect(id(page, 'modal-step-1')).toBeVisible();
  const types = id(page, 'pyeong-type-selector');
  if (await types.isVisible()) await types.getByRole('button').first().click();
  await id(page, 'modal-step1-next').click();

  await expect(id(page, 'modal-step-2')).toBeVisible();
  // 빠진 칸이 있으면 넘어가지 않고 칸 아래 안내 + 남은 개수 (2026-10-27 인라인 오류)
  await id(page, 'modal-step2-next').click();
  await expect(id(page, 'missing-count')).toBeVisible();
  await expect(id(page, 'mortgage-section').getByRole('alert')).toBeVisible();
  await expect(id(page, 'modal-step-2')).toBeVisible();
  await id(page, 'btn-mortgage-NONE').click();
  await expect(id(page, 'missing-count')).toBeHidden();
  await id(page, 'modal-step2-next').click();

  // 복비 정하기 (2026-10-27 분석 카드에서 옮김): 추천 금액 그대로 다음
  await expect(id(page, 'modal-step-fee')).toBeVisible();
  await id(page, 'modal-step-fee-next').click();

  await expect(id(page, 'modal-step-3')).toBeVisible();
  const dong = id(page, 'input-dong');
  if ((await dong.evaluate((el) => el.tagName)) === 'SELECT') await dong.selectOption(OWNER.dong);
  else await dong.fill(OWNER.dong);
  await id(page, 'input-ho').fill(OWNER.ho);
  await id(page, 'modal-step3-next').click();

  await expect(id(page, 'modal-step-4')).toBeVisible();
  await id(page, 'input-owner-name').fill(OWNER.name);
  await id(page, 'consent-all').click();
  await id(page, 'input-owner-phone').fill(OWNER.phone);
  await id(page, 'btn-send-sms').click();
  await id(page, 'btn-autofill-sms').click();
  if (!(await id(page, 'sms-verified-badge').isVisible())) await id(page, 'btn-confirm-sms').click();
  await expect(id(page, 'sms-verified-badge')).toBeVisible();
  await id(page, 'modal-step4-next').click();

  await expect(id(page, 'modal-step-5')).toBeVisible();
  await id(page, 'chk-sole-owner').click();
  await id(page, 'chk-legal-pledge').click();
  await id(page, 'modal-step5-submit').click();
  await expect(id(page, 'modal-step-6')).toBeVisible();
  // 완료 영수증: 저장된 접수번호와 내가 제안한 복비
  await expect(id(page, 'receipt-number')).toContainText('BK-');
  await expect(id(page, 'receipt-total')).toContainText('원');
}

/** 중개사 가입 승인 (테스트 스위처) → 피드가 열리고 이번 주 크레딧 3 */
export async function approveBroker(page: Page) {
  await page.goto('/agent');
  await expect(id(page, 'agent-gate')).toBeVisible();
  await id(page, 'qa-approve').click();
  await expect(id(page, 'tab-feed-button')).toBeVisible();
  await expect(credits(page)).toHaveText('3');
}

export const credits = (page: Page) => id(page, 'agent-summary').locator('.tabular-nums');

/** 피드에서 집주인 요청 카드 (단지 이름으로 찾음) */
export const ownerFeedCard = (page: Page) => id(page, 'feed-card').filter({ hasText: OWNER.aptName }).first();

/** 피드(가려짐 확인) → 요청 시트(가려짐 확인) → 보내기. 보낸 요청 묶음으로 옮겨지고 크레딧 1 차감 */
export async function sendOffer(page: Page) {
  await expect(ownerFeedCard(page)).toBeVisible();
  await expectNoOwnerSecrets(page);
  await ownerFeedCard(page).click();
  await expect(id(page, 'feed-request-sheet')).toBeVisible();
  await expectNoOwnerSecrets(page);
  await id(page, 'feed-request-sheet-confirm').click();
  await expect(id(page, 'feed-request-sheet')).toBeHidden();
  await expect(id(page, 'feed-group-sent').getByTestId('feed-card').filter({ hasText: OWNER.aptName })).toBeVisible();
  await expect(credits(page)).toHaveText('2');
}

/** 화면 어디에도 집주인 실제 개인정보(호수·이름·전화)가 없어야 한다 (매칭 전 블라인드) */
export async function expectNoOwnerSecrets(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text, '실제 호수 노출').not.toContain(`${OWNER.ho}호`);
  expect(text, '집주인 이름 노출').not.toContain(OWNER.name);
  expect(text, '집주인 전화 노출').not.toContain(OWNER.phone);
  await expect(page.locator(`a[href*="${OWNER.phone.replace(/-/g, '')}"], a[href*="${OWNER.phone}"]`)).toHaveCount(0);
}
