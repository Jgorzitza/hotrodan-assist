#!/bin/bash

# Comprehensive security scanning script for Llama RAG project
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SECURITY]${NC} $1"
}

# Function to run secret scanning
run_secret_scan() {
    print_header "Running secret scanning..."
    
    if [ -f "tools/security/secret-scan.js" ]; then
        node tools/security/secret-scan.js
        if [ $? -eq 0 ]; then
            print_status "Secret scanning completed successfully"
        else
            print_error "Secret scanning found issues"
            return 1
        fi
    else
        print_warning "Secret scanning script not found"
        return 1
    fi
}

# Function to run license checking
run_license_check() {
    print_header "Running license checking..."
    
    if [ -f "tools/security/license-check.js" ]; then
        node tools/security/license-check.js
        if [ $? -eq 0 ]; then
            print_status "License checking completed successfully"
        else
            print_error "License checking found issues"
            return 1
        fi
    else
        print_warning "License checking script not found"
        return 1
    fi
}

# Function to run npm audit
run_npm_audit() {
    print_header "Running npm security audit..."
    
    npm audit --audit-level=moderate
    if [ $? -eq 0 ]; then
        print_status "npm audit completed successfully"
    else
        print_warning "npm audit found vulnerabilities"
        print_status "Run 'npm audit fix' to fix auto-fixable issues"
    fi
}

# Function to run Snyk security scan
run_snyk_scan() {
    print_header "Running Snyk security scan..."
    
    if command -v snyk &> /dev/null; then
        snyk test
        if [ $? -eq 0 ]; then
            print_status "Snyk scan completed successfully"
        else
            print_warning "Snyk scan found vulnerabilities"
        fi
    else
        print_warning "Snyk not installed. Install with: npm install -g snyk"
        print_status "Skipping Snyk scan"
    fi
}

# Function to check for security headers in configuration
check_security_headers() {
    print_header "Checking security headers configuration..."
    
    # Check for security-related configuration files
    local security_files=(
        ".env.example"
        "security/"
        "tools/security/"
    )
    
    for file in "${security_files[@]}"; do
        if [ -e "$file" ]; then
            print_status "Found security configuration: $file"
        else
            print_warning "Missing security configuration: $file"
        fi
    done
}

# Function to check for hardcoded secrets in common files
check_hardcoded_secrets() {
    print_header "Checking for hardcoded secrets..."
    
    # Common files that might contain secrets
    local secret_files=(
        ".env"
        ".env.local"
        ".env.production"
        "config.js"
        "config.json"
        "docker-compose.yml"
    )
    
    local found_secrets=false
    
    for file in "${secret_files[@]}"; do
        if [ -f "$file" ]; then
            # Check for common secret patterns
            if grep -qE "(password|secret|key|token).*=.*['\"][^'\"]{8,}['\"]" "$file" 2>/dev/null; then
                print_warning "Potential hardcoded secret found in $file"
                found_secrets=true
            fi
        fi
    done
    
    if [ "$found_secrets" = false ]; then
        print_status "No obvious hardcoded secrets found in common files"
    fi
}

# Function to generate security report
generate_security_report() {
    print_header "Generating security report..."
    
    local report_file="security-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << REPORT_EOF
# Security Scan Report

**Date:** $(date)
**Project:** Llama RAG
**Scanner Version:** 1.0.0

## Summary

This report contains the results of comprehensive security scanning for the Llama RAG project.

## Scans Performed

### 1. Secret Scanning
- **Status:** $(if [ -f "security-scan-report.json" ]; then echo "Completed"; else echo "Not performed"; fi)
- **Report:** security-scan-report.json

### 2. License Checking
- **Status:** $(if [ -f "license-check-report.json" ]; then echo "Completed"; else echo "Not performed"; fi)
- **Report:** license-check-report.json

### 3. Dependency Vulnerability Scan
- **Status:** $(if npm audit --audit-level=moderate >/dev/null 2>&1; then echo "No issues found"; else echo "Issues found"; fi)

### 4. Security Configuration
- **Status:** $(if [ -d "tools/security" ]; then echo "Configured"; else echo "Not configured"; fi)

## Recommendations

1. **Regular Scanning:** Run security scans before each release
2. **Dependency Updates:** Keep dependencies up to date
3. **Secret Management:** Use environment variables for secrets
4. **License Compliance:** Review and approve all third-party licenses

## Next Steps

- Review any issues found in the reports
- Update dependencies if vulnerabilities are found
- Implement security best practices
- Set up automated security scanning in CI/CD

REPORT_EOF

    print_status "Security report generated: $report_file"
}

# Function to clean up temporary files
cleanup() {
    print_status "Cleaning up temporary files..."
    
    # Remove temporary reports if they exist
    rm -f security-scan-report.json
    rm -f license-check-report.json
}

# Main function
main() {
    local scan_type=${1:-all}
    
    print_header "Starting security scan: $scan_type"
    
    local exit_code=0
    
    case $scan_type in
        "secrets"|"all")
            if ! run_secret_scan; then
                exit_code=1
            fi
            ;;
    esac
    
    case $scan_type in
        "licenses"|"all")
            if ! run_license_check; then
                exit_code=1
            fi
            ;;
    esac
    
    case $scan_type in
        "audit"|"all")
            run_npm_audit
            ;;
    esac
    
    case $scan_type in
        "snyk"|"all")
            run_snyk_scan
            ;;
    esac
    
    if [ "$scan_type" = "all" ]; then
        check_security_headers
        check_hardcoded_secrets
        generate_security_report
    fi
    
    if [ $exit_code -eq 0 ]; then
        print_header "Security scan completed successfully!"
    else
        print_error "Security scan completed with issues"
        print_warning "Please review the reports and fix any issues found"
    fi
    
    # Ask if user wants to clean up
    read -p "Do you want to clean up temporary files? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
    
    exit $exit_code
}

# Run main function with arguments
main "$@"
