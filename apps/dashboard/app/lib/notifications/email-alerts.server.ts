/**
 * Email Alert System for Low Stock Notifications
 */

import type { InventoryAlert } from '~/lib/inventory/alerts.server';

type EmailRecipient = {
  email: string;
  name?: string;
};

type EmailAlertConfig = {
  recipients: EmailRecipient[];
  threshold: number;
  cooldownMinutes: number;
};

const lastAlertTime = new Map<string, Date>();

function canSendAlert(alertId: string, cooldownMinutes: number): boolean {
  const lastSent = lastAlertTime.get(alertId);
  if (!lastSent) return true;

  const minutesSinceLastAlert = (Date.now() - lastSent.getTime()) / 1000 / 60;
  return minutesSinceLastAlert >= cooldownMinutes;
}

function formatAlertEmail(alerts: InventoryAlert[]): string {
  const criticalAlerts = alerts.filter(a => a.type === 'OUT_OF_STOCK');
  const warningAlerts = alerts.filter(a => a.type === 'LOW_STOCK');

  let body = '# Inventory Alert Summary\n\n';

  if (criticalAlerts.length > 0) {
    body += '## 🚨 OUT OF STOCK (CRITICAL)\n\n';
    criticalAlerts.forEach(alert => {
      body += `- **${alert.productTitle}**\n`;
      body += `  Current Stock: ${alert.currentStock}\n\n`;
    });
  }

  if (warningAlerts.length > 0) {
    body += '## ⚠️ LOW STOCK (WARNING)\n\n';
    warningAlerts.forEach(alert => {
      body += `- **${alert.productTitle}**\n`;
      body += `  Current: ${alert.currentStock}, Threshold: ${alert.threshold}\n\n`;
    });
  }

  body += `\nTotal Alerts: ${alerts.length}\n`;
  body += `Generated: ${new Date().toLocaleString()}\n`;

  return body;
}

export async function sendLowStockAlerts(
  alerts: InventoryAlert[],
  config: EmailAlertConfig
): Promise<{ sent: boolean; reason?: string }> {
  if (alerts.length === 0) {
    return { sent: false, reason: 'No alerts to send' };
  }

  if (alerts.length < config.threshold) {
    return { sent: false, reason: `Below threshold` };
  }

  const alertKey = `low-stock-${alerts.length}`;
  if (!canSendAlert(alertKey, config.cooldownMinutes)) {
    return { sent: false, reason: 'Cooldown active' };
  }

  const emailBody = formatAlertEmail(alerts);
  const subject = `Inventory Alert: ${alerts.length} items need attention`;

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, log the email details
  // console.log("📧 Email Alert");
  // console.log(`To: ${config.recipients.map(r => r.email).join(", ")}`);
  // console.log(`Subject: ${subject}`);
  // console.log(emailBody);

  // Placeholder - would normally send via email service
  void emailBody;
  void subject; // Use the variable to avoid lint error

  lastAlertTime.set(alertKey, new Date());

  return { sent: true };
}

export function getDefaultEmailConfig(): EmailAlertConfig {
  return {
    recipients: [
      { email: process.env.INVENTORY_ALERT_EMAIL || 'inventory@example.com' },
    ],
    threshold: 5,
    cooldownMinutes: 60,
  };
}
