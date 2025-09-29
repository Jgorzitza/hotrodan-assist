#!/usr/bin/env python3
"""
Overnight Enterprise Audit - Continuous Quality Monitoring System
Quality Engineer: Continuous monitoring with feedback to Manager only
"""

import os
import sys
import time
import json
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/justin/llama_rag/logs/quality-audit.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QualityEngineer:
    """Quality Engineer for overnight enterprise audit."""
    
    def __init__(self, repo_path: str = "/home/justin/llama_rag"):
        self.repo_path = Path(repo_path)
        self.logs_dir = self.repo_path / "logs"
        self.feedback_dir = self.repo_path / "feedback"
        self.quality_metrics = {}
        self.critical_issues = []
        self.audit_start_time = datetime.now()
        
        # Ensure directories exist
        self.logs_dir.mkdir(exist_ok=True)
        self.feedback_dir.mkdir(exist_ok=True)
        
        logger.info("🔍 QUALITY ENGINEER: Initializing overnight enterprise audit")
        logger.info("📋 Following instructions for quality.overnight-enterprise-audit")
        logger.info("⚠️ HIERARCHY: FEEDBACK TO MANAGER ONLY")
    
    def run_command(self, cmd: List[str], cwd: Optional[str] = None, timeout: int = 300) -> Tuple[int, str, str]:
        """Run a command and return exit code, stdout, stderr."""
        try:
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                cwd=cwd or str(self.repo_path),
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out after {timeout} seconds: {' '.join(cmd)}")
            return 1, "", "Command timed out"
        except Exception as e:
            logger.error(f"Command failed: {e}")
            return 1, "", str(e)
    
    def check_python_quality(self) -> Dict[str, any]:
        """Check Python code quality using Black and Ruff."""
        logger.info("🔍 Checking Python code quality...")
        
        results = {
            "black": {"status": "UNKNOWN", "details": ""},
            "ruff": {"status": "UNKNOWN", "details": ""},
            "mypy": {"status": "UNKNOWN", "details": ""}
        }
        
        # Check Black formatting
        exit_code, stdout, stderr = self.run_command(["black", "--check", "--diff", "app/"])
        if exit_code == 0:
            results["black"]["status"] = "PASS"
            results["black"]["details"] = "Code formatting is correct"
        else:
            results["black"]["status"] = "FAIL"
            results["black"]["details"] = f"Formatting issues found: {stdout}"
            self.critical_issues.append("Python code formatting issues detected")
        
        # Check Ruff linting
        exit_code, stdout, stderr = self.run_command(["ruff", "check", "app/"])
        if exit_code == 0:
            results["ruff"]["status"] = "PASS"
            results["ruff"]["details"] = "No linting issues found"
        else:
            results["ruff"]["status"] = "FAIL"
            results["ruff"]["details"] = f"Linting issues: {stdout}"
            self.critical_issues.append("Python linting issues detected")
        
        # Check MyPy type checking
        exit_code, stdout, stderr = self.run_command(["mypy", "app/"])
        if exit_code == 0:
            results["mypy"]["status"] = "PASS"
            results["mypy"]["details"] = "Type checking passed"
        else:
            results["mypy"]["status"] = "WARN"
            results["mypy"]["details"] = f"Type checking warnings: {stdout}"
        
        return results
    
    def check_node_quality(self) -> Dict[str, any]:
        """Check Node.js code quality and tests."""
        logger.info("🧪 Checking Node.js quality...")
        
        results = {
            "tests": {"status": "UNKNOWN", "details": ""},
            "lint": {"status": "UNKNOWN", "details": ""},
            "build": {"status": "UNKNOWN", "details": ""}
        }
        
        # Check if package.json exists
        if not (self.repo_path / "package.json").exists():
            results["tests"]["status"] = "SKIP"
            results["tests"]["details"] = "No Node.js project found"
            return results
        
        # Run tests
        exit_code, stdout, stderr = self.run_command(["npm", "test", "--", "--run"])
        if exit_code == 0:
            results["tests"]["status"] = "PASS"
            results["tests"]["details"] = "All tests passed"
        else:
            results["tests"]["status"] = "FAIL"
            results["tests"]["details"] = f"Tests failed: {stderr}"
            self.critical_issues.append("Node.js tests failed")
        
        # Check linting
        exit_code, stdout, stderr = self.run_command(["npm", "run", "lint"])
        if exit_code == 0:
            results["lint"]["status"] = "PASS"
            results["lint"]["details"] = "Linting passed"
        else:
            results["lint"]["status"] = "WARN"
            results["lint"]["details"] = f"Linting issues: {stderr}"
        
        # Check build
        exit_code, stdout, stderr = self.run_command(["npm", "run", "build"])
        if exit_code == 0:
            results["build"]["status"] = "PASS"
            results["build"]["details"] = "Build successful"
        else:
            results["build"]["status"] = "FAIL"
            results["build"]["details"] = f"Build failed: {stderr}"
            self.critical_issues.append("Node.js build failed")
        
        return results
    
    def check_system_health(self) -> Dict[str, any]:
        """Check system health and resource usage."""
        logger.info("🏥 Checking system health...")
        
        results = {
            "disk_space": {"status": "UNKNOWN", "details": ""},
            "memory": {"status": "UNKNOWN", "details": ""},
            "processes": {"status": "UNKNOWN", "details": ""}
        }
        
        # Check disk space
        exit_code, stdout, stderr = self.run_command(["df", "-h", str(self.repo_path)])
        if exit_code == 0:
            lines = stdout.strip().split('\n')
            if len(lines) > 1:
                usage = lines[1].split()
                if len(usage) >= 5:
                    usage_pct = usage[4].replace('%', '')
                    try:
                        usage_int = int(usage_pct)
                        if usage_int > 90:
                            results["disk_space"]["status"] = "CRITICAL"
                            results["disk_space"]["details"] = f"Disk usage: {usage_pct}%"
                            self.critical_issues.append("Critical disk space usage")
                        elif usage_int > 80:
                            results["disk_space"]["status"] = "WARN"
                            results["disk_space"]["details"] = f"Disk usage: {usage_pct}%"
                        else:
                            results["disk_space"]["status"] = "OK"
                            results["disk_space"]["details"] = f"Disk usage: {usage_pct}%"
                    except ValueError:
                        results["disk_space"]["status"] = "UNKNOWN"
                        results["disk_space"]["details"] = "Could not parse disk usage"
        
        # Check memory usage
        exit_code, stdout, stderr = self.run_command(["free", "-h"])
        if exit_code == 0:
            lines = stdout.strip().split('\n')
            if len(lines) > 1:
                mem_line = lines[1].split()
                if len(mem_line) >= 7:
                    results["memory"]["status"] = "OK"
                    results["memory"]["details"] = f"Memory: {mem_line[2]}/{mem_line[1]} used"
        
        # Check critical processes
        critical_processes = ["python", "node", "chroma"]
        running_processes = []
        for proc in critical_processes:
            exit_code, stdout, stderr = self.run_command(["pgrep", "-f", proc])
            if exit_code == 0 and stdout.strip():
                running_processes.append(proc)
        
        if len(running_processes) >= 2:  # At least Python and one other
            results["processes"]["status"] = "OK"
            results["processes"]["details"] = f"Critical processes running: {', '.join(running_processes)}"
        else:
            results["processes"]["status"] = "WARN"
            results["processes"]["details"] = f"Limited processes running: {', '.join(running_processes)}"
        
        return results
    
    def check_security(self) -> Dict[str, any]:
        """Check security vulnerabilities and compliance."""
        logger.info("🔒 Checking security...")
        
        results = {
            "dependencies": {"status": "UNKNOWN", "details": ""},
            "secrets": {"status": "UNKNOWN", "details": ""},
            "permissions": {"status": "UNKNOWN", "details": ""}
        }
        
        # Check for hardcoded secrets (basic check)
        secret_patterns = ["password", "secret", "key", "token", "api_key"]
        secret_files = []
        
        for pattern in secret_patterns:
            exit_code, stdout, stderr = self.run_command(
                ["grep", "-r", "-i", f"--include=*.py", f"--include=*.js", f"--include=*.ts", 
                 f"--include=*.json", pattern, "app/", "dashboard/"]
            )
            if exit_code == 0 and stdout.strip():
                lines = stdout.strip().split('\n')
                for line in lines:
                    if any(secret in line.lower() for secret in ["password=", "secret=", "api_key=", "token="]):
                        if not any(skip in line.lower() for skip in ["example", "placeholder", "your_"]):
                            secret_files.append(line.strip())
        
        if secret_files:
            results["secrets"]["status"] = "CRITICAL"
            results["secrets"]["details"] = f"Potential hardcoded secrets found: {len(secret_files)} instances"
            self.critical_issues.append("Potential hardcoded secrets detected")
        else:
            results["secrets"]["status"] = "OK"
            results["secrets"]["details"] = "No obvious hardcoded secrets found"
        
        # Check file permissions
        exit_code, stdout, stderr = self.run_command(["find", "app/", "dashboard/", "-type", "f", "-perm", "777"])
        if exit_code == 0 and stdout.strip():
            results["permissions"]["status"] = "WARN"
            results["permissions"]["details"] = "Files with overly permissive permissions found"
        else:
            results["permissions"]["status"] = "OK"
            results["permissions"]["details"] = "File permissions look secure"
        
        return results
    
    def generate_quality_report(self) -> Dict[str, any]:
        """Generate comprehensive quality report."""
        report = {
            "timestamp": datetime.now().isoformat(),
            "audit_duration": str(datetime.now() - self.audit_start_time),
            "python_quality": self.check_python_quality(),
            "node_quality": self.check_node_quality(),
            "system_health": self.check_system_health(),
            "security": self.check_security(),
            "critical_issues": self.critical_issues.copy(),
            "overall_status": "UNKNOWN"
        }
        
        # Determine overall status
        critical_count = len(self.critical_issues)
        if critical_count == 0:
            report["overall_status"] = "HEALTHY"
        elif critical_count <= 2:
            report["overall_status"] = "WARNING"
        else:
            report["overall_status"] = "CRITICAL"
        
        return report
    
    def save_quality_report(self, report: Dict[str, any]):
        """Save quality report to file."""
        report_file = self.logs_dir / f"quality-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"📊 Quality report saved to {report_file}")
    
    def report_to_manager(self, report: Dict[str, any]):
        """Report critical issues to manager."""
        if not self.critical_issues:
            return
        
        manager_feedback = f"""# Quality Engineer Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## CRITICAL ISSUES DETECTED

"""
        
        for i, issue in enumerate(self.critical_issues, 1):
            manager_feedback += f"{i}. {issue}\n"
        
        manager_feedback += f"""
## Overall Status: {report['overall_status']}

## Detailed Report
- Python Quality: {report['python_quality']['black']['status']} / {report['python_quality']['ruff']['status']}
- Node.js Quality: {report['node_quality']['tests']['status']} / {report['node_quality']['build']['status']}
- System Health: {report['system_health']['disk_space']['status']} / {report['system_health']['memory']['status']}
- Security: {report['security']['secrets']['status']} / {report['security']['permissions']['status']}

## Action Required
Please review and address the critical issues listed above.

---
Quality Engineer - Overnight Enterprise Audit
"""
        
        feedback_file = self.feedback_dir / "manager.md"
        with open(feedback_file, 'a') as f:
            f.write(manager_feedback)
        
        logger.warning(f"⚠️ CRITICAL ISSUES REPORTED TO MANAGER: {len(self.critical_issues)} issues")
    
    def run_audit_cycle(self):
        """Run a single audit cycle."""
        logger.info("🔄 Starting quality audit cycle...")
        
        # Clear previous critical issues
        self.critical_issues.clear()
        
        # Generate comprehensive report
        report = self.generate_quality_report()
        
        # Save report
        self.save_quality_report(report)
        
        # Report to manager if critical issues found
        if self.critical_issues:
            self.report_to_manager(report)
        
        # Log summary
        logger.info(f"✅ Audit cycle complete - Status: {report['overall_status']}")
        if self.critical_issues:
            logger.warning(f"⚠️ {len(self.critical_issues)} critical issues detected")
        else:
            logger.info("✅ No critical issues detected")
    
    def run_continuous_audit(self):
        """Run continuous overnight enterprise audit."""
        logger.info("🌙 Starting overnight enterprise audit...")
        logger.info("🔄 Working continuously...")
        
        cycle_count = 0
        while True:
            try:
                cycle_count += 1
                logger.info(f"🔄 Quality: Starting audit cycle #{cycle_count}")
                
                self.run_audit_cycle()
                
                # Wait 5 minutes before next cycle
                logger.info("⏰ Waiting 5 minutes before next audit cycle...")
                time.sleep(300)  # 5 minutes
                
            except KeyboardInterrupt:
                logger.info("🛑 Audit stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Error in audit cycle: {e}")
                # Continue running despite errors
                time.sleep(60)  # Wait 1 minute before retry

def main():
    """Main entry point."""
    print("🔍 QUALITY ENGINEER: Reading plans/agents/quality/direction.md")
    print("📋 Following instructions for quality.overnight-enterprise-audit")
    print("⚠️ HIERARCHY: FEEDBACK TO MANAGER ONLY")
    print("🔄 Working continuously...")
    
    # Initialize quality engineer
    qe = QualityEngineer()
    
    # Run continuous audit
    qe.run_continuous_audit()

if __name__ == "__main__":
    main()
