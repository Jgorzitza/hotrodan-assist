import { describe, expect, it } from "vitest";
import { InMemoryStream } from "../memory-transport.server";

const topic = "test-topic";

describe("InMemoryStream", () => {
  it("preserves ordering by key within batches and retries with backoff", async () => {
    const stream = new InMemoryStream<{ n: number }>();

    const processed: number[] = [];
    let failOnce = true;

    await stream.publish(topic, { id: "1", key: "a", payload: { n: 1 }, timestamp: Date.now() });
    await stream.publish(topic, { id: "2", key: "a", payload: { n: 2 }, timestamp: Date.now() });

    setTimeout(() => {
      void stream.consume(
        topic,
        async (batch) => {
          for (const m of batch) {
            if (failOnce) {
              failOnce = false;
              throw new Error("transient");
            }
            processed.push(m.payload.n);
          }
        },
        { maxBatch: 2, maxConcurrent: 1 },
      );
    }, 0);

    await new Promise((r) => setTimeout(r, 200));
    expect(processed).toEqual([1, 2]);
  });

  it("routes permanently failing messages to DLQ after retries", async () => {
    const stream = new InMemoryStream<{ n: number }>();
    const dlq: { id: string; reason: string }[] = [];
    stream.setDlq(async (msg, reason) => {
      dlq.push({ id: msg.id, reason });
    });

    await stream.publish(topic, { id: "3", key: "b", payload: { n: 3 }, timestamp: Date.now() });

    setTimeout(() => {
      void stream.consume(
        topic,
        async () => {
          throw new Error("permanent");
        },
        { maxBatch: 1, maxConcurrent: 1 },
      );
    }, 0);

    await new Promise((r) => setTimeout(r, 400));
    expect(dlq.length).toBeGreaterThanOrEqual(1);
    expect(dlq[0]?.reason).toBe("permanent");
  });
});