#!/usr/bin/env node

// License checker script for Llama RAG project
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

// Allowed licenses
const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  'Public Domain',
  'CC0-1.0',
  'CC-BY-4.0',
  'LGPL-2.1',
  'LGPL-3.0'
];

// Disallowed licenses
const DISALLOWED_LICENSES = [
  'GPL-2.0',
  'GPL-3.0',
  'AGPL-1.0',
  'AGPL-3.0',
  'Copyleft',
  'Proprietary'
];

// License compatibility matrix
const LICENSE_COMPATIBILITY = {
  'MIT': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense'],
  'Apache-2.0': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  'BSD-2-Clause': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  'BSD-3-Clause': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  'ISC': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  'LGPL-2.1': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'LGPL-2.1'],
  'LGPL-3.0': ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'LGPL-3.0']
};

// Function to get license information using license-checker
function getLicenseInfo() {
  try {
    log.info('Running license-checker...');
    const output = execSync('npx license-checker --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    log.error('Failed to run license-checker: ' + error.message);
    return {};
  }
}

// Function to check license compatibility
function checkLicenseCompatibility(license, projectLicense = 'MIT') {
  if (!LICENSE_COMPATIBILITY[projectLicense]) {
    return { compatible: false, reason: 'Unknown project license' };
  }
  
  const compatibleLicenses = LICENSE_COMPATIBILITY[projectLicense];
  
  // Check if any of the package licenses are compatible
  const packageLicenses = license.split(/\s+(?:AND|OR)\s+/);
  
  for (const pkgLicense of packageLicenses) {
    if (compatibleLicenses.includes(pkgLicense.trim())) {
      return { compatible: true, reason: `${pkgLicense} is compatible with ${projectLicense}` };
    }
  }
  
  return { 
    compatible: false, 
    reason: `${license} is not compatible with ${projectLicense}` 
  };
}

// Function to check if license is allowed
function isLicenseAllowed(license) {
  const licenses = license.split(/\s+(?:AND|OR)\s+/);
  
  for (const lic of licenses) {
    if (DISALLOWED_LICENSES.includes(lic.trim())) {
      return { allowed: false, reason: `${lic} is disallowed` };
    }
  }
  
  for (const lic of licenses) {
    if (ALLOWED_LICENSES.includes(lic.trim())) {
      return { allowed: true, reason: `${lic} is allowed` };
    }
  }
  
  return { allowed: false, reason: 'Unknown license type' };
}

// Function to generate license report
function generateLicenseReport(licenseInfo) {
  const report = {
    summary: {
      total: 0,
      allowed: 0,
      disallowed: 0,
      compatible: 0,
      incompatible: 0,
      unknown: 0
    },
    packages: [],
    issues: []
  };
  
  Object.entries(licenseInfo).forEach(([packageName, info]) => {
    report.summary.total++;
    
    const license = info.licenses || 'Unknown';
    const allowed = isLicenseAllowed(license);
    const compatible = checkLicenseCompatibility(license);
    
    const packageInfo = {
      name: packageName,
      license: license,
      allowed: allowed.allowed,
      compatible: compatible.compatible,
      reason: allowed.reason || compatible.reason
    };
    
    report.packages.push(packageInfo);
    
    if (allowed.allowed) {
      report.summary.allowed++;
    } else {
      report.summary.disallowed++;
      report.issues.push({
        type: 'disallowed',
        package: packageName,
        license: license,
        reason: allowed.reason
      });
    }
    
    if (compatible.compatible) {
      report.summary.compatible++;
    } else {
      report.summary.incompatible++;
      report.issues.push({
        type: 'incompatible',
        package: packageName,
        license: license,
        reason: compatible.reason
      });
    }
    
    if (license === 'Unknown') {
      report.summary.unknown++;
    }
  });
  
  return report;
}

// Function to print report
function printReport(report) {
  log.info('License Check Report');
  log.info('==================');
  
  console.log(`\nSummary:`);
  console.log(`  Total packages: ${report.summary.total}`);
  console.log(`  Allowed licenses: ${report.summary.allowed}`);
  console.log(`  Disallowed licenses: ${report.summary.disallowed}`);
  console.log(`  Compatible licenses: ${report.summary.compatible}`);
  console.log(`  Incompatible licenses: ${report.summary.incompatible}`);
  console.log(`  Unknown licenses: ${report.summary.unknown}`);
  
  if (report.issues.length > 0) {
    console.log(`\n${colors.red}Issues Found:${colors.reset}`);
    
    report.issues.forEach(issue => {
      console.log(`\n${colors.yellow}${issue.type.toUpperCase()}${colors.reset}: ${issue.package}`);
      console.log(`  License: ${issue.license}`);
      console.log(`  Reason: ${issue.reason}`);
    });
  } else {
    log.success('No license issues found!');
  }
}

// Function to save report
function saveReport(report) {
  const reportPath = 'license-check-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.info(`Detailed report saved to ${reportPath}`);
}

// Function to check for license files
function checkLicenseFiles() {
  const licenseFiles = [
    'LICENSE',
    'LICENSE.txt',
    'LICENSE.md',
    'COPYING',
    'COPYING.txt'
  ];
  
  const foundFiles = licenseFiles.filter(file => {
    try {
      fs.accessSync(file);
      return true;
    } catch {
      return false;
    }
  });
  
  if (foundFiles.length === 0) {
    log.warn('No license file found in project root');
    log.info('Consider adding a LICENSE file');
  } else {
    log.success(`Found license files: ${foundFiles.join(', ')}`);
  }
  
  return foundFiles;
}

// Main function
function main() {
  log.info('Starting license check...');
  
  // Check for license files
  checkLicenseFiles();
  
  // Get license information
  const licenseInfo = getLicenseInfo();
  
  if (Object.keys(licenseInfo).length === 0) {
    log.error('No license information found');
    process.exit(1);
  }
  
  // Generate report
  const report = generateLicenseReport(licenseInfo);
  
  // Print report
  printReport(report);
  
  // Save report
  saveReport(report);
  
  // Exit with error code if issues found
  if (report.issues.length > 0) {
    log.error(`Found ${report.issues.length} license issues`);
    process.exit(1);
  }
  
  log.success('License check completed successfully');
}

// Run main function
main();
