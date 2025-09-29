#!/bin/bash

# Production Optimizer for Llama RAG
# Comprehensive production optimization and monitoring setup
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
    echo -e "${BLUE}[PRODUCTION]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check system requirements
check_production_requirements() {
    print_step "Checking production system requirements..."
    
    local missing_deps=()
    
    # Check Node.js version
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("Node.js (v18+)")
    else
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo $node_version | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            missing_deps+=("Node.js v18+ (current: v$node_version)")
        else
            print_status "Node.js v$node_version ✓"
        fi
    fi
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
    if [ "$available_memory" -lt 2 ]; then
        print_warning "Low available memory: ${available_memory}GB (recommended: 2GB+)"
    else
        print_status "Available memory: ${available_memory}GB ✓"
    fi
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        print_warning "High disk usage: ${disk_usage}% (recommended: <85%)"
    else
        print_status "Disk usage: ${disk_usage}% ✓"
    fi
    
    # Check network connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        print_status "Network connectivity ✓"
    else
        print_warning "Network connectivity issues detected"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing production requirements:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        return 1
    fi
    
    print_status "All production requirements met ✓"
}

# Function to setup production environment
setup_production_environment() {
    print_step "Setting up production environment..."
    
    # Create production directories
    local prod_dirs=(
        "logs"
        "logs/performance"
        "logs/errors"
        "logs/system"
        "data/production"
        "backups"
        "monitoring"
    )
    
    for dir in "${prod_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    # Create production environment file
    if [ ! -f ".env.production" ]; then
        cat > .env.production << ENV_EOF
# Production Environment Configuration

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/llama_rag_prod"

# Redis
REDIS_URL="redis://localhost:6379"

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
API_TIMEOUT=30000

# Security
JWT_SECRET="$(openssl rand -hex 32)"
SESSION_SECRET="$(openssl rand -hex 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"

# Feature Flags
USE_MOCK_DATA=false
ENABLE_MCP=true
ENABLE_SEO=true
ENABLE_INVENTORY=true
ENABLE_ANALYTICS=true

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true
ENABLE_SYSTEM_MONITORING=true

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
ENABLE_CORS=true
CORS_ORIGIN="https://yourdomain.com"
ENABLE_HELMET=true
ENABLE_CSRF_PROTECTION=true
ENV_EOF
        print_status "Created production environment file"
    else
        print_status "Production environment file already exists ✓"
    fi
    
    # Setup log rotation
    setup_log_rotation
    
    print_status "Production environment setup complete ✓"
}

# Function to setup log rotation
setup_log_rotation() {
    print_step "Setting up log rotation..."
    
    cat > logrotate.conf << LOGROTATE_EOF
# Log rotation configuration for Llama RAG Production

logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        # Reload application if needed
        # kill -USR1 \$(cat /var/run/llama-rag.pid)
    endscript
}

logs/performance/*.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}

logs/errors/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
LOGROTATE_EOF
    
    print_status "Log rotation configuration created ✓"
}

# Function to optimize Node.js for production
optimize_nodejs() {
    print_step "Optimizing Node.js for production..."
    
    # Set production environment variables
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
    
    # Enable garbage collection logging
    export NODE_OPTIONS="$NODE_OPTIONS --trace-gc --trace-gc-verbose"
    
    print_status "Node.js optimization settings applied ✓"
}

# Function to setup monitoring
setup_monitoring() {
    print_step "Setting up production monitoring..."
    
    # Create monitoring configuration
    cat > monitoring/config.json << MONITORING_EOF
{
  "performance": {
    "interval": 30000,
    "logFile": "logs/performance/performance.log",
    "metricsFile": "monitoring/performance-metrics.json",
    "alertThresholds": {
      "memoryUsage": 0.85,
      "cpuUsage": 0.90,
      "responseTime": 1000,
      "errorRate": 0.05
    }
  },
  "errors": {
    "logFile": "logs/errors/error-tracker.log",
    "errorFile": "monitoring/error-details.json",
    "alertFile": "monitoring/error-alerts.json",
    "maxErrors": 1000,
    "alertThresholds": {
      "errorRate": 0.05,
      "consecutiveErrors": 10,
      "criticalErrorRate": 0.01
    }
  },
  "system": {
    "interval": 60000,
    "logFile": "logs/system/system-monitor.log",
    "healthCheckFile": "monitoring/system-health.json",
    "services": [
      { "name": "database", "port": 5432, "type": "tcp" },
      { "name": "redis", "port": 6379, "type": "tcp" },
      { "name": "api", "port": 3000, "type": "http", "endpoint": "/health" },
      { "name": "dashboard", "port": 3001, "type": "http", "endpoint": "/health" }
    ],
    "thresholds": {
      "diskUsage": 0.85,
      "memoryUsage": 0.90,
      "cpuUsage": 0.80,
      "loadAverage": 4.0
    }
  }
}
MONITORING_EOF
    
    print_status "Monitoring configuration created ✓"
}

# Function to start monitoring services
start_monitoring() {
    print_step "Starting production monitoring services..."
    
    # Start performance monitor
    if [ -f "tools/production-optimization/performance-monitor.js" ]; then
        nohup node tools/production-optimization/performance-monitor.js > logs/performance/performance-monitor.log 2>&1 &
        echo $! > monitoring/performance-monitor.pid
        print_status "Performance monitor started (PID: $(cat monitoring/performance-monitor.pid))"
    fi
    
    # Start error tracker
    if [ -f "tools/production-optimization/error-tracker.js" ]; then
        nohup node tools/production-optimization/error-tracker.js > logs/errors/error-tracker.log 2>&1 &
        echo $! > monitoring/error-tracker.pid
        print_status "Error tracker started (PID: $(cat monitoring/error-tracker.pid))"
    fi
    
    # Start system monitor
    if [ -f "tools/production-optimization/system-monitor.js" ]; then
        nohup node tools/production-optimization/system-monitor.js > logs/system/system-monitor.log 2>&1 &
        echo $! > monitoring/system-monitor.pid
        print_status "System monitor started (PID: $(cat monitoring/system-monitor.pid))"
    fi
    
    print_status "All monitoring services started ✓"
}

# Function to stop monitoring services
stop_monitoring() {
    print_step "Stopping monitoring services..."
    
    # Stop performance monitor
    if [ -f "monitoring/performance-monitor.pid" ]; then
        local pid=$(cat monitoring/performance-monitor.pid)
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            print_status "Performance monitor stopped"
        fi
        rm -f monitoring/performance-monitor.pid
    fi
    
    # Stop error tracker
    if [ -f "monitoring/error-tracker.pid" ]; then
        local pid=$(cat monitoring/error-tracker.pid)
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            print_status "Error tracker stopped"
        fi
        rm -f monitoring/error-tracker.pid
    fi
    
    # Stop system monitor
    if [ -f "monitoring/system-monitor.pid" ]; then
        local pid=$(cat monitoring/system-monitor.pid)
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            print_status "System monitor stopped"
        fi
        rm -f monitoring/system-monitor.pid
    fi
    
    print_status "All monitoring services stopped ✓"
}

# Function to generate production report
generate_production_report() {
    print_step "Generating production optimization report..."
    
    local report_file="production-optimization-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << REPORT_EOF
# Production Optimization Report

**Generated**: $(date)
**Environment**: Production
**System**: $(uname -a)

## System Requirements Check

- **Node.js Version**: $(node --version 2>/dev/null || echo "Not installed")
- **Available Memory**: $(free -m | awk 'NR==2{printf "%.0f GB", $7/1024}') GB
- **Disk Usage**: $(df -h . | awk 'NR==2 {print $5}')
- **Network Connectivity**: $(ping -c 1 8.8.8.8 >/dev/null 2>&1 && echo "Good" || echo "Issues detected")

## Production Environment

- **Environment File**: $(test -f .env.production && echo "Configured" || echo "Missing")
- **Log Rotation**: $(test -f logrotate.conf && echo "Configured" || echo "Missing")
- **Monitoring Config**: $(test -f monitoring/config.json && echo "Configured" || echo "Missing")

## Monitoring Services

### Performance Monitor
- **Status**: $(test -f monitoring/performance-monitor.pid && echo "Running (PID: $(cat monitoring/performance-monitor.pid))" || echo "Not running")
- **Log File**: logs/performance/performance.log
- **Metrics File**: monitoring/performance-metrics.json

### Error Tracker
- **Status**: $(test -f monitoring/error-tracker.pid && echo "Running (PID: $(cat monitoring/error-tracker.pid))" || echo "Not running")
- **Log File**: logs/errors/error-tracker.log
- **Error File**: monitoring/error-details.json

### System Monitor
- **Status**: $(test -f monitoring/system-monitor.pid && echo "Running (PID: $(cat monitoring/system-monitor.pid))" || echo "Not running")
- **Log File**: logs/system/system-monitor.log
- **Health File**: monitoring/system-health.json

## Optimization Settings

- **Node.js Environment**: production
- **Memory Limit**: 2GB
- **Garbage Collection**: Enabled with tracing
- **Compression**: Enabled
- **Caching**: Enabled (TTL: 1 hour)
- **Rate Limiting**: 100 requests per 15 minutes

## Security Configuration

- **CORS**: Enabled
- **Helmet**: Enabled
- **CSRF Protection**: Enabled
- **Rate Limiting**: Enabled
- **Security Headers**: Enabled

## Recommendations

1. **Regular Monitoring**: Check monitoring logs daily
2. **Log Rotation**: Ensure log rotation is configured in cron
3. **Backup Strategy**: Implement regular database backups
4. **SSL/TLS**: Configure HTTPS for production
5. **Load Balancing**: Consider load balancing for high traffic
6. **CDN**: Implement CDN for static assets

## Next Steps

1. Configure SSL certificates
2. Set up automated backups
3. Implement health check endpoints
4. Configure alert notifications
5. Set up log aggregation
6. Implement automated scaling

REPORT_EOF
    
    print_status "Production report generated: $report_file"
}

# Function to show production status
show_production_status() {
    print_header "Production Optimization Status"
    
    echo -e "${GREEN}System Requirements:${NC}"
    echo "  Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "  Memory: $(free -m | awk 'NR==2{printf "%.0f GB available", $7/1024}')"
    echo "  Disk: $(df -h . | awk 'NR==2 {print $5} used')"
    
    echo -e "\n${GREEN}Monitoring Services:${NC}"
    echo "  Performance Monitor: $(test -f monitoring/performance-monitor.pid && echo "Running" || echo "Stopped")"
    echo "  Error Tracker: $(test -f monitoring/error-tracker.pid && echo "Running" || echo "Stopped")"
    echo "  System Monitor: $(test -f monitoring/system-monitor.pid && echo "Running" || echo "Stopped")"
    
    echo -e "\n${GREEN}Configuration Files:${NC}"
    echo "  Production Environment: $(test -f .env.production && echo "✓" || echo "✗")"
    echo "  Monitoring Config: $(test -f monitoring/config.json && echo "✓" || echo "✗")"
    echo "  Log Rotation: $(test -f logrotate.conf && echo "✓" || echo "✗")"
    
    echo -e "\n${GREEN}Log Files:${NC}"
    echo "  Performance: logs/performance/performance.log"
    echo "  Errors: logs/errors/error-tracker.log"
    echo "  System: logs/system/system-monitor.log"
}

# Main function
main() {
    local action=${1:-setup}
    
    print_header "Llama RAG Production Optimizer"
    
    case $action in
        "setup")
            check_production_requirements
            setup_production_environment
            optimize_nodejs
            setup_monitoring
            start_monitoring
            generate_production_report
            show_production_status
            ;;
        "start")
            start_monitoring
            show_production_status
            ;;
        "stop")
            stop_monitoring
            ;;
        "status")
            show_production_status
            ;;
        "report")
            generate_production_report
            ;;
        "restart")
            stop_monitoring
            sleep 2
            start_monitoring
            show_production_status
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|status|report|restart}"
            echo ""
            echo "Commands:"
            echo "  setup   - Complete production optimization setup"
            echo "  start   - Start monitoring services"
            echo "  stop    - Stop monitoring services"
            echo "  status  - Show current status"
            echo "  report  - Generate production report"
            echo "  restart - Restart monitoring services"
            exit 1
            ;;
    esac
    
    print_header "Production optimization completed! 🚀"
}

# Run main function with arguments
main "$@"
