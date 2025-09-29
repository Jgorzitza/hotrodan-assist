#!/usr/bin/env node
/**
 * Test Retry Mechanism for Flaky Tests
 * Quality Engineer Implementation
 */

const { execSync } = require('child_process');

class TestRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000; // ms
    this.flakyTestConfig = options.flakyTestConfig || 'flaky-test-config.json';
  }

  async runTestWithRetry(testCommand, testName = 'test') {
    console.log(`🔄 Running ${testName} with retry mechanism (max ${this.maxRetries} retries)`);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📊 Attempt ${attempt}/${this.maxRetries}`);
        
        const startTime = Date.now();
        const output = execSync(testCommand, { 
          encoding: 'utf8', 
          timeout: 60000,
          stdio: 'pipe'
        });
        const duration = Date.now() - startTime;
        
        console.log(`✅ ${testName} passed on attempt ${attempt} (${duration}ms)`);
        return { success: true, attempt, duration, output };
        
      } catch (error) {
        lastError = error;
        console.log(`❌ ${testName} failed on attempt ${attempt}: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    console.log(`🚨 ${testName} failed after ${this.maxRetries} attempts`);
    return { 
      success: false, 
      attempts: this.maxRetries, 
      error: lastError.message,
      output: lastError.stdout || lastError.stderr 
    };
  }

  async runFlakyTests() {
    const flakyTests = this.loadFlakyTestConfig();
    
    if (flakyTests.length === 0) {
      console.log('ℹ️ No flaky tests configured for retry');
      return { success: true, results: [] };
    }
    
    const results = [];
    
    for (const testConfig of flakyTests) {
      const result = await this.runTestWithRetry(
        testConfig.command,
        testConfig.name
      );
      
      results.push({
        name: testConfig.name,
        ...result
      });
    }
    
    return { success: results.every(r => r.success), results };
  }

  loadFlakyTestConfig() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.flakyTestConfig)) {
        return JSON.parse(fs.readFileSync(this.flakyTestConfig, 'utf8'));
      }
    } catch (error) {
      console.warn(`⚠️ Could not load flaky test config: ${error.message}`);
    }
    
    // Default flaky tests based on common patterns
    return [
      {
        name: 'E2E Tests',
        command: 'npm run test:e2e',
        maxRetries: 3,
        retryDelay: 2000
      },
      {
        name: 'Integration Tests',
        command: 'npm run test:integration',
        maxRetries: 2,
        retryDelay: 1000
      }
    ];
  }

  generateRetryReport(results) {
    console.log('\n📊 Test Retry Report:');
    
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n🚨 Failed Tests:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.name}: Failed after ${result.attempts} attempts`);
      });
    }
    
    return { totalTests, successfulTests, failedTests };
  }

  async run() {
    const results = await this.runFlakyTests();
    const report = this.generateRetryReport(results.results);
    
    if (!results.success) {
      process.exit(1);
    }
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const retry = new TestRetry({
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
  });
  
  retry.run().catch(console.error);
}

module.exports = TestRetry;
