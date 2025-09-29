import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", to: "/app" },
    { label: "Sales", to: "/app/sales" },
    { label: "Orders", to: "/app/orders" },
    { label: "Inbox", to: "/app/inbox" },
    { label: "Inventory", to: "/app/inventory" },
    { label: "SEO", to: "/app/seo" },
    { label: "Settings", to: "/app/settings" },
  ];

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              prefetch="intent"
              style={isActive ? { fontWeight: 600 } : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
