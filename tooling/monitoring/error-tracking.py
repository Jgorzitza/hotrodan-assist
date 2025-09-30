"""
Error Tracking and Log Aggregation
"""

import re
from pathlib import Path
from datetime import datetime
from collections import Counter


class ErrorTracker:
    def __init__(self, log_dir="../../logs"):
        self.log_dir = Path(log_dir)
        self.errors = []
        self.error_pattern = r'(ERROR|CRITICAL|Exception|Traceback|Error|FAIL)'
    
    def scan_log_file(self, log_file):
        """Scan a log file for errors"""
        errors = []
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line_num, line in enumerate(f, 1):
                    if re.search(self.error_pattern, line, re.IGNORECASE):
                        errors.append({
                            'file': str(log_file),
                            'line': line_num,
                            'content': line.strip()[:200],
                        })
        except Exception as e:
            print(f"Error scanning {log_file}: {e}")
        return errors
    
    def scan_all_logs(self):
        """Scan all log files"""
        print("🔍 Scanning logs for errors...\n")
        
        if not self.log_dir.exists():
            print(f"❌ Log directory {self.log_dir} not found")
            return
        
        log_files = list(self.log_dir.glob("*.log")) + list(self.log_dir.glob("*.md"))
        
        for log_file in log_files:
            errors = self.scan_log_file(log_file)
            if errors:
                self.errors.extend(errors)
                print(f"  Found {len(errors)} errors in {log_file.name}")
    
    def generate_report(self):
        """Generate error tracking report"""
        total_errors = len(self.errors)
        
        if total_errors == 0:
            print("\n✅ No errors found in logs!")
            return
        
        print(f"\n📊 Total Errors Found: {total_errors}")
        
        # Group by file
        files = Counter(e['file'] for e in self.errors)
        print("\nErrors by file:")
        for file, count in files.most_common(10):
            print(f"  {Path(file).name}: {count}")


if __name__ == "__main__":
    tracker = ErrorTracker()
    tracker.scan_all_logs()
    tracker.generate_report()
