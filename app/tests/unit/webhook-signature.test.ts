import { describe, expect, it } from 'vitest';
import { computeShopifyHmac, verifyShopifySignature } from '../../lib/security/webhook';

describe('Shopify webhook signature helpers', () => {
  const payload = JSON.stringify({ id: 42, event: 'orders/updated' });
  const secret = 'shpss_secret';

  it('computes deterministic HMAC', () => {
    const first = computeShopifyHmac(payload, secret);
    const second = computeShopifyHmac(payload, secret);
    expect(first).toEqual(second);
  });

  it('validates matching signature safely', () => {
    const signature = computeShopifyHmac(payload, secret);
    const ok = verifyShopifySignature(payload, secret, {
      'x-shopify-hmac-sha256': signature
    });
    expect(ok).toBe(true);
  });

  it('rejects invalid or mismatched signatures', () => {
    const ok = verifyShopifySignature(payload, secret, {
      'x-shopify-hmac-sha256': 'bad-signature'
    });
    expect(ok).toBe(false);
  });

  it('rejects missing signature header', () => {
    const ok = verifyShopifySignature(payload, secret, {
      'x-shopify-hmac-sha256': ''
    });
    expect(ok).toBe(false);
  });
});
