/**
 * Custom error class for Shopify API errors
 */
export class ShopifyAPIError extends Error {
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ShopifyAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }

  static isShopifyError(error: unknown): error is ShopifyAPIError {
    return error instanceof ShopifyAPIError;
  }
}

/**
 * Handle Shopify API errors with fallback
 */
export async function withShopifyErrorHandling<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (ShopifyAPIError.isShopifyError(error)) {
      return fallback;
    }
    throw error;
  }
}
