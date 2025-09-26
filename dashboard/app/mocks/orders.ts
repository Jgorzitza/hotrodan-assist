export type OrderRow = {
  id: string;
  name: string;
  customer: string;
  placedAt: string;
  total: string;
  status: string;
  attention: string | null;
};

export type OrdersCollection = {
  tab: "unshipped" | "delivery" | "completed";
  rows: OrderRow[];
};

const ordersMock: Record<OrdersCollection["tab"], OrderRow[]> = {
  unshipped: [
    {
      id: "#1024",
      name: "Order #1024",
      customer: "Sloan Garage",
      placedAt: "2024-02-04",
      total: "$1,240",
      status: "Paid",
      attention: "Needs pick",
    },
    {
      id: "#1025",
      name: "Order #1025",
      customer: "Boost Labs",
      placedAt: "2024-02-04",
      total: "$980",
      status: "Paid",
      attention: "Backordered part",
    },
  ],
  delivery: [
    {
      id: "#1018",
      name: "Order #1018",
      customer: "Cam Street",
      placedAt: "2024-02-01",
      total: "$640",
      status: "In transit",
      attention: "Tracking stalled",
    },
    {
      id: "#1015",
      name: "Order #1015",
      customer: "Turbo Shed",
      placedAt: "2024-01-30",
      total: "$410",
      status: "In transit",
      attention: "Customer reported missing",
    },
  ],
  completed: [
    {
      id: "#1001",
      name: "Order #1001",
      customer: "Boost Bros",
      placedAt: "2023-12-28",
      total: "$1,050",
      status: "Delivered",
      attention: null,
    },
  ],
};

export const getOrdersCollection = async (tab: OrdersCollection["tab"]) => {
  return {
    tab,
    rows: ordersMock[tab],
  } satisfies OrdersCollection;
};
