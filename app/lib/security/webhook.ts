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

  let expected: Buffer;
  let actual: Buffer;

  try {
    expected = Buffer.from(expectedSignature, 'base64');
    actual = Buffer.from(computed, 'base64');
  } catch (error) {
    return false;
  }

  if (expected.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
};
