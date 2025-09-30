/**
 * Shopify Admin GraphQL Queries for Inventory Management
 */

export type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

export const GET_PRODUCTS_WITH_INVENTORY_QUERY = `#graphql
  query GetProductsWithInventory($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          totalInventory
          status
        }
      }
    }
  }
`;

export const buildGetProductsWithInventoryQuery = (first: number = 50) => ({
  query: GET_PRODUCTS_WITH_INVENTORY_QUERY,
  variables: { first },
});
