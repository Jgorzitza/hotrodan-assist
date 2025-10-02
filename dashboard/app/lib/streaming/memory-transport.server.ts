import { randomUUID } from "node:crypto";
import type { ConsumeOptions, DlqHandler, StreamConsumer, StreamMessage, StreamPublisher } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class InMemoryStream<T = unknown> implements StreamPublisher<T>, StreamConsumer<T> {
  private readonly topics = new Map<string, StreamMessage<T>[]>();
  private dlq: DlqHandler<T> | null = null;

  setDlq(handler: DlqHandler<T>) {
    this.dlq = handler;
  }

  async publish(topic: string, message: StreamMessage<T>): Promise<void> {
    const q = this.topics.get(topic) ?? [];
    q.push({ ...message, id: message.id || randomUUID(), timestamp: Date.now(), attempt: message.attempt ?? 0 });
    this.topics.set(topic, q);
  }

  async consume(
    topic: string,
    handler: (batch: StreamMessage<T>[]) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void> {
    const maxBatch = Math.max(1, options?.maxBatch ?? 10);
    const maxConcurrent = Math.max(1, options?.maxConcurrent ?? 1);

    const loop = async () => {
      const q = this.topics.get(topic) ?? [];
      if (q.length === 0) {
        await sleep(5);
        return;
      }
      const batch = q.splice(0, Math.min(maxBatch, q.length));

      try {
        await handler(batch);
      } catch (err) {
        // requeue with backoff and DLQ when exceeding attempt budget
        for (const m of batch) {
          const attempt = (m.attempt ?? 0) + 1;
          if (attempt >= 5) {
            await this.dlq?.(m, (err as Error)?.message ?? "processing error");
            continue;
          }
          await sleep(Math.min(2 ** attempt * 10, 200));
          await this.publish(topic, { ...m, attempt });
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < maxConcurrent; i += 1) {
      workers.push(
        (async () => {
          // simple forever loop; consumer controls lifetime
          // eslint-disable-next-line no-constant-condition
          while (true) {
            await loop();
          }
        })(),
      );
    }

    await Promise.all(workers);
  }
}