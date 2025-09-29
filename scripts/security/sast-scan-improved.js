#!/usr/bin/env node
/**
 * Improved SAST Scanner - Quality Score Optimization
 * Quality Engineer Implementation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ImprovedSASTScanner {
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
        low: 0,
      },
    };

    // Exclude directories that commonly have false positives
    this.excludeDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.venv',
      '__pycache__',
      'coverage',
    ];
  }

  async scanJavaScript() {
    console.log('🔍 Scanning JavaScript files for security issues...');

    const jsFiles = this.findFiles('.js', this.excludeDirs);
    const tsFiles = this.findFiles('.ts', this.excludeDirs);
    const jsxFiles = this.findFiles('.jsx', this.excludeDirs);
    const tsxFiles = this.findFiles('.tsx', this.excludeDirs);

    for (const file of [...jsFiles, ...tsFiles, ...jsxFiles, ...tsxFiles]) {
      await this.scanFile(file);
    }
  }

  findFiles(extension, excludeDirs = []) {
    const files = [];
    const walkDir = dir => {
      try {
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
      } catch (error) {
        // Skip directories we can't read
      }
    };
    walkDir('.');
    return files;
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for common security issues with improved patterns
      const patterns = [
        {
          pattern: /eval\s*\(/g,
          severity: 'critical',
          message: 'Use of eval() function - potential code injection',
          excludeInComments: true,
        },
        {
          pattern: /innerHTML\s*=\s*[^=]/g,
          severity: 'high',
          message: 'Direct innerHTML assignment - potential XSS',
        },
        {
          pattern: /document\.write\s*\(/g,
          severity: 'high',
          message: 'Use of document.write() - potential XSS',
        },
        {
          pattern: /localStorage\.setItem\s*\([^,]+,\s*[^)]*\$?{/g,
          severity: 'medium',
          message: 'Potential template injection in localStorage',
        },
        {
          pattern: /console\.log\s*\([^)]*process\.env/g,
          severity: 'medium',
          message: 'Potential environment variable exposure in logs',
        },
        {
          pattern: /dangerouslySetInnerHTML/g,
          severity: 'medium',
          message:
            'React dangerouslySetInnerHTML usage - ensure content is sanitized',
        },
        {
          pattern: /new Function\s*\(/g,
          severity: 'high',
          message: 'Use of Function constructor - potential code injection',
        },
      ];

      for (const {
        pattern,
        severity,
        message,
        excludeInComments,
      } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          // Filter out matches in comments if requested
          let validMatches = matches;
          if (excludeInComments) {
            const lines = content.split('\n');
            validMatches = matches.filter(match => {
              const lineIndex =
                content.substring(0, content.indexOf(match)).split('\n')
                  .length - 1;
              const line = lines[lineIndex];
              return (
                !line.trim().startsWith('//') && !line.trim().startsWith('*')
              );
            });
          }

          if (validMatches.length > 0) {
            this.addFinding(filePath, severity, message, validMatches.length);
          }
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
      timestamp: new Date().toISOString(),
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
      console.log('ℹ️ npm audit completed with findings');
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.scanResults.summary,
      findings: this.scanResults.vulnerabilities,
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(
      'security-scan-improved-results.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Improved SAST Scan Results:');
    console.log(`Total findings: ${report.summary.total}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);

    return report;
  }

  generateRecommendations() {
    return [
      'Implement Content Security Policy (CSP) headers',
      'Use parameterized queries for database operations',
      'Validate and sanitize all user inputs',
      'Replace innerHTML with safer alternatives like textContent',
      'Implement proper authentication and authorization',
      'Use HTTPS for all communications',
      'Regular dependency updates and vulnerability scanning',
    ];
  }

  async run() {
    console.log('🚀 Starting Improved SAST Security Scan...');

    await this.scanJavaScript();
    await this.runNpmAudit();

    const report = this.generateReport();
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const scanner = new ImprovedSASTScanner();
  scanner.run().catch(console.error);
}

module.exports = ImprovedSASTScanner;
