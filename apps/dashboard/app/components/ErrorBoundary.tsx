import { useRouteError, isRouteErrorResponse } from '@remix-run/react';
import { Banner, Card, Page } from '@shopify/polaris';

/**
 * Error Boundary for Shopify API failures
 */
export function ShopifyErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <Page title='Error'>
        <Card>
          <Banner title={`${error.status} ${error.statusText}`} tone='critical'>
            <p>{error.data?.message || 'An error occurred'}</p>
          </Banner>
        </Card>
      </Page>
    );
  }

  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred';

  // Check if it's a Shopify API error
  const isShopifyError =
    errorMessage.includes('Shopify') ||
    errorMessage.includes('GraphQL') ||
    errorMessage.includes('Admin API');

  return (
    <Page title='Something went wrong'>
      <Card>
        <Banner
          title={isShopifyError ? 'Shopify API Error' : 'Application Error'}
          tone='critical'
        >
          <p>{errorMessage}</p>
          {isShopifyError && (
            <p style={{ marginTop: '1rem' }}>
              This error occurred while communicating with Shopify. The app has
              fallen back to cached or mock data where possible.
            </p>
          )}
          <p style={{ marginTop: '1rem' }}>
            <a href='/'>Return to Dashboard</a>
          </p>
        </Banner>
      </Card>
    </Page>
  );
}
