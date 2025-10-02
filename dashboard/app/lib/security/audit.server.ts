export type AuditEvent = {
  actor: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

const buffer: AuditEvent[] = [];

export const recordAuditEvent = (event: Omit<AuditEvent, "createdAt">) => {
  const entry: AuditEvent = { ...event, createdAt: new Date().toISOString() };
  buffer.push(entry);
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("audit", entry);
  }
  return entry;
};

export const listAuditEvents = () => [...buffer];
export const resetAuditEvents = () => {
  buffer.length = 0;
};