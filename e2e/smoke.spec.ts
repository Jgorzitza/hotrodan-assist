import { test, expect } from '@playwright/test';

const shouldSkip = !process.env.PLAYWRIGHT_BASE_URL;

test.describe('dashboard smoke flow', () => {
  test.skip(shouldSkip, 'PLAYWRIGHT_BASE_URL not configured; skipping smoke flow');

  const routes = ['/', '/app', '/app/settings', '/app/inventory', '/app/seo'];

  for (const route of routes) {
    test(`loads ${route === '/' ? 'root' : route}`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.ok()).toBeTruthy();
      await page.waitForLoadState('networkidle');
    });
  }
});
