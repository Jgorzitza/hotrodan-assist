#!/usr/bin/env node

// Secret scanning script for Llama RAG project
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`)
};

// Secret patterns to scan for
const SECRET_PATTERNS = [
  // API Keys
  {
    name: 'API Key',
    pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    severity: 'HIGH'
  },
  // AWS Keys
  {
    name: 'AWS Access Key',
    pattern: /(aws[_-]?access[_-]?key[_-]?id|accesskeyid)\s*[=:]\s*['"]?(AKIA[0-9A-Z]{16})['"]?/gi,
    severity: 'CRITICAL'
  },
  {
    name: 'AWS Secret Key',
    pattern: /(aws[_-]?secret[_-]?access[_-]?key|secretaccesskey)\s*[=:]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    severity: 'CRITICAL'
  },
  // Database URLs
  {
    name: 'Database URL',
    pattern: /(database[_-]?url|db[_-]?url|mongodb[_-]?url|postgres[_-]?url)\s*[=:]\s*['"]?([^'"\s]+:\/\/[^'"\s]+)['"]?/gi,
    severity: 'HIGH'
  },
  // JWT Secrets
  {
    name: 'JWT Secret',
    pattern: /(jwt[_-]?secret|jwtsecret)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{32,})['"]?/gi,
    severity: 'HIGH'
  },
  // Private Keys
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA )?PRIVATE KEY-----/gi,
    severity: 'CRITICAL'
  },
  // GitHub Tokens
  {
    name: 'GitHub Token',
    pattern: /(github[_-]?token|gh[_-]?token)\s*[=:]\s*['"]?(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{76})['"]?/gi,
    severity: 'HIGH'
  },
  // Slack Tokens
  {
    name: 'Slack Token',
    pattern: /(slack[_-]?token|slack[_-]?webhook)\s*[=:]\s*['"]?(xox[baprs]-[a-zA-Z0-9-]+)['"]?/gi,
    severity: 'HIGH'
  },
  // Stripe Keys
  {
    name: 'Stripe Key',
    pattern: /(stripe[_-]?key|stripe[_-]?secret)\s*[=:]\s*['"]?(sk_[a-zA-Z0-9]{24}|pk_[a-zA-Z0-9]{24})['"]?/gi,
    severity: 'HIGH'
  },
  // Email/Password combinations
  {
    name: 'Password',
    pattern: /(password|passwd|pwd)\s*[=:]\s*['"]?([^'"\s]{8,})['"]?/gi,
    severity: 'MEDIUM'
  }
];

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '*.log',
  '*.tmp',
  '*.temp',
  'CHANGELOG.md',
  'RELEASE_NOTES_*.md',
  'package-lock.json',
  'yarn.lock'
];

// Function to check if file should be excluded
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

// Function to scan file for secrets
function scanFile(filePath) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    SECRET_PATTERNS.forEach(({ name, pattern, severity }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        results.push({
          file: filePath,
          type: name,
          severity,
          match: match[0],
          line: content.substring(0, match.index).split('\n').length
        });
      }
    });
  } catch (error) {
    log.warn(`Could not read file ${filePath}: ${error.message}`);
  }
  
  return results;
}

// Function to scan directory recursively
function scanDirectory(dirPath) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      
      if (shouldExcludeFile(fullPath)) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        results.push(...scanDirectory(fullPath));
      } else if (stat.isFile()) {
        results.push(...scanFile(fullPath));
      }
    }
  } catch (error) {
    log.warn(`Could not scan directory ${dirPath}: ${error.message}`);
  }
  
  return results;
}

// Function to generate report
function generateReport(results) {
  if (results.length === 0) {
    log.success('No secrets found!');
    return;
  }
  
  log.error(`Found ${results.length} potential secrets:`);
  
  // Group by severity
  const bySeverity = results.reduce((acc, result) => {
    if (!acc[result.severity]) {
      acc[result.severity] = [];
    }
    acc[result.severity].push(result);
    return acc;
  }, {});
  
  // Print by severity
  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
    if (bySeverity[severity]) {
      const color = severity === 'CRITICAL' ? colors.red : 
                   severity === 'HIGH' ? colors.yellow : colors.blue;
      console.log(`\n${color}${severity}${colors.reset}:`);
      
      bySeverity[severity].forEach(result => {
        console.log(`  ${result.file}:${result.line}`);
        console.log(`    ${result.type}: ${result.match.substring(0, 50)}...`);
      });
    }
  });
  
  // Save detailed report
  const reportPath = 'security-scan-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log.info(`Detailed report saved to ${reportPath}`);
}

// Main function
function main() {
  const startDir = process.argv[2] || '.';
  
  log.info('Starting secret scan...');
  log.info(`Scanning directory: ${startDir}`);
  
  const results = scanDirectory(startDir);
  generateReport(results);
  
  // Exit with error code if critical or high severity secrets found
  const criticalHighCount = results.filter(r => 
    r.severity === 'CRITICAL' || r.severity === 'HIGH'
  ).length;
  
  if (criticalHighCount > 0) {
    log.error(`Found ${criticalHighCount} critical/high severity secrets`);
    process.exit(1);
  }
  
  log.success('Secret scan completed successfully');
}

// Run main function
main();
