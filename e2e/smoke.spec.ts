import { test } from '@playwright/test';

test.describe.skip('dashboard smoke flow', () => {
  test('navigates to overview dashboard', async ({ page }) => {
    await page.goto('/');
  });
});
