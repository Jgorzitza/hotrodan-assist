export type StreamKey = string;

export type StreamMessage<T = unknown> = {
  id: string;
  key: StreamKey;
  payload: T;
  timestamp: number;
  attempt?: number;
};

export type PublishOptions = {
  dedupeKey?: string;
};

export type ConsumeOptions = {
  maxBatch?: number;
  maxConcurrent?: number;
  ackOnProcess?: boolean;
};

export interface StreamPublisher<T = unknown> {
  publish(topic: string, message: StreamMessage<T>, options?: PublishOptions): Promise<void>;
}

export interface StreamConsumer<T = unknown> {
  consume(
    topic: string,
    handler: (batch: StreamMessage<T>[]) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void>;
}

export type DlqHandler<T = unknown> = (msg: StreamMessage<T>, reason: string) => Promise<void>;