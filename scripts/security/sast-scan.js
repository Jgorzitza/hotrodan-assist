#!/usr/bin/env node
/**
 * Static Application Security Testing (SAST) Scanner
 * Quality Engineer Implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SASTScanner {
  constructor() {
    this.scanResults = {
      vulnerabilities: [],
      warnings: [],
      info: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  async scanJavaScript() {
    console.log('🔍 Scanning JavaScript files for security issues...');
    
    const jsFiles = this.findFiles('.js', ['node_modules', '.git', 'dist']);
    const tsFiles = this.findFiles('.ts', ['node_modules', '.git', 'dist']);
    
    for (const file of [...jsFiles, ...tsFiles]) {
      await this.scanFile(file);
    }
  }

  findFiles(extension, excludeDirs = []) {
    const files = [];
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!excludeDirs.some(exclude => entry.name.includes(exclude))) {
            walkDir(fullPath);
          }
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    };
    walkDir('.');
    return files;
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for common security issues
      const patterns = [
        {
          pattern: /eval\s*\(/g,
          severity: 'critical',
          message: 'Use of eval() function - potential code injection'
        },
        {
          pattern: /innerHTML\s*=/g,
          severity: 'high',
          message: 'Direct innerHTML assignment - potential XSS'
        },
        {
          pattern: /document\.write\s*\(/g,
          severity: 'high',
          message: 'Use of document.write() - potential XSS'
        },
        {
          pattern: /localStorage\.setItem\s*\([^,]+,\s*[^)]*\$?{/g,
          severity: 'medium',
          message: 'Potential template injection in localStorage'
        },
        {
          pattern: /process\.env\.\w+/g,
          severity: 'low',
          message: 'Environment variable usage - ensure proper handling'
        },
        {
          pattern: /console\.log\s*\([^)]*process\.env/g,
          severity: 'medium',
          message: 'Potential environment variable exposure in logs'
        }
      ];

      for (const { pattern, severity, message } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          this.addFinding(filePath, severity, message, matches.length);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not scan ${filePath}: ${error.message}`);
    }
  }

  addFinding(filePath, severity, message, count) {
    const finding = {
      file: filePath,
      severity,
      message,
      count,
      timestamp: new Date().toISOString()
    };

    this.scanResults.vulnerabilities.push(finding);
    this.scanResults.summary.total++;
    this.scanResults.summary[severity]++;
  }

  async runNpmAudit() {
    console.log('🔍 Running npm audit for dependency vulnerabilities...');
    
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      
      if (auditData.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries(auditData.vulnerabilities)) {
          const severity = vuln.severity || 'unknown';
          this.addFinding(
            `package:${pkg}`,
            severity,
            `Dependency vulnerability: ${vuln.title || 'Unknown issue'}`,
            1
          );
        }
      }
    } catch (error) {
      console.warn('⚠️ npm audit failed:', error.message);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.scanResults.summary,
      findings: this.scanResults.vulnerabilities,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(
      'security-scan-results.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 SAST Scan Results:');
    console.log(`Total findings: ${report.summary.total}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);
    
    if (report.summary.critical > 0 || report.summary.high > 0) {
      console.log('\n🚨 Critical/High severity issues found!');
      process.exit(1);
    }

    return report;
  }

  generateRecommendations() {
    return [
      'Implement Content Security Policy (CSP) headers',
      'Use parameterized queries for database operations',
      'Validate and sanitize all user inputs',
      'Implement proper authentication and authorization',
      'Use HTTPS for all communications',
      'Regular dependency updates and vulnerability scanning',
      'Implement rate limiting and DDoS protection'
    ];
  }

  async run() {
    console.log('🚀 Starting SAST Security Scan...');
    
    await this.scanJavaScript();
    await this.runNpmAudit();
    
    const report = this.generateReport();
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const scanner = new SASTScanner();
  scanner.run().catch(console.error);
}

module.exports = SASTScanner;
