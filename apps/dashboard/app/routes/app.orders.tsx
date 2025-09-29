import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigate,
  useSearchParams,
  useRevalidator,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  DataTable,
  Divider,
  Grid,
  IndexTable,
  InlineStack,
  Layout,
  Modal,
  Page,
  Pagination,
  Select,
  Tag,
  Text,
  TextField,
  Toast,
  Tabs,
  useBreakpoints,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  assignOrders,
  getOrdersScenario,
  markOrdersFulfilled,
  requestSupport,
  scenarioFromRequest,
  updateReturnAction,
} from "~/mocks";
import { USE_MOCK_DATA } from "~/mocks/config.server";
import {
  buildDashboardRangeSelection,
  DASHBOARD_RANGE_OPTIONS,
  DASHBOARD_RANGE_KEY_LIST,
  DEFAULT_DASHBOARD_RANGE,
  resolveDashboardRangeKey,
} from "~/lib/date-range";
import {
  fetchOrdersFromSync,
  postOrdersSyncAction,
  type SyncOrdersActionResult,
} from "~/lib/orders/sync.server";
import type {
  ActionToast,
  DashboardRangeKey,
  Order,
  OrderOwner,
  OrdersActionResponse,
  OrdersDataset,
  OrdersMetrics,
  MockScenario,
} from "~/types/dashboard";
import type {
  SyncOrdersActionUpdate,
  SyncOrdersAssignResponse,
  SyncOrdersFulfillResponse,
  SyncOrdersReturnsResponse,
  SyncOrdersSupportResponse,
} from "~/types/orders-sync";
import { z } from "zod";

const TAB_IDS = ["all", "unfulfilled", "overdue", "refunded"] as const;

const TAB_OPTIONS: Array<{ id: OrdersDataset["tab"]; content: string }> = [
  { id: "all", content: "All" },
  { id: "unfulfilled", content: "Unfulfilled" },
  { id: "overdue", content: "Overdue" },
  { id: "refunded", content: "Refunded" },
];

const STATUS_FILTERS = [
  "awaiting_fulfillment",
  "awaiting_tracking",
  "overdue",
  "holds",
] as const;

const PRIORITY_FILTERS = ["vip", "rush", "standard"] as const;

const CHANNEL_FILTERS = ["online", "pos", "draft"] as const;

const PAGE_SIZE_OPTIONS = [
  { label: "12 / page", value: "12" },
  { label: "24 / page", value: "24" },
  { label: "36 / page", value: "36" },
  { label: "50 / page", value: "50" },
];

const ISSUE_TONE: Record<
  Order["issue"],
  "success" | "warning" | "critical" | "attention" | "info"
> = {
  inventory: "attention",
  payment: "critical",
  address: "warning",
  carrier: "warning",
  manual_check: "info",
  none: "success",
};

const STATUS_TONE: Record<Order["status"], "success" | "info" | "critical" | "attention"> = {
  paid: "info",
  processing: "attention",
  fulfilled: "success",
  refunded: "info",
  cancelled: "critical",
};

const FULFILLMENT_TONE: Record<Order["fulfillmentStatus"], "success" | "attention" | "info"> = {
  fulfilled: "success",
  partial: "info",
  unfulfilled: "attention",
};

const QuerySchema = z.object({
  tab: z.enum(TAB_IDS).catch("all"),
  pageSize: z.coerce.number().int().min(5).max(50).catch(12),
  cursor: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .transform((value) => value || undefined)
    .optional()
    .catch(undefined),
  direction: z.enum(["after", "before"]).catch("after"),
  status: z.enum(STATUS_FILTERS).optional().catch(undefined),
  priority: z.enum(PRIORITY_FILTERS).optional().catch(undefined),
  channel: z.enum(CHANNEL_FILTERS).optional().catch(undefined),
  range: z.enum(DASHBOARD_RANGE_KEY_LIST).optional().catch(undefined),
  assigned_to: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .catch(undefined),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .catch(undefined),
  date_start: z
    .string()
    .trim()
    .optional()
    .catch(undefined),
  date_end: z
    .string()
    .trim()
    .optional()
    .catch(undefined),
});

const isValidDate = (value: string | undefined): value is string => {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
};

type LoaderData = {
  dataset: OrdersDataset;
  scenario: MockScenario;
  useMockData: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsedQuery.success) {
    console.warn("orders loader: invalid query params", parsedQuery.error.flatten().fieldErrors);
  }
  const query = parsedQuery.success ? parsedQuery.data : QuerySchema.parse({});

  const {
    range: rangeParam,
    tab,
    pageSize,
    cursor: rawCursor,
    direction,
    status,
    priority,
    channel,
    assigned_to: assignedTo,
    tag,
    date_start: rawDateStart,
    date_end: rawDateEnd,
  } = query;
  const cursor = rawCursor ?? null;
  const scenario = scenarioFromRequest(request);

  const resolvedRangeKey: DashboardRangeKey = resolveDashboardRangeKey(
    rangeParam ?? url.searchParams.get("range"),
    DEFAULT_DASHBOARD_RANGE,
  );
  const rangeSelection = buildDashboardRangeSelection(resolvedRangeKey);

  let dateStart = isValidDate(rawDateStart) ? rawDateStart : undefined;
  let dateEnd = isValidDate(rawDateEnd) ? rawDateEnd : undefined;

  if (!dateStart) {
    dateStart = rangeSelection.start;
  }
  if (!dateEnd) {
    dateEnd = rangeSelection.end;
  }

  let dataset: OrdersDataset;

  if (!USE_MOCK_DATA) {
    const { authenticate } = await import("../shopify.server");
    const auth = await authenticate.admin(request);
    try {
      dataset = await fetchOrdersFromSync({
        shopDomain: auth?.session?.shop,
        signal: request.signal,
        search: {
          tab,
          pageSize,
          cursor,
          direction,
          status,
          priority,
          channel,
          assigned_to: assignedTo,
          tag,
          date_start: dateStart,
          date_end: dateEnd,
        },
      });
    } catch (error) {
      console.error("orders loader: sync fetch failed", error);
      dataset = getOrdersScenario({
        scenario,
        tab,
        pageSize,
        cursor,
        direction,
        status,
        priority,
        channel,
        assignedTo,
        tag,
        dateStart,
        dateEnd,
      });
      dataset.alerts = ["Sync temporarily unavailable — showing mock data", ...dataset.alerts];
      dataset.state = "warning";
    }
  } else {
    dataset = getOrdersScenario({
      scenario,
      tab,
      pageSize,
      cursor,
      direction,
      status,
      priority,
      channel,
      assignedTo,
      tag,
      dateStart,
      dateEnd,
    });
  }

  return json<LoaderData>(
    { dataset, scenario, useMockData: USE_MOCK_DATA },
    {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    },
  );
};



export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const scenario = scenarioFromRequest(request);
  const seed = 0;

  type ResponseOverrides = {
    toast?: Partial<ActionToast> & { message?: string };
    message?: string;
    updated?: SyncOrdersActionUpdate[];
  };

  const buildResponse = (
    success: boolean,
    fallbackMessage: string,
    overrides?: ResponseOverrides,
  ): OrdersActionResponse => {
    const message = overrides?.message ?? overrides?.toast?.message ?? fallbackMessage;
    const status = overrides?.toast?.status ?? (success ? "success" : "error");
    return {
      success,
      message,
      toast: {
        status,
        message,
      },
      updatedOrders: overrides?.updated ?? [],
    };
  };

  const mergeUpdatedOrders = (
    ...values: Array<unknown>
  ): SyncOrdersActionUpdate[] => {
    const merged: SyncOrdersActionUpdate[] = [];
    const seen = new Set<string>();
    values.forEach((value) => {
      if (!value) return;
      const entries = Array.isArray(value) ? value : [value];
      entries.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const id = (entry as { id?: unknown }).id;
        if (typeof id !== "string" || seen.has(id)) return;
        seen.add(id);
        merged.push(entry as SyncOrdersActionUpdate);
      });
    });
    return merged;
  };

  if (!intent || typeof intent !== "string") {
    const message = "Missing action intent.";
    return json(buildResponse(false, message, { message }), { status: 400 });
  }

  let syncCall:
    | (<TUpdate>(
        path: string,
        payload: Record<string, unknown>,
      ) => Promise<SyncOrdersActionResult<TUpdate>>)
    | null = null;

  if (!USE_MOCK_DATA) {
    const { authenticate } = await import("../shopify.server");
    const auth = await authenticate.admin(request);
    const shopDomain = auth?.session?.shop ?? null;
    const baseUrl = process.env.SYNC_SERVICE_URL;

    if (!baseUrl) {
      const message = "Missing SYNC_SERVICE_URL configuration.";
      return json(buildResponse(false, message, { message }), { status: 500 });
    }

    syncCall = async <TUpdate,>(path: string, payload: Record<string, unknown>) =>
      postOrdersSyncAction<TUpdate>({
        path,
        payload,
        baseUrl,
        shopDomain,
        signal: request.signal,
      });
  }

  const parseIds = () => {
    const idsRaw = formData.get("orderIds");
    if (typeof idsRaw !== "string") return [] as string[];
    try {
      const parsed = JSON.parse(idsRaw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return idsRaw.split(",").map((value) => value.trim()).filter(Boolean);
    }
  };

  switch (intent) {
    case "assign": {
      const assignee = (formData.get("assignee") as string) ?? "unassigned";
      const ids = parseIds();
      const fallbackMessage = `Assigned ${ids.length} order(s) to ${assignee}.`;
      if (syncCall) {
        try {
          const result = await syncCall<SyncOrdersAssignResponse["updatedOrders"]>(
            "/sync/orders/assign",
            {
              orderIds: ids,
              assignee,
            },
          );
          const success = result.success ?? true;
          const updated = mergeUpdatedOrders(result.updatedOrders, result.updatedOrder);
          return json(
            buildResponse(success, fallbackMessage, {
              message: result.message,
              toast: result.toast,
              updated,
            }),
          );
        } catch (error) {
          console.error("orders assign sync error", error);
          const message = "Failed to assign orders via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const updated = assignOrders(scenario, seed, ids, assignee);
      const patches = updated.map((order) => ({
        id: order.id,
        assignedTo: order.assignedTo ?? assignee,
      }));
      return json(buildResponse(true, fallbackMessage, { updated: patches }));
    }
    case "markFulfilled": {
      const ids = parseIds();
      const trackingRaw = formData.get("tracking");
      let tracking: { number: string; carrier: string } | undefined;
      if (typeof trackingRaw === "string") {
        try {
          const parsed = JSON.parse(trackingRaw);
          if (parsed && parsed.number && parsed.carrier) {
            tracking = {
              number: String(parsed.number),
              carrier: String(parsed.carrier),
            };
          }
        } catch {
          // ignore parsing errors, optional field
        }
      }
      const fallbackMessage = `Marked ${ids.length} order(s) fulfilled${
        tracking ? ` with tracking ${tracking.number}` : ""
      }.`;
      if (syncCall) {
        try {
          const result = await syncCall<SyncOrdersFulfillResponse["updatedOrders"]>(
            "/sync/orders/fulfill",
            {
              orderIds: ids,
              tracking,
            },
          );
          const success = result.success ?? true;
          const updated = mergeUpdatedOrders(result.updatedOrders, result.updatedOrder);
          return json(
            buildResponse(success, fallbackMessage, {
              message: result.message,
              toast: result.toast,
              updated,
            }),
          );
        } catch (error) {
          console.error("orders fulfill sync error", error);
          const message = "Failed to mark orders fulfilled via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const updated = markOrdersFulfilled(scenario, seed, ids, tracking);
      const patches = updated.map((order) => ({
        id: order.id,
        fulfillmentStatus: order.fulfillmentStatus,
        tracking: tracking ?? undefined,
      }));
      return json(buildResponse(true, fallbackMessage, { updated: patches }));
    }
    case "requestSupport": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        const message = "Missing payload for support request.";
        return json(buildResponse(false, message, { message }), { status: 400 });
      }
      const payload = JSON.parse(payloadRaw) as {
        orderId?: string;
        orderIds?: string[];
        conversationId?: string;
        note: string;
      };
      const ids =
        Array.isArray(payload.orderIds) && payload.orderIds.length
          ? payload.orderIds.map(String)
          : payload.orderId
            ? [String(payload.orderId)]
            : [];
      if (!ids.length) {
        const message = "No orders provided for support request.";
        return json(buildResponse(false, message, { message }), { status: 400 });
      }
      const fallbackMessage = `Support requested for ${ids.length} order${ids.length === 1 ? "" : "s"}.`;
      if (syncCall) {
        try {
          const results = await Promise.all(
            ids.map((id) =>
              syncCall<SyncOrdersSupportResponse["updatedOrders"]>(
                "/sync/orders/support",
                {
                  orderId: id,
                  conversationId: payload.conversationId,
                  note: payload.note,
                },
              ),
            ),
          );
          const success = results.every((result) => result.success ?? true);
          const updated = mergeUpdatedOrders(
            ...results.map((result) => result.updatedOrders),
            ...results.map((result) => result.updatedOrder),
          );
          const firstMessage = results.find((result) => Boolean(result.message))?.message;
          const firstToast = results.find((result) => result.toast?.message)?.toast;
          return json(
            buildResponse(success, fallbackMessage, {
              message: firstMessage,
              toast: firstToast,
              updated,
            }),
          );
        } catch (error) {
          console.error("orders support sync error", error);
          const message = "Failed to request support via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const updated = ids
        .map((id) =>
          requestSupport(scenario, seed, {
            orderId: id,
            conversationId: payload.conversationId,
            note: payload.note,
          }),
        )
        .filter((order): order is Order => Boolean(order));
      const success = updated.length === ids.length;
      const message = updated.length
        ? `Support requested for ${updated.length} order${updated.length === 1 ? "" : "s"}.`
        : "Order not found.";
      const patches = updated.map((order) => ({
        id: order.id,
        supportThread:
          order.supportThread ?? payload.conversationId ?? `conversation:${order.id}`,
      }));
      return json(buildResponse(success, message, { message, updated: patches }));
    }
    case "updateReturn": {
      const payloadRaw = formData.get("payload");
      if (typeof payloadRaw !== "string") {
        const message = "Missing payload for return update.";
        return json(buildResponse(false, message, { message }), { status: 400 });
      }
      const payload = JSON.parse(payloadRaw) as {
        orderId: string;
        action: "approve_refund" | "deny" | "request_inspection";
        note?: string;
      };
      const fallbackMessage = `Return updated (${payload.action}) for ${payload.orderId}.`;
      if (syncCall) {
        try {
          const result = await syncCall<SyncOrdersReturnsResponse["updatedOrders"]>(
            "/sync/orders/returns",
            payload,
          );
          const success = result.success ?? true;
          const updated = mergeUpdatedOrders(result.updatedOrders, result.updatedOrder);
          return json(
            buildResponse(success, fallbackMessage, {
              message: result.message,
              toast: result.toast,
              updated,
            }),
          );
        } catch (error) {
          console.error("orders return sync error", error);
          const message = "Failed to update return via Sync.";
          return json(buildResponse(false, message, { message }), { status: 502 });
        }
      }
      const result = updateReturnAction(scenario, seed, payload);
      const success = Boolean(result);
      const message = success ? fallbackMessage : "Return not found.";
      return json(buildResponse(success, fallbackMessage, { message, updated: [] }));
    }
    default: {
      const message = `Unknown intent: ${intent}`;
      return json(buildResponse(false, message, { message }), { status: 400 });
    }
  }
};

const PRIORITY_TONE: Record<Order["priority"], "critical" | "warning" | "success"> = {
  vip: "critical",
  rush: "warning",
  standard: "success",
};

export default function OrdersRoute() {
  const { dataset, scenario, useMockData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<OrdersActionResponse>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [assignTarget, setAssignTarget] = useState<OrderOwner>("assistant");
  const [toast, setToast] = useState<ActionToast | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportNote, setSupportNote] = useState("");
  const { mdUp } = useBreakpoints();
  const [alerts, setAlerts] = useState<string[]>(dataset.alerts);
  const [dataGaps, setDataGaps] = useState<string[]>(dataset.dataGaps);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { orders: optimisticOrders, lookup: ordersById } = useOptimisticOrders({
    baseOrders: dataset.orders.items,
    submission: fetcher.submission,
    response: fetcher.data,
  });

  const rangeValue = resolveDashboardRangeKey(
    searchParams.get("range"),
    DEFAULT_DASHBOARD_RANGE,
  );
  const channelValue = searchParams.get("channel") ?? "all";
  const ownerValue = searchParams.get("assigned_to") ?? "all";
  const tagValue = searchParams.get("tag") ?? "all";

  const rangeOptions = useMemo(() => DASHBOARD_RANGE_OPTIONS, []);

  const channelOptions = useMemo(
    () => [
      { label: "All channels", value: "all" },
      { label: "Online", value: "online" },
      { label: "POS", value: "pos" },
      { label: "Draft", value: "draft" },
    ],
    [],
  );

  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    optimisticOrders.forEach((order) => {
      if (order.assignedTo) {
        owners.add(order.assignedTo);
      }
    });
    const sorted = Array.from(owners).sort((a, b) => a.localeCompare(b));
    return [
      { label: "All owners", value: "all" },
      ...sorted.map((owner) => ({ label: formatOwner(owner), value: owner })),
      { label: "Unassigned", value: "unassigned" },
    ].filter((option, index, array) => {
      return array.findIndex((entry) => entry.value === option.value) === index;
    });
  }, [optimisticOrders]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    optimisticOrders.forEach((order) => {
      order.tags.forEach((tag) => {
        if (tag) {
          tags.add(tag);
        }
      });
    });
    const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b));
    return [
      { label: "All tags", value: "all" },
      ...sorted.map((tag) => ({ label: tag, value: tag })),
    ];
  }, [optimisticOrders]);

  const activeFilters = useMemo(
    () =>
      (
        [
          channelValue !== "all"
            ? { key: "channel" as const, label: `Channel: ${formatChannel(channelValue)}` }
            : null,
          ownerValue !== "all"
            ? { key: "assigned_to" as const, label: `Owner: ${formatOwner(ownerValue)}` }
            : null,
          tagValue !== "all" ? { key: "tag" as const, label: `Tag: ${tagValue}` } : null,
        ]
          .filter(Boolean) as Array<{ key: "channel" | "assigned_to" | "tag"; label: string }>
      ),
    [channelValue, ownerValue, tagValue],
  );

  const updateSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams);
      updater(params);
      params.delete("cursor");
      params.delete("direction");
      const nextSearch = params.toString();
      navigate(
        nextSearch ? `${location.pathname}?${nextSearch}` : location.pathname,
        { replace: true },
      );
    },
    [location.pathname, navigate, searchParams],
  );

  const handleRangeChange = useCallback(
    (value: string) => {
      updateSearchParams((params) => {
        params.set("range", value);
        params.delete("date_start");
        params.delete("date_end");
      });
    },
    [updateSearchParams],
  );

  const handleChannelChange = useCallback(
    (value: string) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("channel");
        } else {
          params.set("channel", value);
        }
      });
    },
    [updateSearchParams],
  );

  const handleOwnerChange = useCallback(
    (value: string) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("assigned_to");
        } else {
          params.set("assigned_to", value);
        }
      });
    },
    [updateSearchParams],
  );

  const handleTagChange = useCallback(
    (value: string) => {
      updateSearchParams((params) => {
        if (value === "all") {
          params.delete("tag");
        } else {
          params.set("tag", value);
        }
      });
    },
    [updateSearchParams],
  );

  const handleFilterRemove = useCallback(
    (key: "channel" | "assigned_to" | "tag") => {
      updateSearchParams((params) => {
        params.delete(key);
      });
    },
    [updateSearchParams],
  );

  const selectedIndex = Math.max(
    TAB_OPTIONS.findIndex((tab) => tab.id === dataset.tab),
    0,
  );

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(optimisticOrders, {
    resourceIDResolver: (resource: Order) => resource.id,
  });

  const selectedOrderCount = useMemo(() => selectedResources.length, [selectedResources]);
  const activeOrder = activeOrderId ? ordersById.get(activeOrderId) ?? null : null;

  useEffect(() => {
    if (activeOrderId && !activeOrder) {
      setActiveOrderId(null);
    }
  }, [activeOrder, activeOrderId]);

  const fetcherIntentRaw = fetcher.submission?.formData.get("intent");
  const actionState = useMemo(
    () => ({
      intent: typeof fetcherIntentRaw === "string" ? fetcherIntentRaw : null,
      isBusy: fetcher.state !== "idle",
    }),
    [fetcher.state, fetcherIntentRaw],
  );
  const isRequestSupportBusy = actionState.isBusy && actionState.intent === "requestSupport";

  const selectedOrderLabels = useMemo(() => {
    if (!selectedResources.length) return [] as string[];
    const nameMap = new Map<string, string>();
    optimisticOrders.forEach((order) => {
      nameMap.set(order.id, order.name);
    });
    return selectedResources.map((id) => nameMap.get(id) ?? id);
  }, [optimisticOrders, selectedResources]);

  const handleTabChange = useCallback(
    (index: number) => {
      updateSearchParams((params) => {
        params.set("tab", TAB_OPTIONS[index]!.id);
      });
    },
    [updateSearchParams],
  );

  useEffect(() => {
    setAlerts(dataset.alerts);
    setDataGaps(dataset.dataGaps);
  }, [dataset.alerts, dataset.dataGaps]);

  useEffect(() => {
    if (useMockData || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const source = new EventSource("/sync/orders/alerts");
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data ?? "{}");
          if (payload?.message) {
            setAlerts((current) =>
              current.includes(payload.message)
                ? current
                : [payload.message as string, ...current],
            );
            setToast({
              status:
                typeof payload.status === "string" && payload.status.length > 0
                  ? (payload.status as ActionToast["status"])
                  : "info",
              message: String(payload.message),
            });
          }
          if (payload?.type === "data_gap" && payload?.message) {
            setDataGaps((current) =>
              current.includes(payload.message)
                ? current
                : [payload.message as string, ...current],
            );
          }
        } catch (error) {
          console.warn("orders alerts stream parse error", error);
        }
        revalidator.revalidate();
      };

      source.onerror = () => {
        source.close();
        if (cancelled) return;
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
        }
        reconnectRef.current = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [revalidator, useMockData]);

  useEffect(() => {
    if (!fetcher.data) return;
    const { toast: responseToast, message, success } = fetcher.data;
    const nextToast = responseToast?.message
      ? {
          status: responseToast.status ?? (success ? "success" : "error"),
          message: responseToast.message,
        }
      : message
        ? { status: success ? "success" : "error", message }
        : null;
    if (nextToast) {
      setToast(nextToast);
    }
    clearSelection();
    revalidator.revalidate();
  }, [fetcher.data, clearSelection, revalidator]);

  const metrics = dataset.metrics;
  const pageInfo = dataset.orders.pageInfo;
  const nextCursor = pageInfo.nextCursor;
  const previousCursor = pageInfo.previousCursor;
  const canGoNext = pageInfo.hasNextPage && Boolean(nextCursor);
  const canGoPrevious = pageInfo.hasPreviousPage;
  const pageSizeValue = String(pageInfo.pageSize);
  const totalOrdersCount = dataset.orders.count;
  const hasOrders = optimisticOrders.length > 0;
  const firstItemIndex = hasOrders ? (Math.max(pageInfo.page, 1) - 1) * pageInfo.pageSize + 1 : 0;
  const lastItemIndex = hasOrders
    ? Math.min(totalOrdersCount, firstItemIndex + optimisticOrders.length - 1)
    : 0;
  const pageSummary = hasOrders
    ? `${firstItemIndex}-${lastItemIndex} of ${totalOrdersCount}`
    : `0 of ${totalOrdersCount}`;
  const pageLabel = `Page ${Math.min(pageInfo.page, pageInfo.totalPages)} of ${pageInfo.totalPages}`;
  const pageSizeOptions = useMemo(() => {
    if (PAGE_SIZE_OPTIONS.some((option) => option.value === pageSizeValue)) {
      return PAGE_SIZE_OPTIONS;
    }
    return [...PAGE_SIZE_OPTIONS, { label: `${pageSizeValue} / page`, value: pageSizeValue }];
  }, [pageSizeValue]);

  const handleAssign = () => {
    if (!selectedOrderCount) return;
    fetcher.submit(
      {
        intent: "assign",
        orderIds: JSON.stringify(selectedResources),
        assignee: assignTarget,
      },
      { method: "post" },
    );
  };

  const handleSupportClose = useCallback(() => {
    setSupportModalOpen(false);
    setSupportNote("");
  }, []);

  const handleSupportSubmit = useCallback(() => {
    if (!selectedOrderCount) return;
    const trimmed = supportNote.trim();
    const summary = selectedOrderLabels.slice(0, 3).join(", ");
    const defaultNote = summary
      ? `Follow-up requested for ${summary}${selectedOrderLabels.length > 3 ? ` (+${selectedOrderLabels.length - 3} more)` : ""}.`
      : "Follow-up requested from dashboard.";
    fetcher.submit(
      {
        intent: "requestSupport",
        payload: JSON.stringify({
          orderIds: selectedResources,
          note: trimmed || defaultNote,
        }),
      },
      { method: "post" },
    );
    setSupportModalOpen(false);
    setSupportNote("");
  }, [fetcher, selectedOrderCount, selectedOrderLabels, selectedResources, supportNote]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set("pageSize", value);
      params.delete("cursor");
      params.delete("direction");
      navigate(`?${params.toString()}`);
    },
    [navigate, searchParams],
  );

  const handleNextPage = useCallback(() => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);
    params.set("direction", "after");
    navigate(`?${params.toString()}`);
  }, [navigate, nextCursor, searchParams]);

  const handlePreviousPage = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    if (previousCursor) {
      params.set("cursor", previousCursor);
      params.set("direction", "before");
    } else {
      params.delete("cursor");
      params.delete("direction");
    }
    navigate(`?${params.toString()}`);
  }, [navigate, previousCursor, searchParams]);

  const handleMarkFulfilled = () => {
    if (!selectedOrderCount) return;
    const first = selectedResources[0] ?? "";
    const trackingNumber = `TRK-${first.slice(-4).toUpperCase() || "0000"}`;
    fetcher.submit(
      {
        intent: "markFulfilled",
        orderIds: JSON.stringify(selectedResources),
        tracking: JSON.stringify({ number: trackingNumber, carrier: "UPS" }),
      },
      { method: "post" },
    );
  };

  const handleShipmentAddTracking = useCallback(
    (shipment: OrdersDataset["shipments"]["trackingPending"][number]) => {
      const targetId = shipment.orderId;
      if (!targetId) {
        setToast({ status: "error", message: "Unable to add tracking — missing order reference." });
        return;
      }
      const sanitized = shipment.orderNumber.replace(/[^0-9A-Z]/gi, "");
      const suffix = sanitized.slice(-4).padStart(4, "0");
      const trackingNumber = `TRK-${suffix || "0000"}`;
      fetcher.submit(
        {
          intent: "markFulfilled",
          orderIds: JSON.stringify([targetId]),
          tracking: JSON.stringify({ number: trackingNumber, carrier: "UPS" }),
        },
        { method: "post" },
      );
    },
    [fetcher, setToast],
  );

  const handleShipmentFollowUp = useCallback(
    (shipment: OrdersDataset["shipments"]["delayed"][number]) => {
      const targetId = shipment.orderId;
      if (!targetId) {
        setToast({ status: "error", message: "Unable to request support — missing order reference." });
        return;
      }
      const note = `Carrier ${shipment.carrier ?? "Unknown"} delayed ${shipment.delayHours}h (last update ${formatDateTime(shipment.lastUpdate)}).`;
      fetcher.submit(
        {
          intent: "requestSupport",
          payload: JSON.stringify({ orderIds: [targetId], note }),
        },
        { method: "post" },
      );
    },
    [fetcher, setToast],
  );

  const handleReturnAction = useCallback(
    (
      entry: OrdersDataset["returns"]["pending"][number],
      action: "approve_refund" | "deny" | "request_inspection",
    ) => {
      if (!entry.orderId) {
        setToast({ status: "error", message: "Unable to update return — missing order reference." });
        return;
      }
      const note =
        action === "approve_refund"
          ? "Refund approved from dashboard orders."
          : action === "request_inspection"
            ? "Inspection requested before refund approval."
            : "Return denied from dashboard orders.";
      fetcher.submit(
        {
          intent: "updateReturn",
          payload: JSON.stringify({ orderId: entry.orderId, action, note }),
        },
        { method: "post" },
      );
    },
    [fetcher, setToast],
  );

  return (
    <Page
      title="Orders"
      subtitle="Monitor fulfillment backlog, shipment health, and returns."
    >
      <TitleBar title="Orders" primaryAction={{ content: "Export CSV", url: "#" }} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {(alerts.length || dataGaps.length || useMockData) && (
              <BlockStack gap="200">
                {useMockData && (
                  <Banner tone={scenario === "warning" ? "warning" : "info"} title={`Mock state: ${scenario}`}>
                    <p>Append `mockState=warning` (etc) to preview additional states.</p>
                  </Banner>
                )}
                {alerts.map((alert, index) => (
                  <Banner tone="warning" title="Fulfillment alert" key={`alert-${index}`}>
                    <p>{alert}</p>
                  </Banner>
                ))}
                {dataGaps.map((gap, index) => (
                  <Banner tone="attention" title="Data gap" key={`gap-${index}`}>
                    <p>{gap}</p>
                  </Banner>
                ))}
              </BlockStack>
            )}

            <Card>
              <Card.Section>
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center" wrap>
                    <Select
                      labelHidden
                      label="Date range"
                      options={rangeOptions}
                      value={rangeValue}
                      onChange={handleRangeChange}
                    />
                    <Select
                      labelHidden
                      label="Channel"
                      options={channelOptions}
                      value={channelValue}
                      onChange={handleChannelChange}
                    />
                    <Select
                      labelHidden
                      label="Owner"
                      options={ownerOptions}
                      value={ownerValue}
                      onChange={handleOwnerChange}
                    />
                    <Select
                      labelHidden
                      label="Tag"
                      options={tagOptions}
                      value={tagValue}
                      onChange={handleTagChange}
                      disabled={tagOptions.length <= 1}
                    />
                  </InlineStack>
                  <InlineStack align="space-between" blockAlign="center">
                    <Text tone="subdued" variant="bodySm" as="span">
                      {dataset.period.label}
                    </Text>
                    {activeFilters.length > 0 && (
                      <InlineStack gap="100" wrap>
                        {activeFilters.map((filter) => (
                          <Tag key={filter.key} onRemove={() => handleFilterRemove(filter.key)}>
                            {filter.label}
                          </Tag>
                        ))}
                      </InlineStack>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card.Section>
            </Card>

            <FulfillmentPulseCard metrics={metrics} />

            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Tabs tabs={TAB_OPTIONS} selected={selectedIndex} onSelect={handleTabChange} fitted />
                  <InlineStack gap="200">
                    <Select
                      labelHidden
                      label="Assign to"
                      options={AssignOptions}
                      value={assignTarget}
                      onChange={(value) => setAssignTarget(value as OrderOwner)}
                    />
                    <ButtonGroup>
                      <Button
                        disabled={!selectedOrderCount}
                        onClick={handleAssign}
                        loading={fetcher.state !== "idle" && fetcher.submission?.formData.get("intent") === "assign"}
                      >
                        Assign
                      </Button>
                      <Button
                        disabled={!selectedOrderCount}
                        onClick={handleMarkFulfilled}
                        loading={
                          fetcher.state !== "idle" &&
                          fetcher.submission?.formData.get("intent") === "markFulfilled"
                        }
                      >
                        Mark fulfilled
                      </Button>
                      <Button
                        disabled={!selectedOrderCount}
                        onClick={() => setSupportModalOpen(true)}
                        loading={isRequestSupportBusy}
                      >
                        Request follow-up
                      </Button>
                    </ButtonGroup>
                  </InlineStack>
                </InlineStack>

                <IndexTable
                  resourceName={{ singular: "order", plural: "orders" }}
                  itemCount={optimisticOrders.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={mdUp ? IndexHeadingsDesktop : IndexHeadingsMobile}
                >
                  {optimisticOrders.map((order, index) => (
                    <IndexTable.Row
                      id={order.id}
                      key={order.id}
                      position={index}
                      onClick={() => setActiveOrderId(order.id)}
                    >
                      <IndexTable.Cell>
                        <BlockStack gap="050">
                          <Text variant="bodyMd" fontWeight="semibold" as="span">
                            {order.name}
                          </Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Badge tone={PRIORITY_TONE[order.priority]}>{order.priority}</Badge>
                            <Text as="span" tone="subdued" variant="bodySm">
                              {order.customer.name}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Badge tone={order.issue === "none" ? "success" : "warning"}>
                            {order.issue}
                          </Badge>
                        </IndexTable.Cell>
                      )}
                      <IndexTable.Cell>
                        <Text variant="bodySm" as="span">
                          {order.total.formatted}
                        </Text>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {formatDate(order.shipBy ?? order.fulfillmentDueAt)}
                          </Text>
                        </IndexTable.Cell>
                      )}
                      <IndexTable.Cell>
                        <Text variant="bodySm" as="span">
                          {order.ageHours.toFixed(1)}h ago
                        </Text>
                      </IndexTable.Cell>
                      {mdUp && (
                        <IndexTable.Cell>
                          <Text variant="bodySm" tone="subdued" as="span">
                            {order.assignedTo}
                          </Text>
                        </IndexTable.Cell>
                      )}
                    </IndexTable.Row>
                  ))}
                </IndexTable>
                <InlineStack align="space-between" blockAlign="center">
                  <Text tone="subdued" variant="bodySm" as="span">
                    {pageSummary}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Select
                      labelHidden
                      label="Rows per page"
                      options={pageSizeOptions}
                      value={pageSizeValue}
                      onChange={handlePageSizeChange}
                    />
                    <Pagination
                      label={pageLabel}
                      hasPrevious={canGoPrevious}
                      onPrevious={handlePreviousPage}
                      hasNext={canGoNext}
                      onNext={handleNextPage}
                    />
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Card>

            <Grid columns={{ xs: 1, md: 2 }} gap="400">
              <Grid.Cell>
                <ShipmentsCard
                  shipments={dataset.shipments}
                  onAddTracking={handleShipmentAddTracking}
                  onTriggerFollowUp={handleShipmentFollowUp}
                  actionState={actionState}
                />
              </Grid.Cell>
              <Grid.Cell>
                <ReturnsCard
                  returns={dataset.returns}
                  onHandleReturn={handleReturnAction}
                  actionState={actionState}
                />
              </Grid.Cell>
            </Grid>

            <OperationalNotes inventory={dataset.inventory} alerts={alerts} />
          </BlockStack>
        </Layout.Section>
      </Layout>

      {toast && (
        <Toast
          content={toast.message}
          duration={3000}
          error={toast.status === "error"}
          onDismiss={() => setToast(null)}
        />
      )}

      <Modal
        open={supportModalOpen}
        onClose={handleSupportClose}
        title={`Request support${selectedOrderCount > 1 ? ` (${selectedOrderCount})` : ""}`}
        primaryAction={{
          content: selectedOrderCount > 1 ? "Send requests" : "Send request",
          onAction: handleSupportSubmit,
          loading: isRequestSupportBusy,
          disabled: !selectedOrderCount || isRequestSupportBusy,
        }}
        secondaryActions={[{ content: "Cancel", onAction: handleSupportClose, disabled: isRequestSupportBusy }]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            {selectedOrderLabels.length > 0 && (
              <Text tone="subdued" variant="bodySm" as="span">
                Target orders: {selectedOrderLabels.join(", ")}
              </Text>
            )}
            <TextField
              label="Note for support"
              value={supportNote}
              onChange={setSupportNote}
              multiline={4}
              autoComplete="off"
              placeholder="Include context, blockers, or next steps for support."
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      <OrderDetailModal order={activeOrder} onClose={() => setActiveOrderId(null)} />
    </Page>
  );
}

const AssignOptions = [
  { label: "Assistant", value: "assistant" },
  { label: "Ops team", value: "ops" },
  { label: "Unassigned", value: "unassigned" },
];

const IndexHeadingsDesktop = [
  { title: "Order" },
  { title: "Issue" },
  { title: "Value" },
  { title: "Ship by" },
  { title: "Age" },
  { title: "Owner" },
];

const IndexHeadingsMobile = [
  { title: "Order" },
  { title: "Value" },
  { title: "Age" },
];

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(value))
    : "—";

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

const inventoryHoldTone = (
  entry: OrdersDataset["inventory"][number],
): "critical" | "warning" | "attention" => {
  if (entry.onHand <= 0) {
    return "critical";
  }
  if (entry.ordersWaiting > entry.onHand) {
    return "warning";
  }
  return "attention";
};

const inventoryHoldSuggestion = (entry: OrdersDataset["inventory"][number]): string => {
  if (entry.onHand <= 0) {
    return "No stock on hand — escalate the purchase order or reroute impacted orders.";
  }
  const deficit = entry.ordersWaiting - entry.onHand;
  if (deficit > 0) {
    return `${deficit} unit${deficit === 1 ? "" : "s"} short — split shipments or recommend alternates until restock arrives.`;
  }
  if (entry.ordersWaiting === 0) {
    return "Inventory is clear — confirm the block is lifted in fulfillment.";
  }
  return "Sufficient stock to cover waiting orders — coordinate pick/pack to release the hold.";
};

const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

function formatOwner(value: string): string {
  if (!value) return "Unassigned";
  if (value === "assistant") return "Assistant";
  if (value === "unassigned") return "Unassigned";
  return toTitleCase(value);
}

function formatChannel(value: string): string {
  switch (value) {
    case "online":
      return "Online";
    case "pos":
      return "POS";
    case "draft":
      return "Draft";
    default:
      return toTitleCase(value);
  }
}

function FulfillmentPulseCard({ metrics }: { metrics: OrdersMetrics }) {
  const rows: Array<[string, string, "critical" | "warning" | "success" | "attention" | undefined]> = [
    ["Total orders", String(metrics.totalOrders), undefined],
    ["Awaiting fulfillment", String(metrics.awaitingFulfillment), metrics.awaitingFulfillment > 0 ? "attention" : "success"],
    ["Awaiting tracking", String(metrics.awaitingTracking), metrics.awaitingTracking > 0 ? "warning" : "success"],
    ["Overdue", `${metrics.overdue} (${metrics.overduePercentage.toFixed(0)}%)`, metrics.overdue > 0 ? "critical" : "success"],
    ["Avg fulfillment time", `${metrics.averageFulfillmentHours.toFixed(1)}h`, undefined],
    ["SLA breaches", String(metrics.slaBreaches), metrics.slaBreaches ? "critical" : "success"],
  ];

  return (
    <Card title="Fulfillment pulse">
      <Card.Section>
        <Grid columns={{ xs: 1, sm: 2, md: 3 }} gap="200">
          {rows.map(([label, value, tone]) => (
            <Grid.Cell key={label}>
              <BlockStack gap="050">
                <Text as="span" tone="subdued" variant="bodySm">
                  {label}
                </Text>
                <Text as="span" variant="headingSm">
                  {value}
                </Text>
                {tone && <Badge tone={tone}>Action needed</Badge>}
              </BlockStack>
            </Grid.Cell>
          ))}
        </Grid>
      </Card.Section>
    </Card>
  );
}

function ShipmentsCard({
  shipments,
  onAddTracking,
  onTriggerFollowUp,
  actionState,
}: {
  shipments: OrdersDataset["shipments"];
  onAddTracking: (shipment: OrdersDataset["shipments"]["trackingPending"][number]) => void;
  onTriggerFollowUp: (shipment: OrdersDataset["shipments"]["delayed"][number]) => void;
  actionState: { intent: string | null; isBusy: boolean };
}) {
  const trackingBusy = actionState.isBusy && actionState.intent === "markFulfilled";
  const followUpBusy = actionState.isBusy && actionState.intent === "requestSupport";

  return (
    <Card title="Shipments">
      <Card.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">
              Tracking pending ({shipments.trackingPending.length})
            </Text>
            <Text tone="subdued" variant="bodySm" as="span">
              Delivered today: {shipments.deliveredToday}
            </Text>
          </InlineStack>
          {shipments.trackingPending.length ? (
            <BlockStack gap="200">
              {shipments.trackingPending.map((entry) => (
                <InlineStack
                  key={entry.id}
                  align="space-between"
                  blockAlign="center"
                  wrap
                  gap="200"
                >
                  <BlockStack gap="050">
                    <Text variant="bodyMd" fontWeight="semibold" as="span">
                      {entry.orderNumber}
                    </Text>
                    <Text tone="subdued" variant="bodySm" as="span">
                      Expected {formatDate(entry.expectedShipDate)} · Owner {formatOwner(entry.owner)}
                    </Text>
                  </BlockStack>
                  <Button
                    onClick={() => onAddTracking(entry)}
                    disabled={trackingBusy}
                    loading={trackingBusy}
                    variant="primary"
                  >
                    Add tracking
                  </Button>
                </InlineStack>
              ))}
            </BlockStack>
          ) : (
            <Text variant="bodySm">No tracking items pending.</Text>
          )}
        </BlockStack>
      </Card.Section>
      <Divider borderColor="border" />
      <Card.Section>
        <BlockStack gap="200">
          <Text variant="headingSm" as="h3">
            Delayed ({shipments.delayed.length})
          </Text>
          {shipments.delayed.length ? (
            <BlockStack gap="200">
              {shipments.delayed.map((entry) => (
                <InlineStack
                  key={entry.id}
                  align="space-between"
                  blockAlign="center"
                  wrap
                  gap="200"
                >
                  <BlockStack gap="050">
                    <Text variant="bodyMd" fontWeight="semibold" as="span">
                      {entry.orderNumber}
                    </Text>
                    <Text tone="subdued" variant="bodySm" as="span">
                      {entry.carrier} delay {entry.delayHours}h · Last update {formatDateTime(entry.lastUpdate)}
                    </Text>
                  </BlockStack>
                  <Button
                    onClick={() => onTriggerFollowUp(entry)}
                    disabled={followUpBusy}
                    loading={followUpBusy}
                  >
                    Trigger follow-up
                  </Button>
                </InlineStack>
              ))}
            </BlockStack>
          ) : (
            <Text variant="bodySm">No carrier delays.</Text>
          )}
        </BlockStack>
      </Card.Section>
    </Card>
  );
}

function ReturnsCard({
  returns,
  onHandleReturn,
  actionState,
}: {
  returns: OrdersDataset["returns"];
  onHandleReturn: (
    entry: OrdersDataset["returns"]["pending"][number],
    action: "approve_refund" | "deny" | "request_inspection",
  ) => void;
  actionState: { intent: string | null; isBusy: boolean };
}) {
  const returnBusy = (action: string) => actionState.isBusy && actionState.intent === action;

  return (
    <Card title="Returns & refunds">
      <Card.Section>
        <Text variant="bodySm" tone="subdued" as="span">
          Refund exposure {returns.refundValue.formatted} • Pending approvals {returns.refundsDue}
        </Text>
      </Card.Section>
      <Card.Section>
        {returns.pending.length ? (
          <BlockStack gap="200">
            {returns.pending.map((entry) => (
              <BlockStack key={entry.id} gap="150">
                <InlineStack align="space-between" blockAlign="center" wrap gap="200">
                  <BlockStack gap="050">
                    <Text variant="bodyMd" fontWeight="semibold" as="span">
                      {entry.orderNumber}
                    </Text>
                    <Text tone="subdued" variant="bodySm" as="span">
                      Stage {entry.stage.replace(/_/g, " ")} · Reason {entry.reason} · Age {entry.ageDays.toFixed(1)}d
                    </Text>
                  </BlockStack>
                  <ButtonGroup>
                    <Button
                      variant="primary"
                      onClick={() => onHandleReturn(entry, "approve_refund")}
                      loading={returnBusy("updateReturn")}
                      disabled={returnBusy("updateReturn")}
                    >
                      Approve refund
                    </Button>
                    <Button
                      onClick={() => onHandleReturn(entry, "request_inspection")}
                      loading={returnBusy("updateReturn")}
                      disabled={returnBusy("updateReturn")}
                    >
                      Request inspection
                    </Button>
                    <Button
                      tone="critical"
                      onClick={() => onHandleReturn(entry, "deny")}
                      loading={returnBusy("updateReturn")}
                      disabled={returnBusy("updateReturn")}
                    >
                      Deny
                    </Button>
                  </ButtonGroup>
                </InlineStack>
              </BlockStack>
            ))}
          </BlockStack>
        ) : (
          <Text variant="bodySm">No returns pending.</Text>
        )}
      </Card.Section>
    </Card>
  );
}

function OperationalNotes({
  inventory,
  alerts,
}: {
  inventory: OrdersDataset["inventory"];
  alerts: string[];
}) {
  return (
    <Card title="Operational notes">
      <Card.Section>
        <BlockStack gap="200">
          <Text variant="headingSm" as="h3">
            Inventory blocks
          </Text>
          {inventory.length ? (
            <BlockStack gap="200">
              {inventory.map((item, index) => (
                <BlockStack key={item.sku} gap="150">
                  {index > 0 ? <Divider borderColor="border" /> : null}
                  <InlineStack align="space-between" blockAlign="start" gap="200" wrap>
                    <BlockStack gap="100">
                      <BlockStack gap="050">
                        <Text variant="bodyMd" fontWeight="semibold" as="span">
                          {item.sku} — {item.title}
                        </Text>
                        <InlineStack gap="150" wrap>
                          <Badge tone={inventoryHoldTone(item)}>
                            {item.ordersWaiting} waiting
                          </Badge>
                          <Badge tone={item.onHand > 0 ? "info" : "critical"}>
                            {item.onHand} on hand
                          </Badge>
                          <Text tone="subdued" variant="bodySm" as="span">
                            ETA {formatDate(item.eta)}
                          </Text>
                        </InlineStack>
                      </BlockStack>
                      <Text variant="bodySm" as="p">
                        {inventoryHoldSuggestion(item)}
                      </Text>
                    </BlockStack>
                    <Button
                      variant="plain"
                      url={`/app/inventory?sku=${encodeURIComponent(item.sku)}`}
                    >
                      Review in inventory
                    </Button>
                  </InlineStack>
                </BlockStack>
              ))}
            </BlockStack>
          ) : (
            <Text variant="bodySm">No inventory holds.</Text>
          )}
        </BlockStack>
      </Card.Section>
      {alerts.length > 0 && (
        <Card.Section>
          <Text variant="headingSm" as="h3">
            Alerts
          </Text>
          <BlockStack gap="100">
            {alerts.map((alert, index) => (
              <Text key={index} variant="bodySm">
                • {alert}
              </Text>
            ))}
          </BlockStack>
        </Card.Section>
      )}
    </Card>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const lineItemRows = order.lineItems.map((item) => [
    item.title,
    item.sku,
    `${item.quantity} × ${item.price.formatted}`,
    item.total.formatted,
  ]);
  const hasLineItems = lineItemRows.length > 0;
  const tags = order.tags.filter(Boolean);
  const supportThreadLink = order.supportThread
    ? `/app/inbox?conversation=${encodeURIComponent(order.supportThread)}`
    : null;

  return (
    <Modal
      instant
      open
      onClose={onClose}
      title={`Order ${order.name}`}
      primaryAction={{ content: "Close", onAction: onClose }}
    >
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="050">
              <Text variant="headingSm" as="h3">
                {order.name}
              </Text>
              <Text tone="subdued" variant="bodySm" as="span">
                Placed {formatDateTime(order.placedAt)} · {order.channel.toUpperCase()}
              </Text>
            </BlockStack>
            <Badge tone={PRIORITY_TONE[order.priority]}>{order.priority}</Badge>
          </InlineStack>
          <Grid columns={{ xs: 1, sm: 2 }} gap="200">
            <Grid.Cell>
              <BlockStack gap="050">
                <Text tone="subdued" variant="bodySm" as="span">
                  Status
                </Text>
                <InlineStack gap="100" blockAlign="center">
                  <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                  <Badge tone={FULFILLMENT_TONE[order.fulfillmentStatus]}>
                    Fulfillment: {order.fulfillmentStatus}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell>
              <BlockStack gap="050">
                <Text tone="subdued" variant="bodySm" as="span">
                  Issue
                </Text>
                <Badge tone={ISSUE_TONE[order.issue]}>
                  {order.issue === "none" ? "No active issue" : order.issue.replace(/_/g, " ")}
                </Badge>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell>
              <BlockStack gap="050">
                <Text tone="subdued" variant="bodySm" as="span">
                  Owner
                </Text>
                <Text variant="bodyMd" as="span">
                  {order.assignedTo ?? "unassigned"}
                </Text>
                <Text tone="subdued" variant="bodySm" as="span">
                  {order.ageHours.toFixed(1)}h in queue
                </Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell>
              <BlockStack gap="050">
                <Text tone="subdued" variant="bodySm" as="span">
                  Ship by
                </Text>
                <Text variant="bodyMd" as="span">
                  {formatDate(order.shipBy ?? order.fulfillmentDueAt)}
                </Text>
                <Text tone="subdued" variant="bodySm" as="span">
                  Order value {order.total.formatted}
                </Text>
              </BlockStack>
            </Grid.Cell>
          </Grid>
          {tags.length > 0 && (
            <InlineStack gap="100">
              {tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </InlineStack>
          )}
        </BlockStack>
      </Modal.Section>
      <Divider borderColor="border" />
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">
              Customer
            </Text>
            <Text tone="subdued" variant="bodySm" as="span">
              Lifetime value {order.customer.lifetimeValue.formatted}
            </Text>
          </InlineStack>
          <BlockStack gap="050">
            <Text variant="bodyMd" as="span">
              {order.customer.name}
            </Text>
            <Text tone="subdued" variant="bodySm" as="span">
              {order.customer.email}
            </Text>
            <Text tone="subdued" variant="bodySm" as="span">
              {order.customer.location}
            </Text>
          </BlockStack>
          <InlineStack gap="200">
            <Text tone="subdued" variant="bodySm" as="span">
              First order {formatDate(order.customer.firstOrderAt)}
            </Text>
            <Text tone="subdued" variant="bodySm" as="span">
              Last order {formatDate(order.customer.lastOrderAt)}
            </Text>
          </InlineStack>
        </BlockStack>
      </Modal.Section>
      {hasLineItems && (
        <>
          <Divider borderColor="border" />
          <Modal.Section>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingSm" as="h3">
                  Items
                </Text>
                <Text tone="subdued" variant="bodySm" as="span">
                  Subtotal {order.subtotal.formatted} · Shipping {order.shipping.formatted}
                </Text>
              </InlineStack>
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Product", "SKU", "Qty × Price", "Total"]}
                rows={lineItemRows}
              />
            </BlockStack>
          </Modal.Section>
        </>
      )}
      <Divider borderColor="border" />
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingSm" as="h3">
              Fulfillment timeline
            </Text>
            <BlockStack gap="050" align="start">
              <Text tone="subdued" variant="bodySm" as="span">
                Support thread
              </Text>
              {order.supportThread && supportThreadLink ? (
                <Button
                  variant="plain"
                  url={supportThreadLink}
                  accessibilityLabel={`Open support thread ${order.supportThread}`}
                >
                  {order.supportThread}
                </Button>
              ) : (
                <Text tone="subdued" variant="bodySm" as="span">
                  Not linked
                </Text>
              )}
            </BlockStack>
          </InlineStack>
          <BlockStack gap="100">
            {order.timeline.length ? (
              order.timeline.map((event) => (
                <BlockStack key={event.id} gap="050">
                  <Text variant="bodyMd" fontWeight="semibold" as="span">
                    {event.message}
                  </Text>
                  <Text tone="subdued" variant="bodySm" as="span">
                    {formatDateTime(event.occurredAt)}
                  </Text>
                </BlockStack>
              ))
            ) : (
              <Text tone="subdued" variant="bodySm" as="span">
                No events recorded yet.
              </Text>
            )}
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

type UseOptimisticOrdersParams = {
  baseOrders: Order[];
  submission: ReturnType<typeof useFetcher<OrdersActionResponse>>["submission"];
  response: OrdersActionResponse | undefined;
};

function useOptimisticOrders({ baseOrders, submission, response }: UseOptimisticOrdersParams) {
  const [optimisticOrders, setOptimisticOrders] = useState<Order[]>(baseOrders);
  const lastSubmissionRef = useRef<typeof submission>(null);
  const lastResponseRef = useRef<OrdersActionResponse | null>(null);

  useEffect(() => {
    setOptimisticOrders(baseOrders);
  }, [baseOrders]);

  useEffect(() => {
    if (!submission || submission === lastSubmissionRef.current) {
      return;
    }
    lastSubmissionRef.current = submission;
    const intent = submission.formData.get("intent");
    if (typeof intent !== "string" || !intent) {
      return;
    }
    const formData = submission.formData;
    setOptimisticOrders((current) =>
      applyOptimisticSubmission({
        current,
        intent,
        formData,
      }),
    );
  }, [submission]);

  useEffect(() => {
    if (!response || response === lastResponseRef.current) {
      return;
    }
    lastResponseRef.current = response;
    if (response.success === false) {
      setOptimisticOrders(baseOrders);
      return;
    }
    if (!Array.isArray(response.updatedOrders) || response.updatedOrders.length === 0) {
      return;
    }
    setOptimisticOrders((current) => applyUpdatedOrderPatches(current, response.updatedOrders));
  }, [baseOrders, response]);

  return useMemo(() => {
    const lookup = new Map<string, Order>();
    optimisticOrders.forEach((order) => {
      lookup.set(order.id, order);
    });
    return { orders: optimisticOrders, lookup };
  }, [optimisticOrders]);
}

function applyOptimisticSubmission({
  current,
  intent,
  formData,
}: {
  current: Order[];
  intent: string;
  formData: FormData;
}): Order[] {
  switch (intent) {
    case "assign": {
      const ids = parseOrderIds(formData.get("orderIds"));
      if (!ids.length) return current;
      const assigneeRaw = formData.get("assignee");
      const assignee = typeof assigneeRaw === "string" && assigneeRaw.trim().length
        ? assigneeRaw.trim()
        : "unassigned";
      return applyOrderTransform(current, ids, (order) => {
        if (order.assignedTo === assignee) return order;
        return { ...order, assignedTo: assignee };
      });
    }
    case "markFulfilled": {
      const ids = parseOrderIds(formData.get("orderIds"));
      if (!ids.length) return current;
      const tracking = parseJson<{ number?: string; carrier?: string }>(formData.get("tracking"));
      const timestamp = new Date().toISOString();
      return applyOrderTransform(current, ids, (order) => {
        if (order.fulfillmentStatus === "fulfilled" && order.status === "fulfilled") {
          return order;
        }
        const optimisticId = `${order.id}-optimistic-fulfill-${timestamp}`;
        const timelineExists = order.timeline.some((event) => event.id === optimisticId);
        const messageParts = ["Marked fulfilled — awaiting Sync"];
        if (tracking?.number) {
          messageParts.push(`Tracking ${tracking.number}`);
        }
        const nextTimeline = timelineExists
          ? order.timeline
          : [
              {
                id: optimisticId,
                type: "fulfillment" as const,
                message: messageParts.join(" · "),
                occurredAt: timestamp,
                state: "fulfilled",
              },
              ...order.timeline,
            ];
        return {
          ...order,
          status: "fulfilled",
          fulfillmentStatus: "fulfilled",
          issue: "none",
          timeline: nextTimeline,
        };
      });
    }
    case "requestSupport": {
      const payload = parseJson<{ orderIds?: unknown; conversationId?: string; note?: string }>(
        formData.get("payload"),
      );
      const ids = Array.isArray(payload?.orderIds)
        ? (payload?.orderIds ?? []).map((value) => String(value))
        : [];
      if (!ids.length) return current;
      const note = typeof payload?.note === "string" ? payload.note.trim() : "";
      const timestamp = new Date().toISOString();
      return applyOrderTransform(current, ids, (order, index) => {
        const fallbackThread = order.supportThread ?? `conversation:${order.id}`;
        const optimisticThread = payload?.conversationId ?? fallbackThread;
        const optimisticId = `${order.id}-optimistic-support-${timestamp}-${index}`;
        const timelineExists = order.timeline.some((event) => event.id === optimisticId);
        const timelineMessage = note
          ? `Support requested — ${note}`
          : "Support follow-up requested from dashboard.";
        return {
          ...order,
          supportThread: optimisticThread,
          timeline: timelineExists
            ? order.timeline
            : [
                {
                  id: optimisticId,
                  type: "note",
                  message: timelineMessage,
                  occurredAt: timestamp,
                },
                ...order.timeline,
              ],
        };
      });
    }
    default:
      return current;
  }
}

function applyOrderTransform(
  orders: Order[],
  ids: string[],
  transform: (order: Order, index: number) => Order,
): Order[] {
  if (!ids.length) return orders;
  const idSet = new Set(ids);
  let changed = false;
  const next = orders.map((order, index) => {
    if (!idSet.has(order.id)) return order;
    const result = transform(order, index);
    if (result !== order) {
      changed = true;
    }
    return result;
  });
  return changed ? next : orders;
}

function applyUpdatedOrderPatches(orders: Order[], updates: SyncOrdersActionUpdate[]): Order[] {
  if (!updates.length) return orders;
  const updateMap = new Map<string, SyncOrdersActionUpdate>();
  updates.forEach((update) => {
    if (update && typeof update === "object" && "id" in update && typeof update.id === "string") {
      updateMap.set(update.id, update);
    }
  });
  if (!updateMap.size) return orders;

  return orders.map((order) => {
    const patch = updateMap.get(order.id);
    if (!patch) return order;
    let next: Order = order;
    let changed = false;

    if ("assignedTo" in patch && typeof patch.assignedTo === "string") {
      const assigned = patch.assignedTo.trim() || "unassigned";
      if (assigned !== order.assignedTo) {
        next = changed ? { ...next, assignedTo: assigned } : { ...order, assignedTo: assigned };
        changed = true;
      }
    }

    if ("fulfillmentStatus" in patch && typeof patch.fulfillmentStatus === "string") {
      const normalizedStatus = normalizeFulfillmentStatus(patch.fulfillmentStatus);
      if (normalizedStatus && normalizedStatus !== order.fulfillmentStatus) {
        next = changed ? { ...next } : { ...order };
        next.fulfillmentStatus = normalizedStatus;
        if (normalizedStatus === "fulfilled") {
          next.status = "fulfilled";
          next.issue = "none";
        }
        changed = true;
      }
    }

    if ("supportThread" in patch && typeof patch.supportThread === "string") {
      if (patch.supportThread && patch.supportThread !== order.supportThread) {
        next = changed ? { ...next, supportThread: patch.supportThread } : { ...order, supportThread: patch.supportThread };
        changed = true;
      }
    }

    return changed ? next : order;
  });
}

function parseOrderIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parsed = parseJson<unknown>(trimmed);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => String(entry)).filter((entry) => entry.length > 0);
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseJson<T>(value: FormDataEntryValue | null): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeFulfillmentStatus(value: string): Order["fulfillmentStatus"] | null {
  const normalized = value.toLowerCase();
  if (normalized === "fulfilled") return "fulfilled";
  if (normalized === "partial") return "partial";
  if (normalized === "unfulfilled") return "unfulfilled";
  if (normalized === "in_transit" || normalized === "awaiting_tracking") return "partial";
  return null;
}
