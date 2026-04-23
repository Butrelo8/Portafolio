export interface RateLimitStore {
  /**
   * Atomically increment counter for `key`.
   * Creates the bucket if absent or expired.
   * Returns new count and ms timestamp when the window resets.
   */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  /** Release resources (close connections, clear intervals). Called on shutdown. */
  close?(): Promise<void> | void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class MemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private readonly interval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60_000) {
    this.interval = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(key);
      }
    }, cleanupIntervalMs);
    if (typeof (this.interval as { unref?: () => void }).unref === 'function') {
      (this.interval as { unref: () => void }).unref();
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const bucket: Bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
      return { count: 1, resetAt: bucket.resetAt };
    }
    existing.count += 1;
    return { count: existing.count, resetAt: existing.resetAt };
  }

  close(): void {
    clearInterval(this.interval);
  }
}
