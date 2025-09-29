# Visual Regression Testing

This directory contains visual regression tests for the dashboard widgets using Playwright.

## Overview

Visual regression testing ensures that UI changes don't break the visual appearance of dashboard components. The tests capture screenshots of key widgets and compare them against baseline images.

## Test Structure

- `dashboard-widgets.spec.ts` - Main test file containing all visual regression tests
- `visual-regression.config.js` - Playwright configuration for visual tests
- `run-visual-tests.sh` - Script to run visual regression tests
- `baselines/` - Directory containing baseline screenshots
- `screenshots/` - Directory containing current test screenshots

## Running Tests

### Local Development

1. Start the dashboard server:
   ```bash
   cd apps/dashboard
   npm run dev
   ```

2. Run visual regression tests:
   ```bash
   cd tests/visual-regression
   ./run-visual-tests.sh
   ```

### Update Baselines

When you make intentional visual changes, update the baseline screenshots:

```bash
UPDATE_SNAPSHOTS=true ./run-visual-tests.sh
```

### Specific Browser

Run tests for a specific browser:

```bash
BROWSER=firefox ./run-visual-tests.sh
```

## Test Coverage

The visual regression tests cover:

### Core Widgets
- Revenue metrics card
- AOV metrics card  
- Conversion metrics card
- CAC metrics card
- LTV metrics card
- Cohort analysis widget
- Sales sparkline chart

### UI Components
- Dashboard header and navigation
- Date range selector
- Compare period selector
- Export manager widget
- Preset manager widget
- Permission manager widget
- Cache manager widget
- Theme toggle component

### Layouts
- Full dashboard layout
- Dark mode layout
- Compare period enabled layout
- Different date ranges (7d, 14d, 28d, 90d)
- Mobile layout (375x667)
- Tablet layout (768x1024)

## Configuration

### Test Configuration

The tests are configured in `visual-regression.config.js`:

- **Threshold**: 0.2 (20% pixel difference tolerance)
- **Max Diff Pixels**: 100
- **Animations**: Disabled for consistent screenshots
- **Viewport**: 1920x1080 for desktop tests

### Environment Variables

- `BASE_URL` - Dashboard server URL (default: http://localhost:3000)
- `UPDATE_SNAPSHOTS` - Update baseline screenshots (default: false)
- `HEADLESS` - Run browser in headless mode (default: true)
- `BROWSER` - Browser to use for tests (default: chromium)

## CI/CD Integration

Visual regression tests run automatically:

- On every push to main/develop branches
- On pull requests affecting dashboard code
- Daily at 2 AM UTC

### GitHub Actions

The tests run in GitHub Actions with:
- Ubuntu latest
- Node.js 18
- Playwright with all browsers
- Artifact upload for test results

## Troubleshooting

### Common Issues

1. **Tests fail with "Element not found"**
   - Ensure dashboard server is running
   - Check that test IDs are properly set in components
   - Verify component rendering logic

2. **Screenshots don't match baselines**
   - Review the visual differences in test results
   - Update baselines if changes are intentional
   - Check for dynamic content that might cause flakiness

3. **Tests are flaky**
   - Add proper wait conditions
   - Disable animations in test configuration
   - Use `waitForLoadState('networkidle')` for data loading

### Debug Mode

Run tests in debug mode to see the browser:

```bash
HEADLESS=false ./run-visual-tests.sh
```

### View Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report test-results/html-report
```

## Best Practices

1. **Stable Test IDs**: Use consistent `data-testid` attributes
2. **Wait Conditions**: Always wait for elements to be visible
3. **Consistent Data**: Use mock data for predictable screenshots
4. **Regular Updates**: Update baselines when making intentional changes
5. **Cross-Browser**: Test on multiple browsers for compatibility

## Maintenance

### Adding New Tests

1. Add test case to `dashboard-widgets.spec.ts`
2. Ensure component has proper `data-testid` attribute
3. Run tests locally to generate baseline
4. Commit baseline screenshots

### Updating Baselines

1. Make visual changes
2. Run `UPDATE_SNAPSHOTS=true ./run-visual-tests.sh`
3. Review generated screenshots
4. Commit updated baselines

### Cleaning Up

Remove old baseline screenshots when components are removed:

```bash
rm test-results/baselines/old-component-*.png
```
