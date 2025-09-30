#!/bin/bash
# Setup Prometheus & Grafana monitoring stack

set -e

echo "📊 Setting up Prometheus & Grafana monitoring..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker required. Install from: https://www.docker.com/get-started"
    exit 1
fi

mkdir -p /tmp/prometheus_data
mkdir -p /tmp/grafana_data

echo "Starting Prometheus..."
docker run -d \
  --name llama-rag-prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v /tmp/prometheus_data:/prometheus \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus || echo "Prometheus already running"

echo "Starting Grafana..."
docker run -d \
  --name llama-rag-grafana \
  -p 3001:3000 \
  -v /tmp/grafana_data:/var/lib/grafana \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana:latest || echo "Grafana already running"

echo ""
echo "✅ Monitoring stack started!"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3001 (admin/admin)"
