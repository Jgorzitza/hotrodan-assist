import { test, expect } from '@playwright/test';

test.describe('Dashboard Widgets Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/app');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-container"]', { timeout: 10000 });
    
    // Wait for all widgets to load
    await page.waitForLoadState('networkidle');
  });

  test('Revenue metrics card', async ({ page }) => {
    const revenueCard = page.locator('[data-testid="revenue-metric-card"]');
    await expect(revenueCard).toBeVisible();
    await expect(revenueCard).toHaveScreenshot('revenue-metric-card.png');
  });

  test('AOV metrics card', async ({ page }) => {
    const aovCard = page.locator('[data-testid="aov-metric-card"]');
    await expect(aovCard).toBeVisible();
    await expect(aovCard).toHaveScreenshot('aov-metric-card.png');
  });

  test('Conversion metrics card', async ({ page }) => {
    const conversionCard = page.locator('[data-testid="conversion-metric-card"]');
    await expect(conversionCard).toBeVisible();
    await expect(conversionCard).toHaveScreenshot('conversion-metric-card.png');
  });

  test('CAC metrics card', async ({ page }) => {
    const cacCard = page.locator('[data-testid="cac-metric-card"]');
    await expect(cacCard).toBeVisible();
    await expect(cacCard).toHaveScreenshot('cac-metric-card.png');
  });

  test('LTV metrics card', async ({ page }) => {
    const ltvCard = page.locator('[data-testid="ltv-metric-card"]');
    await expect(ltvCard).toBeVisible();
    await expect(ltvCard).toHaveScreenshot('ltv-metric-card.png');
  });

  test('Cohort analysis widget', async ({ page }) => {
    const cohortWidget = page.locator('[data-testid="cohort-analysis-widget"]');
    await expect(cohortWidget).toBeVisible();
    await expect(cohortWidget).toHaveScreenshot('cohort-analysis-widget.png');
  });

  test('Sales sparkline chart', async ({ page }) => {
    const sparklineChart = page.locator('[data-testid="sales-sparkline-chart"]');
    await expect(sparklineChart).toBeVisible();
    await expect(sparklineChart).toHaveScreenshot('sales-sparkline-chart.png');
  });

  test('Dashboard header and navigation', async ({ page }) => {
    const header = page.locator('[data-testid="dashboard-header"]');
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot('dashboard-header.png');
  });

  test('Date range selector', async ({ page }) => {
    const dateRangeSelector = page.locator('[data-testid="date-range-selector"]');
    await expect(dateRangeSelector).toBeVisible();
    await expect(dateRangeSelector).toHaveScreenshot('date-range-selector.png');
  });

  test('Compare period selector', async ({ page }) => {
    const compareSelector = page.locator('[data-testid="compare-period-selector"]');
    await expect(compareSelector).toBeVisible();
    await expect(compareSelector).toHaveScreenshot('compare-period-selector.png');
  });

  test('Export manager widget', async ({ page }) => {
    const exportManager = page.locator('[data-testid="export-manager-widget"]');
    await expect(exportManager).toBeVisible();
    await expect(exportManager).toHaveScreenshot('export-manager-widget.png');
  });

  test('Preset manager widget', async ({ page }) => {
    const presetManager = page.locator('[data-testid="preset-manager-widget"]');
    await expect(presetManager).toBeVisible();
    await expect(presetManager).toHaveScreenshot('preset-manager-widget.png');
  });

  test('Permission manager widget', async ({ page }) => {
    const permissionManager = page.locator('[data-testid="permission-manager-widget"]');
    await expect(permissionManager).toBeVisible();
    await expect(permissionManager).toHaveScreenshot('permission-manager-widget.png');
  });

  test('Cache manager widget', async ({ page }) => {
    const cacheManager = page.locator('[data-testid="cache-manager-widget"]');
    await expect(cacheManager).toBeVisible();
    await expect(cacheManager).toHaveScreenshot('cache-manager-widget.png');
  });

  test('Theme toggle component', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle-component"]');
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toHaveScreenshot('theme-toggle-component.png');
  });

  test('Full dashboard layout', async ({ page }) => {
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboardContainer).toBeVisible();
    await expect(dashboardContainer).toHaveScreenshot('full-dashboard-layout.png');
  });

  test('Dashboard in dark mode', async ({ page }) => {
    // Switch to dark mode
    await page.click('[data-testid="theme-toggle-dark"]');
    await page.waitForTimeout(1000); // Wait for theme transition
    
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboardContainer).toBeVisible();
    await expect(dashboardContainer).toHaveScreenshot('full-dashboard-layout-dark.png');
  });

  test('Dashboard with compare period enabled', async ({ page }) => {
    // Enable compare period
    await page.selectOption('[data-testid="compare-period-selector"]', '7d');
    await page.waitForTimeout(1000); // Wait for data to load
    
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboardContainer).toBeVisible();
    await expect(dashboardContainer).toHaveScreenshot('full-dashboard-layout-compare.png');
  });

  test('Dashboard with different date ranges', async ({ page }) => {
    const dateRanges = ['7d', '14d', '28d', '90d'];
    
    for (const range of dateRanges) {
      await page.selectOption('[data-testid="date-range-selector"]', range);
      await page.waitForTimeout(1000); // Wait for data to load
      
      const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboardContainer).toBeVisible();
      await expect(dashboardContainer).toHaveScreenshot(`full-dashboard-layout-${range}.png`);
    }
  });

  test('Mobile dashboard layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboardContainer).toBeVisible();
    await expect(dashboardContainer).toHaveScreenshot('full-dashboard-layout-mobile.png');
  });

  test('Tablet dashboard layout', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
    await expect(dashboardContainer).toBeVisible();
    await expect(dashboardContainer).toHaveScreenshot('full-dashboard-layout-tablet.png');
  });
});
