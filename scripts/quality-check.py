#!/usr/bin/env python3
"""Quality check script for ongoing monitoring and support."""

import subprocess
import sys
from datetime import datetime
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a command and return exit code, stdout, stderr."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd, timeout=300)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 1, "", "Command timed out after 5 minutes"
    except Exception as e:
        return 1, "", str(e)


def main():
    """Main quality check function."""
    print("🚀 Starting quality check...")
    
    # Check Python linting
    print("🔍 Checking Python code quality...")
    exit_code, stdout, stderr = run_command(["black", "--check", "--diff", "app/"])
    black_status = "✅ PASS" if exit_code == 0 else "❌ FAIL"
    print(f"  Black formatting: {black_status}")
    
    exit_code, stdout, stderr = run_command(["ruff", "check", "app/"])
    ruff_status = "✅ PASS" if exit_code == 0 else "❌ FAIL"
    print(f"  Ruff linting: {ruff_status}")
    
    # Check Node tests
    print("🧪 Checking Node.js tests...")
    exit_code, stdout, stderr = run_command(["npm", "test", "--", "--run"])
    node_status = "✅ PASS" if exit_code == 0 else "❌ FAIL"
    print(f"  Node.js tests: {node_status}")
    
    # Overall status
    if "FAIL" in f"{black_status} {ruff_status} {node_status}":
        print("\n❌ Critical issues found. Please fix before committing.")
        return 1
    else:
        print("\n✅ Quality check completed successfully!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
