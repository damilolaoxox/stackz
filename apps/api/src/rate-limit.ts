import type { Context, MiddlewareHandler } from "hono";
import type { ApiError } from "@stackz/shared";

/**
 * Fixed-window, in-process limiter. Fine for a single Render instance; move to
 * a shared store (e.g. Redis) before scaling the API horizontally.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  hit(key: string): { ok: boolean; retryAfterSeconds: number } {
    const t = this.now();
    let bucket = this.hits.get(key);
    if (!bucket || bucket.resetAt <= t) {
      bucket = { count: 0, resetAt: t + this.windowMs };
      this.hits.set(key, bucket);
      if (this.hits.size > 50_000) this.sweep(t);
    }
    bucket.count += 1;
    return { ok: bucket.count <= this.limit, retryAfterSeconds: Math.ceil((bucket.resetAt - t) / 1000) };
  }

  private sweep(t: number) {
    for (const [k, b] of this.hits) if (b.resetAt <= t) this.hits.delete(k);
  }
}

/** Client IP. Cloudflare and Render set these; the rightmost forwarded hop is the one our proxy saw. */
export function clientIp(c: Context): string {
  const direct = c.req.header("cf-connecting-ip") ?? c.req.header("true-client-ip");
  if (direct) return direct.trim();
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",").at(-1)!.trim();
  return "unknown";
}

export function rateLimit(limiter: RateLimiter, key: (c: Context) => string | Promise<string>): MiddlewareHandler {
  return async (c, next) => {
    const r = limiter.hit(await key(c));
    if (!r.ok) {
      c.header("Retry-After", String(r.retryAfterSeconds));
      return c.json<ApiError>({ error: "rate_limited", retryAfterSeconds: r.retryAfterSeconds }, 429);
    }
    await next();
  };
}
