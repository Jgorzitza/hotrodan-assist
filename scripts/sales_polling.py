#!/usr/bin/env python3
"""
Sales Insights Polling Script
Part of sales.insights-v1 prep work

This script polls the coordination and direction files every 5 minutes
to check for updates as required by the sales direction.
"""

import os
import time
import subprocess
from datetime import datetime
from pathlib import Path


def check_file_updates():
    """Check for updates in coordination and direction files"""
    base_path = Path(__file__).parent.parent
    coordination_file = base_path / "coordination" / "GO-SIGNAL.md"
    direction_file = base_path / "plans" / "agents" / "sales" / "direction.md"
    
    # Check if files exist
    if not coordination_file.exists():
        print(f"⚠️  Coordination file not found: {coordination_file}")
        return False
    
    if not direction_file.exists():
        print(f"⚠️  Direction file not found: {direction_file}")
        return False
    
    # Get file modification times
    coord_mtime = coordination_file.stat().st_mtime
    direction_mtime = direction_file.stat().st_mtime
    
    current_time = time.time()
    
    # Check if files were modified in the last 5 minutes
    coord_recent = (current_time - coord_mtime) < 300  # 5 minutes
    direction_recent = (current_time - direction_mtime) < 300  # 5 minutes
    
    if coord_recent:
        print(f"🔄 Coordination file updated: {coordination_file}")
        print(f"   Last modified: {datetime.fromtimestamp(coord_mtime)}")
    
    if direction_recent:
        print(f"🔄 Direction file updated: {direction_file}")
        print(f"   Last modified: {datetime.fromtimestamp(direction_mtime)}")
    
    return coord_recent or direction_recent


def run_polling_loop():
    """Run the polling loop every 5 minutes"""
    print("🚀 Starting Sales Insights Polling...")
    print("   Checking for updates every 5 minutes")
    print("   Press Ctrl+C to stop")
    print()
    
    try:
        while True:
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{current_time}] Checking for updates...")
            
            if check_file_updates():
                print("✅ Updates detected! Action may be required.")
            else:
                print("⏳ No updates detected.")
            
            print("-" * 50)
            
            # Wait 5 minutes (300 seconds)
            time.sleep(300)
            
    except KeyboardInterrupt:
        print("\n🛑 Polling stopped by user")
    except Exception as e:
        print(f"\n❌ Error in polling loop: {e}")


def check_files_once():
    """Check files once and exit"""
    print("🔍 Checking Sales Insights files...")
    print()
    
    if check_file_updates():
        print("✅ Updates detected!")
        return True
    else:
        print("⏳ No updates detected.")
        return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        # Check once and exit
        check_files_once()
    else:
        # Run continuous polling
        run_polling_loop()
