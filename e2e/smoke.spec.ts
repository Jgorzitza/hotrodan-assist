import { test, expect } from '@playwright/test';

const shouldSkip = !process.env.PLAYWRIGHT_BASE_URL;

test.describe('dashboard smoke flow', () => {
  test.skip(shouldSkip, 'PLAYWRIGHT_BASE_URL not configured; skipping smoke flow');

  test('loads overview dashboard root', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('networkidle');
  });
});
