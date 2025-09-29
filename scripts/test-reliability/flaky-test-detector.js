#!/usr/bin/env node
/**
 * Flaky Test Detection and Classification System
 * Quality Engineer Implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FlakyTestDetector {
  constructor() {
    this.testHistory = new Map();
    this.flakyTests = new Map();
    this.reliabilityThresholds = {
      flakyThreshold: 0.8, // Tests with <80% pass rate are considered flaky
      criticalThreshold: 0.5, // Tests with <50% pass rate are critical
      minRuns: 10 // Minimum runs needed for classification
    };
    this.resultsFile = 'test-reliability-results.json';
  }

  async runTestSuite(runs = 20) {
    console.log(`🔄 Running test suite ${runs} times to detect flaky tests...`);
    
    for (let i = 1; i <= runs; i++) {
      console.log(`\n📊 Run ${i}/${runs}`);
      
      try {
        const startTime = Date.now();
        const output = execSync('npm test 2>&1', { encoding: 'utf8', timeout: 60000 });
        const duration = Date.now() - startTime;
        
        this.parseTestResults(output, i, duration);
        
        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Run ${i} failed: ${error.message}`);
        this.parseTestResults(error.stdout || error.message, i, 0, true);
      }
    }
    
    this.analyzeFlakyTests();
    this.generateReport();
  }

  parseTestResults(output, runNumber, duration, failed = false) {
    const lines = output.split('\n');
    const currentTest = null;
    
    for (const line of lines) {
      // Parse test results (adjust patterns based on your test runner)
      const testMatch = line.match(/✓|✗|PASS|FAIL.*?(.+?)(?:\s+\d+ms|\s+\(.*?\))?$/);
      if (testMatch) {
        const testName = testMatch[1].trim();
        const passed = !failed && (line.includes('✓') || line.includes('PASS'));
        
        if (!this.testHistory.has(testName)) {
          this.testHistory.set(testName, {
            totalRuns: 0,
            passedRuns: 0,
            failedRuns: 0,
            durations: [],
            runHistory: []
          });
        }
        
        const history = this.testHistory.get(testName);
        history.totalRuns++;
        history.durations.push(duration);
        history.runHistory.push({ runNumber, passed, duration });
        
        if (passed) {
          history.passedRuns++;
        } else {
          history.failedRuns++;
        }
      }
    }
  }

  analyzeFlakyTests() {
    console.log('\n🔍 Analyzing test reliability...');
    
    for (const [testName, history] of this.testHistory) {
      if (history.totalRuns < this.reliabilityThresholds.minRuns) {
        continue; // Not enough data
      }
      
      const passRate = history.passedRuns / history.totalRuns;
      const avgDuration = history.durations.reduce((a, b) => a + b, 0) / history.durations.length;
      
      let classification = 'stable';
      let severity = 'low';
      
      if (passRate < this.reliabilityThresholds.criticalThreshold) {
        classification = 'critical';
        severity = 'high';
      } else if (passRate < this.reliabilityThresholds.flakyThreshold) {
        classification = 'flaky';
        severity = 'medium';
      }
      
      if (classification !== 'stable') {
        this.flakyTests.set(testName, {
          classification,
          severity,
          passRate,
          totalRuns: history.totalRuns,
          passedRuns: history.passedRuns,
          failedRuns: history.failedRuns,
          averageDuration: avgDuration,
          durationVariance: this.calculateVariance(history.durations),
          runHistory: history.runHistory,
          recommendations: this.generateTestRecommendations(testName, classification, history)
        });
      }
    }
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance); // Standard deviation
  }

  generateTestRecommendations(testName, classification, history) {
    const recommendations = [];
    
    if (classification === 'critical') {
      recommendations.push('CRITICAL: This test needs immediate attention');
      recommendations.push('Consider rewriting the test or fixing underlying issues');
    } else if (classification === 'flaky') {
      recommendations.push('Test shows inconsistent behavior');
      recommendations.push('Add retry logic or fix timing issues');
    }
    
    if (history.durations.length > 1) {
      const variance = this.calculateVariance(history.durations);
      const avgDuration = history.durations.reduce((a, b) => a + b, 0) / history.durations.length;
      
      if (variance > avgDuration * 0.5) {
        recommendations.push('High duration variance suggests timing issues');
        recommendations.push('Add explicit waits or improve test stability');
      }
    }
    
    // Check for patterns in failures
    const consecutiveFailures = this.findConsecutiveFailures(history.runHistory);
    if (consecutiveFailures > 3) {
      recommendations.push(`Found ${consecutiveFailures} consecutive failures - possible setup/teardown issues`);
    }
    
    return recommendations;
  }

  findConsecutiveFailures(runHistory) {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const run of runHistory) {
      if (!run.passed) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testHistory.size,
        flakyTests: this.flakyTests.size,
        criticalTests: Array.from(this.flakyTests.values()).filter(t => t.classification === 'critical').length,
        stableTests: this.testHistory.size - this.flakyTests.size
      },
      flakyTests: Object.fromEntries(this.flakyTests),
      recommendations: this.generateOverallRecommendations()
    };

    fs.writeFileSync(this.resultsFile, JSON.stringify(report, null, 2));

    console.log('\n📊 Test Reliability Report:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Stable Tests: ${report.summary.stableTests}`);
    console.log(`Flaky Tests: ${report.summary.flakyTests}`);
    console.log(`Critical Tests: ${report.summary.criticalTests}`);

    if (this.flakyTests.size > 0) {
      console.log('\n🚨 Flaky Tests Found:');
      for (const [testName, data] of this.flakyTests) {
        console.log(`\n${testName}:`);
        console.log(`  Classification: ${data.classification.toUpperCase()}`);
        console.log(`  Pass Rate: ${(data.passRate * 100).toFixed(1)}%`);
        console.log(`  Runs: ${data.totalRuns} (${data.passedRuns} passed, ${data.failedRuns} failed)`);
        console.log(`  Recommendations: ${data.recommendations.join('; ')}`);
      }
    } else {
      console.log('\n✅ No flaky tests detected');
    }

    return report;
  }

  generateOverallRecommendations() {
    const recommendations = [];
    
    if (this.flakyTests.size > 0) {
      recommendations.push('Implement retry logic for flaky tests');
      recommendations.push('Add test isolation to prevent interference');
      recommendations.push('Use deterministic test data');
      recommendations.push('Add explicit waits instead of fixed delays');
      recommendations.push('Monitor test execution in CI/CD pipeline');
    }
    
    recommendations.push('Regular flaky test detection should be part of CI/CD');
    recommendations.push('Set up alerts for test reliability degradation');
    recommendations.push('Maintain test reliability dashboard');
    
    return recommendations;
  }

  async run() {
    const runs = parseInt(process.env.TEST_RUNS) || 20;
    await this.runTestSuite(runs);
  }
}

// Run if called directly
if (require.main === module) {
  const detector = new FlakyTestDetector();
  detector.run().catch(console.error);
}

module.exports = FlakyTestDetector;
