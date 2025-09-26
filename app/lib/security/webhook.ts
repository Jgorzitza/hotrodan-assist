import crypto from 'crypto';

export interface ShopifyWebhookHeaders {
  'x-shopify-hmac-sha256': string;
  'x-shopify-topic'?: string;
  'x-shopify-shop-domain'?: string;
}

export const computeShopifyHmac = (payload: Buffer | string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64');
};

export const verifyShopifySignature = (
  payload: Buffer | string,
  secret: string,
  headers: ShopifyWebhookHeaders
): boolean => {
  const expectedSignature = headers['x-shopify-hmac-sha256'];
  if (!expectedSignature) {
    return false;
  }

  const computed = computeShopifyHmac(payload, secret);
  const expected = Buffer.from(expectedSignature, 'utf8');
  const actual = Buffer.from(computed, 'utf8');

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
};
