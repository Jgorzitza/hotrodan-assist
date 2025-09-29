const processedWebhookIds = new Set<string>();

export const hasProcessedWebhook = (webhookId: string | undefined): boolean => {
  if (!webhookId) return false;
  return processedWebhookIds.has(webhookId);
};

export const markWebhookProcessed = (webhookId: string | undefined): void => {
  if (!webhookId) return;
  processedWebhookIds.add(webhookId);
};

export const resetProcessedWebhooks = () => {
  processedWebhookIds.clear();
};
