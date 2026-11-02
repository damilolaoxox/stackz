import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { Deps } from "../src/deps";
import { createRedisLimiterFactory, RedisRateLimiter, type RedisPipeline } from "../src/redis-limiter";
import { createMemoryCardCache, createMemoryStore } from "../src/store";

/** A tiny in-memory stand-in for INCR / PEXPIRE NX / PTTL. */
function fakeRedis(clock: { now: number }) {
  const keys = new Map<string, { n: number; expiresAt: number | null }>();
  const live = (k: string) => {
    const v = keys.get(k);
    if (v && v.expiresAt !== null && v.expiresAt <= clock.now) keys.delete(k);
    return keys.get(k);
  };
  const seen: string[] = [];
  const pipeline: RedisPipeline = async (cmds) =>
    cmds.map(([cmd, k, arg]) => {
      const key = String(k);
      seen.push(key);
      const v = live(key);
      if (cmd === "INCR") {
        const next = { n: (v?.n ?? 0) + 1, expiresAt: v?.expiresAt ?? null };
        keys.set(key, next);
        return next.n;
      }
      if (cmd === "PEXPIRE") {
        if (!v || v.expiresAt !== null) return 0;
        v.expiresAt = clock.now + Number(arg);
        return 1;
      }
      if (cmd === "PTTL") return v?.expiresAt ? v.expiresAt - clock.now : -2;
      throw new Error(`unexpected ${cmd}`);
    });
  return { pipeline, seen };
}

describe("RedisRateLimiter", () => {
  it("blocks after the limit and resets after the window", async () => {
    const clock = { now: 0 };
    const { pipeline } = fakeRedis(clock);
    const rl = new RedisRateLimiter(pipeline, "t", 2, 1000, () => clock.now);
    expect((await rl.hit("a")).ok).toBe(true);
    expect((await rl.hit("a")).ok).toBe(true);
    const blocked = await rl.hit("a");
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect((await rl.hit("b")).ok).toBe(true);
    clock.now = 1000;
    expect((await rl.hit("a")).ok).toBe(true);
  });

  it("keeps each limiter's keys apart", async () => {
    const clock = { now: 0 };
    const { pipeline, seen } = fakeRedis(clock);
    const make = createRedisLimiterFactory(pipeline);
    await make("join", 1, 1000).hit("1.2.3.4");
    await make("card", 1, 1000).hit("1.2.3.4");
    expect(new Set(seen)).toEqual(new Set(["stackz:rl:join:1.2.3.4", "stackz:rl:card:1.2.3.4"]));
  });

  it("fails open when Redis is unavailable", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const rl = new RedisRateLimiter(
      async () => {
        throw new Error("down");
      },
      "t",
      1,
      1000,
    );
    expect((await rl.hit("a")).ok).toBe(true);
    expect((await rl.hit("a")).ok).toBe(true);
    expect(err).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });

  it("is used by the app when configured, and returns 429 from it", async () => {
    const clock = { now: 0 };
    const { pipeline, seen } = fakeRedis(clock);
    const deps: Deps = {
      env: {
        ALLOWED_ORIGINS: "https://stackz.test",
        SITE_URL: "https://stackz.test",
        PUBLIC_API_URL: "https://api.stackz.test",
        TASK_MIN_SECONDS: 8,
      },
      store: createMemoryStore(),
      cards: createMemoryCardCache(),
      verifyTurnstile: async () => true,
      lookupAvatar: async () => null,
      fetchAvatarImage: async () => null,
      renderCard: async () => new Uint8Array([0x89]),
      now: () => new Date(),
      limiter: createRedisLimiterFactory(pipeline),
    };
    const app = createApp(deps);
    const get = () => app.request("/x/avatar?handle=someone", { headers: { "cf-connecting-ip": "5.5.5.5" } });
    for (let i = 0; i < 30; i++) expect((await get()).status).toBe(200);
    const res = await get();
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(seen).toContain("stackz:rl:avatar:5.5.5.5");
  });
});
