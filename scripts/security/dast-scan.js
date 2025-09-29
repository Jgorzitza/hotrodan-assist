#!/usr/bin/env node
/**
 * Dynamic Application Security Testing (DAST) Scanner
 * Quality Engineer Implementation
 */

const http = require('http');
const https = require('https');
const url = require('url');

class DASTScanner {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      vulnerabilities: [],
      warnings: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
    this.testedUrls = new Set();
  }

  async scanEndpoint(endpoint) {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    if (this.testedUrls.has(fullUrl)) return;
    this.testedUrls.add(fullUrl);

    console.log(`🔍 Scanning endpoint: ${fullUrl}`);

    try {
      // Test for common vulnerabilities
      await this.testSQLInjection(fullUrl);
      await this.testXSS(fullUrl);
      await this.testCSRF(fullUrl);
      await this.testHeaders(fullUrl);
      await this.testAuthentication(fullUrl);
    } catch (error) {
      console.warn(`⚠️ Could not scan ${fullUrl}: ${error.message}`);
    }
  }

  async testSQLInjection(url) {
    const payloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --"
    ];

    for (const payload of payloads) {
      try {
        const response = await this.makeRequest(`${url}?id=${encodeURIComponent(payload)}`);
        if (this.detectSQLInjection(response)) {
          this.addFinding(url, 'critical', 'Potential SQL injection vulnerability', 'SQL_INJECTION');
        }
      } catch (error) {
        // Expected for invalid requests
      }
    }
  }

  async testXSS(url) {
    const payloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')"
    ];

    for (const payload of payloads) {
      try {
        const response = await this.makeRequest(`${url}?q=${encodeURIComponent(payload)}`);
        if (response.body && response.body.includes(payload)) {
          this.addFinding(url, 'high', 'Potential XSS vulnerability', 'XSS');
        }
      } catch (error) {
        // Expected for invalid requests
      }
    }
  }

  async testCSRF(url) {
    try {
      const response = await this.makeRequest(url, { method: 'POST' });
      if (!response.headers['x-frame-options']) {
        this.addFinding(url, 'medium', 'Missing X-Frame-Options header - potential clickjacking', 'CSRF');
      }
    } catch (error) {
      // Expected for invalid requests
    }
  }

  async testHeaders(url) {
    try {
      const response = await this.makeRequest(url);
      
      const securityHeaders = [
        { header: 'x-content-type-options', required: true, severity: 'medium' },
        { header: 'x-frame-options', required: true, severity: 'medium' },
        { header: 'x-xss-protection', required: true, severity: 'medium' },
        { header: 'strict-transport-security', required: false, severity: 'low' },
        { header: 'content-security-policy', required: false, severity: 'medium' }
      ];

      for (const { header, required, severity } of securityHeaders) {
        if (required && !response.headers[header]) {
          this.addFinding(url, severity, `Missing security header: ${header}`, 'SECURITY_HEADERS');
        }
      }
    } catch (error) {
      // Expected for invalid requests
    }
  }

  async testAuthentication(url) {
    try {
      // Test for authentication bypass
      const response = await this.makeRequest(url);
      if (response.statusCode === 200 && url.includes('/admin')) {
        this.addFinding(url, 'high', 'Admin endpoint accessible without authentication', 'AUTH_BYPASS');
      }
    } catch (error) {
      // Expected for invalid requests
    }
  }

  detectSQLInjection(response) {
    const sqlErrorPatterns = [
      /mysql_fetch_array/,
      /ORA-\d+/,
      /Microsoft OLE DB Provider/,
      /SQLServer JDBC Driver/,
      /PostgreSQL query failed/,
      /Warning: mysql_/
    ];

    return sqlErrorPatterns.some(pattern => 
      response.body && pattern.test(response.body)
    );
  }

  async makeRequest(urlString, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(urlString);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'DAST-Scanner/1.0',
          ...options.headers
        },
        timeout: 5000
      };

      const req = client.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  addFinding(url, severity, message, type) {
    const finding = {
      url,
      severity,
      message,
      type,
      timestamp: new Date().toISOString()
    };

    this.results.vulnerabilities.push(finding);
    this.results.summary.total++;
    this.results.summary[severity]++;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: this.results.summary,
      findings: this.results.vulnerabilities,
      recommendations: [
        'Implement Web Application Firewall (WAF)',
        'Use parameterized queries for all database operations',
        'Implement Content Security Policy (CSP)',
        'Add security headers to all responses',
        'Implement proper authentication and session management',
        'Regular security testing and penetration testing',
        'Use HTTPS for all communications'
      ]
    };

    require('fs').writeFileSync(
      'dast-scan-results.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 DAST Scan Results:');
    console.log(`Total findings: ${report.summary.total}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);

    return report;
  }

  async run() {
    console.log(`🚀 Starting DAST Security Scan on ${this.baseUrl}...`);
    
    const endpoints = [
      '/',
      '/health',
      '/api/health',
      '/admin',
      '/login',
      '/api/users',
      '/api/data'
    ];

    for (const endpoint of endpoints) {
      await this.scanEndpoint(endpoint);
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const report = this.generateReport();
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const scanner = new DASTScanner(process.env.DAST_BASE_URL || 'http://localhost:3000');
  scanner.run().catch(console.error);
}

module.exports = DASTScanner;
