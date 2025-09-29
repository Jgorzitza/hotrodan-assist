# Low-Stock Webhooks for Slack/Email

This document describes the low-stock alert system with webhook notifications.

## Features

### Alert Channels
- **Slack**: Rich formatted messages with color coding
- **Email**: Detailed text notifications with SMTP

### Urgency Levels
- **Critical**: Stock = 0
- **High**: Stock ≤ 20% of threshold
- **Medium**: Stock ≤ 50% of threshold  
- **Low**: Stock ≤ threshold

### Rate Limiting
- Configurable cooldown period (default: 60 minutes)
- Prevents spam from repeated alerts

## Usage
```python
from sync.low_stock_webhooks import LowStockWebhookManager, AlertConfig, AlertChannel, SlackConfig

# Configure Slack
slack_config = SlackConfig(
    webhook_url="https://hooks.slack.com/services/...",
    channel="#inventory-alerts"
)

# Configure email
email_config = EmailConfig(
    smtp_server="smtp.gmail.com",
    username="alerts@company.com",
    password="app_password",
    from_email="alerts@company.com",
    to_emails=["manager@company.com", "inventory@company.com"]
)

# Create manager
manager = LowStockWebhookManager(slack_config, email_config)

# Configure alert
config = AlertConfig(
    sku="SKU1",
    location_id="LOC1",
    threshold=10,
    channels=[AlertChannel.SLACK, AlertChannel.EMAIL],
    urgency=AlertUrgency.MEDIUM,
    cooldown_minutes=60
)

# Check and send alert
alert = manager.check_low_stock("SKU1", "LOC1", 5, config)
```

## Slack Integration
- Color-coded messages based on urgency
- Rich formatting with fields
- Timestamps and supplier info

## Email Integration
- SMTP support with TLS
- Detailed text format
- Multiple recipients

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_low_stock_webhooks.py
```
