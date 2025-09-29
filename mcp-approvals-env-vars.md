# MCP Approvals Service Environment Variables

## Required Environment Variables

```bash
# MCP Approvals Service Configuration
MCP_APPROVALS_ENABLED=true
MCP_APPROVALS_ENDPOINT=http://localhost:3001/mcp/approvals
MCP_APPROVALS_API_KEY=your_api_key_here
MCP_APPROVALS_TIMEOUT_MS=30000
MCP_APPROVALS_MAX_RETRIES=3

# RAG Integration
RAG_ENDPOINT=http://localhost:8000/rag/query
RAG_MODEL=llama3.1
RAG_CONTEXT_WINDOW=4000
RAG_TEMPERATURE=0.7
RAG_MAX_TOKENS=512

# Shopify Integration
SHOPIFY_API_ENDPOINT=https://api.shopify.com
SHOPIFY_API_VERSION=2023-10
SHOPIFY_RATE_LIMIT_REQUESTS=40
SHOPIFY_RATE_LIMIT_WINDOW=1s

# Analytics Integration
ANALYTICS_ENDPOINT=http://localhost:3002/analytics
ANALYTICS_METRICS=response_time,approval_rate,customer_satisfaction

# Security
MCP_ENCRYPTION_ENABLED=true
MCP_ENCRYPTION_ALGORITHM=AES-256-GCM
MCP_AUDIT_ENABLED=true
MCP_AUDIT_RETENTION_DAYS=90

# Monitoring
MCP_MONITORING_ENABLED=true
MCP_METRICS_RESPONSE_TIME_THRESHOLD=5000
MCP_METRICS_ERROR_RATE_THRESHOLD=0.05
MCP_METRICS_APPROVAL_RATE_THRESHOLD=0.8

# Logging
MCP_LOG_LEVEL=info
MCP_LOG_RETENTION_DAYS=30
MCP_LOG_INCLUDE_SENSITIVE_DATA=false

# Auto-Approval Configuration
MCP_AUTO_APPROVAL_ENABLED=false
MCP_AUTO_APPROVAL_CONFIDENCE_THRESHOLD=0.9
MCP_AUTO_APPROVAL_RISK_CATEGORIES=low,medium

# Escalation Configuration
MCP_ESCALATION_ENABLED=true
MCP_ESCALATION_MAX_WAIT_TIME_MS=3600000
MCP_ESCALATION_LEVELS=supervisor,manager,director
```

## Usage Instructions

1. Copy the JSON configuration to your MCP service configuration file
2. Set the environment variables in your deployment environment
3. Update the API keys and endpoints to match your actual service URLs
4. Configure the rate limits based on your service capacity
5. Adjust the monitoring thresholds based on your performance requirements

## Integration Points

- **RAG Service**: Provides context and draft generation for customer inquiries
- **Shopify API**: Fetches customer data, order history, and product information
- **Analytics Service**: Tracks performance metrics and customer satisfaction
- **Approvals UI**: Dashboard interface for managing approval workflows
