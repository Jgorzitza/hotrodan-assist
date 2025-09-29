#!/usr/bin/env node
/**
 * Load Testing Framework for Critical APIs
 * Quality Engineer Implementation
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

class LoadTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.concurrentUsers = options.concurrentUsers || 10;
    this.duration = options.duration || 30; // seconds
    this.rampUpTime = options.rampUpTime || 5; // seconds
    this.results = {
      requests: [],
      errors: [],
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0
      }
    };
    this.thresholds = {
      maxResponseTime: 1000, // ms
      maxErrorRate: 1, // %
      minRequestsPerSecond: 10
    };
  }

  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const requestUrl = `${this.baseUrl}${endpoint}`;
      const parsedUrl = url.parse(requestUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'LoadTester/1.0',
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: 10000
      };

      const req = client.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          resolve({
            endpoint,
            statusCode: res.statusCode,
            responseTime,
            headers: res.headers,
            body: body,
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on('error', (error) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        reject({
          endpoint,
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString()
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject({
          endpoint,
          error: 'Request timeout',
          responseTime: 10000,
          timestamp: new Date().toISOString()
        });
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      
      req.end();
    });
  }

  async runLoadTest(endpoints) {
    console.log(`🚀 Starting load test with ${this.concurrentUsers} concurrent users for ${this.duration} seconds`);
    console.log(`📊 Testing endpoints: ${endpoints.map(e => e.endpoint).join(', ')}`);
    
    const startTime = Date.now();
    const endTime = startTime + (this.duration * 1000);
    const rampUpEndTime = startTime + (this.rampUpTime * 1000);
    
    let activeUsers = 0;
    const userPromises = [];

    // Ramp up users gradually
    const rampUpInterval = setInterval(() => {
      if (activeUsers < this.concurrentUsers && Date.now() < rampUpEndTime) {
        activeUsers++;
        console.log(`👤 Ramping up to ${activeUsers} concurrent users`);
        
        const userPromise = this.runUser(endpoints, endTime);
        userPromises.push(userPromise);
      }
    }, (this.rampUpTime * 1000) / this.concurrentUsers);

    // Wait for all users to complete
    await Promise.all(userPromises);
    clearInterval(rampUpInterval);

    // Calculate results
    this.calculateResults();
    return this.results;
  }

  async runUser(endpoints, endTime) {
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      
      try {
        const result = await this.makeRequest(endpoint.endpoint, endpoint.options);
        this.results.requests.push(result);
      } catch (error) {
        this.results.errors.push(error);
      }
      
      // Small delay between requests to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  calculateResults() {
    const requests = this.results.requests;
    const errors = this.results.errors;
    
    if (requests.length === 0) return;

    // Basic metrics
    this.results.summary.totalRequests = requests.length + errors.length;
    this.results.summary.successfulRequests = requests.length;
    this.results.summary.failedRequests = errors.length;
    this.results.summary.errorRate = (errors.length / this.results.summary.totalRequests) * 100;

    // Response time metrics
    const responseTimes = requests.map(r => r.responseTime).sort((a, b) => a - b);
    this.results.summary.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    this.results.summary.minResponseTime = Math.min(...responseTimes);
    this.results.summary.maxResponseTime = Math.max(...responseTimes);
    
    // Percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    this.results.summary.p95ResponseTime = responseTimes[p95Index] || 0;
    this.results.summary.p99ResponseTime = responseTimes[p99Index] || 0;

    // Throughput
    this.results.summary.requestsPerSecond = requests.length / this.duration;
  }

  checkThresholds() {
    const violations = [];
    
    if (this.results.summary.averageResponseTime > this.thresholds.maxResponseTime) {
      violations.push(`Average response time ${this.results.summary.averageResponseTime}ms exceeds threshold ${this.thresholds.maxResponseTime}ms`);
    }
    
    if (this.results.summary.errorRate > this.thresholds.maxErrorRate) {
      violations.push(`Error rate ${this.results.summary.errorRate.toFixed(2)}% exceeds threshold ${this.thresholds.maxErrorRate}%`);
    }
    
    if (this.results.summary.requestsPerSecond < this.thresholds.minRequestsPerSecond) {
      violations.push(`Requests per second ${this.results.summary.requestsPerSecond.toFixed(2)} below threshold ${this.thresholds.minRequestsPerSecond}`);
    }

    return violations;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        baseUrl: this.baseUrl,
        concurrentUsers: this.concurrentUsers,
        duration: this.duration,
        rampUpTime: this.rampUpTime
      },
      results: this.results.summary,
      thresholds: this.thresholds,
      violations: this.checkThresholds(),
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(
      'load-test-results.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Load Test Results:');
    console.log(`Total Requests: ${report.results.totalRequests}`);
    console.log(`Successful: ${report.results.successfulRequests}`);
    console.log(`Failed: ${report.results.failedRequests}`);
    console.log(`Error Rate: ${report.results.errorRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${report.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`P95 Response Time: ${report.results.p95ResponseTime}ms`);
    console.log(`P99 Response Time: ${report.results.p99ResponseTime}ms`);
    console.log(`Requests/Second: ${report.results.requestsPerSecond.toFixed(2)}`);

    if (report.violations.length > 0) {
      console.log('\n🚨 Threshold Violations:');
      report.violations.forEach(violation => console.log(`- ${violation}`));
      return false;
    } else {
      console.log('\n✅ All thresholds passed');
      return true;
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.averageResponseTime > 500) {
      recommendations.push('Consider optimizing database queries or adding caching');
    }
    
    if (this.results.summary.errorRate > 0.1) {
      recommendations.push('Investigate and fix error sources');
    }
    
    if (this.results.summary.p95ResponseTime > 1000) {
      recommendations.push('Optimize slow endpoints or add horizontal scaling');
    }

    return recommendations;
  }

  async run() {
    const endpoints = [
      { endpoint: '/health', options: { method: 'GET' } },
      { endpoint: '/api/health', options: { method: 'GET' } },
      { endpoint: '/', options: { method: 'GET' } }
    ];

    await this.runLoadTest(endpoints);
    const passed = this.generateReport();
    
    if (!passed) {
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const options = {
    baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000',
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
    duration: parseInt(process.env.TEST_DURATION) || 30,
    rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 5
  };
  
  const tester = new LoadTester(options);
  tester.run().catch(console.error);
}

module.exports = LoadTester;
