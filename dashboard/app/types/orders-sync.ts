export type SyncOrdersAssignPayload = {
  orderIds: string[];
  assignee: string;
};

export type SyncOrdersTracking = {
  number: string;
  carrier: string;
};

export type SyncOrdersFulfillPayload = {
  orderIds: string[];
  tracking?: SyncOrdersTracking;
};

export type SyncOrdersSupportPayload = {
  orderId: string;
  conversationId?: string;
  note?: string;
};

export type SyncOrdersReturnsPayload = {
  orderId: string;
  action: "approve_refund" | "deny" | "request_inspection";
  note?: string;
};

export type SyncOrdersAssignUpdate = {
  id: string;
  assignedTo: string;
};

export type SyncOrdersFulfillUpdate = {
  id: string;
  fulfillmentStatus: string;
  tracking?: SyncOrdersTracking | null;
};

export type SyncOrdersSupportUpdate = {
  id: string;
  supportThread: string;
};

export type SyncOrdersActionEnvelope<TUpdate> = {
  success: boolean;
  message?: string;
  updatedOrders: TUpdate;
};

export type SyncOrdersAssignResponse = SyncOrdersActionEnvelope<SyncOrdersAssignUpdate[]>;
export type SyncOrdersFulfillResponse = SyncOrdersActionEnvelope<SyncOrdersFulfillUpdate[]>;
export type SyncOrdersSupportResponse = SyncOrdersActionEnvelope<SyncOrdersSupportUpdate[]>;
export type SyncOrdersReturnsResponse = SyncOrdersActionEnvelope<[]>;

export type SyncOrdersActionUpdate =
  | SyncOrdersAssignUpdate
  | SyncOrdersFulfillUpdate
  | SyncOrdersSupportUpdate;
