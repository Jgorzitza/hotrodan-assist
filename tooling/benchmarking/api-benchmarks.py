"""
API Performance Benchmarking Suite
"""

import time
import requests
import statistics
import json
from pathlib import Path
from datetime import datetime


class APIBenchmark:
    def __init__(self):
        self.results = {}
        self.apis = {
            'inventory': 'http://localhost:8004',
            'mcp': 'http://localhost:8003',
            'dashboard': 'http://localhost:3000',
        }
    
    def benchmark_endpoint(self, name, url, iterations=100):
        print(f"Benchmarking {name}...")
        latencies = []
        errors = 0
        
        for i in range(iterations):
            try:
                start = time.time()
                response = requests.get(url, timeout=10)
                latency = (time.time() - start) * 1000
                
                if response.status_code == 200:
                    latencies.append(latency)
                else:
                    errors += 1
            except Exception:
                errors += 1
        
        if not latencies:
            return {'name': name, 'errors': errors, 'success_rate': 0.0}
        
        latencies.sort()
        return {
            'name': name,
            'url': url,
            'iterations': iterations,
            'errors': errors,
            'success_rate': (len(latencies) / iterations) * 100,
            'p50': latencies[len(latencies) // 2],
            'p95': latencies[int(len(latencies) * 0.95)],
            'p99': latencies[int(len(latencies) * 0.99)],
            'min': min(latencies),
            'max': max(latencies),
            'mean': statistics.mean(latencies),
        }
    
    def run_all_benchmarks(self):
        print("🚀 API Performance Benchmarking\n")
        
        # Inventory API
        results = []
        base_url = self.apis['inventory']
        for name, path in [
            ('Health', '/health'),
            ('Stock Levels', '/api/v1/inventory/stock-levels'),
        ]:
            results.append(self.benchmark_endpoint(name, f'{base_url}{path}', 50))
        self.results['inventory'] = results
        
        # Dashboard
        results = []
        base_url = self.apis['dashboard']
        for name, path in [
            ('Dashboard', '/app'),
        ]:
            results.append(self.benchmark_endpoint(name, f'{base_url}{path}', 30))
        self.results['dashboard'] = results
        
        self.generate_report()
    
    def generate_report(self):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_path = Path(f"../../logs/api_benchmark_{timestamp}.json")
        json_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(json_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n✅ Benchmark complete: {json_path}")


if __name__ == "__main__":
    benchmark = APIBenchmark()
    benchmark.run_all_benchmarks()
