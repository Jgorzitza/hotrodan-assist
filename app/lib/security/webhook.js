import crypto from 'crypto';
export const computeShopifyHmac = (payload, secret) => {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64');
};
export const verifyShopifySignature = (payload, secret, headers) => {
    const expectedSignature = headers['x-shopify-hmac-sha256'];
    if (!expectedSignature) {
        return false;
    }
    const computed = computeShopifyHmac(payload, secret);
    let expected;
    let actual;
    try {
        expected = Buffer.from(expectedSignature, 'base64');
        actual = Buffer.from(computed, 'base64');
    }
    catch (error) {
        return false;
    }
    if (expected.length !== actual.length) {
        return false;
    }
    return crypto.timingSafeEqual(actual, expected);
};
