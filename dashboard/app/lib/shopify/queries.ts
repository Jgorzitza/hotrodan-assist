export const SALES_KPIS_QUERY = `#graphql
  query DashboardSalesMetrics($shopId: ID!, $start: DateTime!, $end: DateTime!) {
    shop(id: $shopId) {
      name
    }
  }
`;

export const ORDERS_BY_STATUS_QUERY = `#graphql
  query DashboardOrdersByStatus($status: OrderDisplayStatus!, $cursor: String) {
    orders(first: 50, displayStatus: $status, after: $cursor) {
      edges {
        cursor
        node {
          id
          name
          displayFinancialStatus
          displayFulfillmentStatus
          customer {
            id
            displayName
            email
          }
          createdAt
          totalPriceSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const INVENTORY_LOW_STOCK_QUERY = `#graphql
  query DashboardInventoryLowStock($limit: Int!, $threshold: Int!) {
    productVariants(first: $limit, query: "inventory_quantity:<$threshold") {
      nodes {
        id
        sku
        displayName
        inventoryQuantity
      }
    }
  }
`;

export const CUSTOMER_REPEAT_QUERY = `#graphql
  query DashboardCustomerRepeats($cursor: String) {
    customers(first: 50, after: $cursor, query: "orders_count:>1") {
      edges {
        cursor
        node {
          id
          displayName
          email
          ordersCount
          totalSpentSet {
            presentmentMoney {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
