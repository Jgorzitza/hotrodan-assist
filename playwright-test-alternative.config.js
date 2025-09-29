module.exports = {
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  workers: 1,
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        headless: true
      },
    },
    {
      name: 'firefox', 
      use: { 
        browserName: 'firefox',
        headless: true
      },
    }
  ],
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off'
  }
};
