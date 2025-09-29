/**
 * E2E Test Environment Setup
 * Quality Engineer Implementation
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestEnvironment {
  constructor() {
    this.baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    this.serverProcess = null;
    this.isServerRunning = false;
  }

  async checkServerStatus() {
    try {
      const response = await fetch(this.baseUrl);
      this.isServerRunning = response.ok;
      return this.isServerRunning;
    } catch (error) {
      this.isServerRunning = false;
      return false;
    }
  }

  async startTestServer() {
    if (await this.checkServerStatus()) {
      console.log('✅ Server already running');
      return true;
    }

    console.log('🚀 Starting test server...');
    
    // Try to start the dashboard server
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    return await this.checkServerStatus();
  }

  async stopTestServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  getTestConfig() {
    return {
      baseURL: this.baseUrl,
      timeout: 30000,
      retries: process.env.CI ? 2 : 1,
      workers: process.env.CI ? 1 : undefined,
      reporter: [
        ['list'],
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }]
      ]
    };
  }
}

module.exports = TestEnvironment;
