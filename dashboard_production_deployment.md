# Enhanced Dashboard Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the enhanced inventory analytics dashboard to production. The dashboard integrates advanced ML analytics, real-time monitoring, and MCP connector support.

## Architecture

### Components
1. **Enhanced Analytics Service** (`enhanced-analytics.ts`)
2. **Analytics Dashboard** (`EnhancedAnalyticsDashboard.tsx`)
3. **Real-Time Monitoring** (`RealTimeMonitoring.tsx`)
4. **Integration Tests** (`enhanced-analytics.test.tsx`)
5. **MCP Integration** (Shopify, Vendor APIs, Error Handling)

### Technology Stack
- **Frontend**: React 18, TypeScript, Shopify Polaris
- **Backend**: Node.js, Express, FastAPI (Python analytics)
- **Database**: PostgreSQL, Redis (caching)
- **Monitoring**: Prometheus, Grafana
- **Deployment**: Docker, Kubernetes, AWS/GCP

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **Python**: 3.9 or higher
- **Docker**: 20.x or higher
- **Kubernetes**: 1.24 or higher
- **Memory**: 8GB minimum, 16GB recommended
- **CPU**: 4 cores minimum, 8 cores recommended
- **Storage**: 100GB minimum, 500GB recommended

### Dependencies
```json
{
  "dependencies": {
    "@shopify/polaris": "^12.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.0",
    "jest": "^29.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "webpack": "^5.0.0",
    "babel-loader": "^9.0.0",
    "css-loader": "^6.0.0",
    "style-loader": "^3.0.0"
  }
}
```

## Configuration

### Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.yourcompany.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_db
REDIS_URL=redis://localhost:6379

# Analytics
ANALYTICS_ENABLED=true
ML_MODELS_PATH=/app/models
CACHE_TTL=300000

# MCP Integration
SHOPIFY_SHOP_DOMAIN=your-shop
SHOPIFY_ACCESS_TOKEN=your-access-token
VENDOR_API_ENDPOINT=https://vendor-api.com
MCP_CONNECTOR_URL=https://mcp-connector.com

# Monitoring
PROMETHEUS_ENDPOINT=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
LOG_LEVEL=info

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGIN=https://yourdomain.com
```

### Feature Flags Configuration
```json
{
  "flags": [
    {
      "name": "enhanced_analytics_enabled",
      "type": "boolean",
      "default_value": true,
      "description": "Enable enhanced analytics features",
      "environment": "production"
    },
    {
      "name": "real_time_monitoring_enabled",
      "type": "boolean",
      "default_value": true,
      "description": "Enable real-time monitoring",
      "environment": "production"
    },
    {
      "name": "mcp_integration_enabled",
      "type": "boolean",
      "default_value": true,
      "description": "Enable MCP connector integration",
      "environment": "production"
    },
    {
      "name": "auto_refresh_interval",
      "type": "number",
      "default_value": 5000,
      "description": "Auto-refresh interval in milliseconds",
      "environment": "production"
    }
  ]
}
```

## Docker Configuration

### Dockerfile
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM python:3.9-slim AS backend-builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN python -m compileall .

FROM node:18-alpine AS production

WORKDIR /app

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip
COPY --from=backend-builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy frontend build
COPY --from=frontend-builder /app/build ./build
COPY --from=frontend-builder /app/package*.json ./

# Copy backend code
COPY --from=backend-builder /app/*.py ./
COPY --from=backend-builder /app/models ./models

# Install production dependencies
RUN npm ci --only=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/inventory_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      - analytics-api
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  analytics-api:
    build: ./analytics
    ports:
      - "8000:8000"
    environment:
      - PYTHON_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/inventory_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./models:/app/models
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=inventory_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

## Kubernetes Deployment

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: inventory-dashboard
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-config
  namespace: inventory-dashboard
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_BASE_URL: "https://api.yourcompany.com"
  ANALYTICS_ENABLED: "true"
  CACHE_TTL: "300000"
  LOG_LEVEL: "info"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-secrets
  namespace: inventory-dashboard
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  SHOPIFY_ACCESS_TOKEN: <base64-encoded-shopify-token>
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
  namespace: inventory-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
      - name: dashboard
        image: your-registry/inventory-dashboard:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: dashboard-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dashboard-secrets
              key: DATABASE_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dashboard-service
  namespace: inventory-dashboard
spec:
  selector:
    app: dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: inventory-dashboard
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - dashboard.yourcompany.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.yourcompany.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

## Monitoring and Observability

### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "inventory_rules.yml"

scrape_configs:
  - job_name: 'dashboard'
    static_configs:
      - targets: ['dashboard:3000']
    metrics_path: /metrics
    scrape_interval: 5s

  - job_name: 'analytics-api'
    static_configs:
      - targets: ['analytics-api:8000']
    metrics_path: /metrics
    scrape_interval: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Inventory Dashboard Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes",
            "legendFormat": "Memory"
          }
        ]
      }
    ]
  }
}
```

### Health Checks
```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };
  
  res.status(200).json(health);
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  const ready = {
    status: 'ready',
    checks: {
      database: await checkDatabaseConnection(),
      redis: await checkRedisConnection(),
      analytics: await checkAnalyticsService()
    }
  };
  
  const allHealthy = Object.values(ready.checks).every(check => check === true);
  res.status(allHealthy ? 200 : 503).json(ready);
});
```

## Security

### Authentication & Authorization
```typescript
// JWT middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

### CORS Configuration
```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## Performance Optimization

### Caching Strategy
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Cache middleware
const cache = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const originalSend = res.json;
    res.json = function(data) {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

### Database Optimization
```sql
-- Indexes for performance
CREATE INDEX idx_sku_id ON inventory_skus(id);
CREATE INDEX idx_sku_sku ON inventory_skus(sku);
CREATE INDEX idx_sku_vendor ON inventory_skus(vendor_id);
CREATE INDEX idx_sku_status ON inventory_skus(status);
CREATE INDEX idx_sku_created_at ON inventory_skus(created_at);

-- Partitioning for large tables
CREATE TABLE inventory_metrics (
  id SERIAL,
  sku_id VARCHAR(50),
  metric_name VARCHAR(100),
  metric_value DECIMAL(10,2),
  timestamp TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE TABLE inventory_metrics_2024_01 PARTITION OF inventory_metrics
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### CDN Configuration
```yaml
# CloudFront distribution
Resources:
  DashboardDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - DomainName: dashboard.yourcompany.com
            Id: dashboard-origin
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: https-only
        DefaultCacheBehavior:
          TargetOriginId: dashboard-origin
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
        PriceClass: PriceClass_100
        Enabled: true
```

## Deployment Process

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Security scan completed
- [ ] Performance testing completed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Backup strategy in place

### Deployment Steps
1. **Build and Test**
   ```bash
   npm run build
   npm run test
   npm run test:integration
   ```

2. **Build Docker Image**
   ```bash
   docker build -t inventory-dashboard:latest .
   docker tag inventory-dashboard:latest your-registry/inventory-dashboard:latest
   docker push your-registry/inventory-dashboard:latest
   ```

3. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secret.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

4. **Verify Deployment**
   ```bash
   kubectl get pods -n inventory-dashboard
   kubectl get services -n inventory-dashboard
   kubectl get ingress -n inventory-dashboard
   ```

5. **Run Health Checks**
   ```bash
   curl https://dashboard.yourcompany.com/health
   curl https://dashboard.yourcompany.com/ready
   ```

### Rollback Procedure
```bash
# Rollback to previous version
kubectl rollout undo deployment/dashboard -n inventory-dashboard

# Check rollout status
kubectl rollout status deployment/dashboard -n inventory-dashboard

# View rollout history
kubectl rollout history deployment/dashboard -n inventory-dashboard
```

## Maintenance

### Regular Tasks
- **Daily**: Monitor system health and performance
- **Weekly**: Review logs and metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Performance optimization and capacity planning

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U postgres inventory_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli --rdb backup_$(date +%Y%m%d_%H%M%S).rdb

# Configuration backup
kubectl get configmap dashboard-config -n inventory-dashboard -o yaml > config_backup.yaml
```

### Scaling
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dashboard-hpa
  namespace: inventory-dashboard
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dashboard
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Troubleshooting

### Common Issues
1. **High Memory Usage**
   - Check for memory leaks in analytics processing
   - Increase memory limits
   - Optimize data processing algorithms

2. **Slow Response Times**
   - Check database query performance
   - Verify cache hit rates
   - Review network latency

3. **Authentication Errors**
   - Verify JWT secret configuration
   - Check token expiration
   - Validate user permissions

4. **MCP Integration Issues**
   - Check API credentials
   - Verify network connectivity
   - Review error logs

### Debug Commands
```bash
# Check pod logs
kubectl logs -f deployment/dashboard -n inventory-dashboard

# Check resource usage
kubectl top pods -n inventory-dashboard

# Check events
kubectl get events -n inventory-dashboard --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints -n inventory-dashboard
```

## Conclusion

This deployment guide provides comprehensive instructions for deploying the enhanced inventory analytics dashboard to production. The system is designed to be scalable, secure, and maintainable with proper monitoring and observability.

For additional support or questions, refer to the individual component documentation or contact the development team.
