import type { HitResult, Limiter, LimiterFactory } from "./rate-limit";

/** Runs Redis commands in one round trip. Returns each command's result, in order. */
export type RedisPipeline = (commands: (string | number)[][]) => Promise<unknown[]>;

/** Upstash's REST API (POST /pipeline). Plain fetch, no client library. */
export function createUpstashPipeline(url: string, token: string, timeoutMs = 1500): RedisPipeline {
  const endpoint = `${url.replace(/\/$/, "")}/pipeline`;
  return async (commands) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string }[];
    return body.map((r) => {
      if (r.error) throw new Error(`upstash: ${r.error}`);
      return r.result;
    });
  };
}

/**
 * Fixed-window limiter shared by every API instance. Same rules as the in-memory
 * RateLimiter: `limit` hits per key per window.
 *
 * Fails open: if Redis is down or slow, requests go through (and it logs, at most once
 * a minute). A Redis outage shouldn't take the waitlist down; Turnstile still guards joins.
 */
export class RedisRateLimiter implements Limiter {
  private lastLog = 0;

  constructor(
    private readonly redis: RedisPipeline,
    private readonly name: string,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  async hit(key: string): Promise<HitResult> {
    const k = `stackz:rl:${this.name}:${key}`;
    try {
      // NX: the window starts at the first hit and isn't pushed back by later ones.
      const [count, , ttl] = await this.redis([
        ["INCR", k],
        ["PEXPIRE", k, this.windowMs, "NX"],
        ["PTTL", k],
      ]);
      const ms = typeof ttl === "number" && ttl > 0 ? ttl : this.windowMs;
      return { ok: Number(count) <= this.limit, retryAfterSeconds: Math.ceil(ms / 1000) };
    } catch (err) {
      const t = this.now();
      if (t - this.lastLog > 60_000) {
        this.lastLog = t;
        console.error(`rate limit store unavailable, allowing requests (${this.name})`, err);
      }
      return { ok: true, retryAfterSeconds: 0 };
    }
  }
}

export function createRedisLimiterFactory(redis: RedisPipeline): LimiterFactory {
  return (name, limit, windowMs) => new RedisRateLimiter(redis, name, limit, windowMs);
}
