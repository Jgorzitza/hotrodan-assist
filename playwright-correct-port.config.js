module.exports = {
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        headless: true
      },
    }
  ],
  reporter: 'line',
  outputDir: './isolated-test-results',
  use: {
    baseURL: 'http://localhost:44569',  // Correct Shopify dev server port
    trace: 'off'
  }
};
