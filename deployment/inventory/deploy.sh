#!/bin/bash
set -e

echo "Starting inventory API deployment..."

# Build Docker image
echo "Building Docker image..."
docker build -t inventory-api:latest .

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for API to be ready
echo "Waiting for API to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:8004/health >/dev/null 2>&1; then
        echo "API is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Run tests
echo "Running production tests..."
python test_production_deployment.py

echo "Deployment complete!"
echo "API available at: http://localhost:8004"
echo "Health check: http://localhost:8004/health"
echo "API docs: http://localhost:8004/docs"
