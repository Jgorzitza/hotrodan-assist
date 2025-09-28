export type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

export type GraphqlRequest<TVariables> = {
  query: string;
  variables: TVariables;
};

export type SalesKpisVariables = {
  shopId: string;
  start: string;
  end: string;
};

export type SalesKpisResponse = {
  shop: {
    id: string;
    name: string;
    currencyCode: string;
    primaryDomain?: {
      url: string;
    } | null;
  };
};

export const SALES_KPIS_QUERY = `#graphql
  query DashboardSalesMetrics($shopId: ID!, $start: DateTime!, $end: DateTime!) {
    shop(id: $shopId) {
      id
      name
      currencyCode
      primaryDomain {
        url
      }
    }
  }
`;

export const buildSalesKpisQuery = (
  variables: SalesKpisVariables,
): GraphqlRequest<SalesKpisVariables> => ({
  query: SALES_KPIS_QUERY,
  variables,
});

export type OrdersByStatusVariables = {
  status: string; // Shopify OrderDisplayStatus enum
  cursor?: string | null;
};

export type OrdersByStatusResponse = {
  orders: {
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        name: string;
        createdAt: string;
        displayFinancialStatus: string | null;
        displayFulfillmentStatus: string | null;
        subtotalLineItemsQuantity?: number | null;
        customer: {
          id: string;
          displayName: string;
          email?: string | null;
        } | null;
        totalPriceSet: {
          presentmentMoney: MoneyV2;
        };
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
};

export const ORDERS_BY_STATUS_QUERY = `#graphql
  query DashboardOrdersByStatus($status: OrderDisplayStatus!, $cursor: String) {
    orders(first: 50, displayStatus: $status, after: $cursor) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          subtotalLineItemsQuantity
          customer {
            id
            displayName
            email
          }
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

export const buildOrdersByStatusQuery = (
  variables: OrdersByStatusVariables,
): GraphqlRequest<OrdersByStatusVariables> => ({
  query: ORDERS_BY_STATUS_QUERY,
  variables,
});

export type InventoryLowStockVariables = {
  limit: number;
  threshold: number;
};

export type InventoryLowStockResponse = {
  productVariants: {
    nodes: Array<{
      id: string;
      sku?: string | null;
      displayName: string;
      inventoryQuantity: number;
    }>;
  };
};

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

export const buildInventoryLowStockQuery = (
  variables: InventoryLowStockVariables,
): GraphqlRequest<InventoryLowStockVariables> => ({
  query: INVENTORY_LOW_STOCK_QUERY,
  variables,
});

export type CustomerRepeatVariables = {
  cursor?: string | null;
};

export type CustomerRepeatResponse = {
  customers: {
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        displayName: string;
        email?: string | null;
        ordersCount: number;
        totalSpentSet: {
          presentmentMoney: MoneyV2;
        };
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
};

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

export const buildCustomerRepeatQuery = (
  variables: CustomerRepeatVariables = {},
): GraphqlRequest<CustomerRepeatVariables> => ({
  query: CUSTOMER_REPEAT_QUERY,
  variables,
});
