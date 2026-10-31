import { beforeEach, describe, expect, it } from "vitest";
import { TASKS, type ApiError, type JoinResponse, type ProgressResponse, type TaskResponse } from "@stackz/shared";
import { createApp } from "../src/app";
import type { Deps } from "../src/deps";
import { createMemoryCardCache, createMemoryStore } from "../src/store";
import { RateLimiter } from "../src/rate-limit";

const WALLET = "0xAbCdEf0123456789abcdef0123456789abcdef01";
const ORIGIN = "https://stackz.test";

function setup(overrides: Partial<Deps> = {}) {
  let clock = new Date("2026-10-31T12:00:00Z");
  const renders: string[] = [];
  const deps: Deps = {
    env: { ALLOWED_ORIGINS: ORIGIN, SITE_URL: ORIGIN, PUBLIC_API_URL: "https://api.stackz.test", TASK_MIN_SECONDS: 8 },
    store: createMemoryStore(),
    cards: createMemoryCardCache(),
    verifyTurnstile: async (token) => token === "ok",
    lookupAvatar: async () => "https://unavatar.io/x/someone?fallback=false",
    fetchAvatarImage: async () => null,
    renderCard: async ({ handle }) => {
      renders.push(handle);
      return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    },
    now: () => clock,
    ...overrides,
  };
  const app = createApp(deps);
  const post = (path: string, body: unknown) =>
    app.request(path, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
      body: JSON.stringify(body),
    });
  const tick = (seconds: number) => {
    clock = new Date(clock.getTime() + seconds * 1000);
  };
  async function completeAll(handle: string) {
    for (const task of TASKS) await post("/tasks/go", { handle, task });
    tick(8);
    for (const task of TASKS) await post("/tasks/confirm", { handle, task });
  }
  return { app, deps, post, tick, completeAll, renders };
}

describe("tasks", () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it("starts every task idle", async () => {
    const res = await t.app.request("/tasks/@Player_One");
    const body = (await res.json()) as ProgressResponse;
    expect(body.handle).toBe("player_one");
    expect(Object.values(body.tasks).map((s) => s.state)).toEqual(["idle", "idle", "idle", "idle"]);
    expect(body.joined).toBe(false);
    expect(body.taskMinSeconds).toBe(8);
  });

  it("GO moves a task to charging", async () => {
    const res = await t.post("/tasks/go", { handle: "player", task: "like" });
    expect(((await res.json()) as TaskResponse).state).toBe("charging");
  });

  it("refuses CONFIRM before GO", async () => {
    const res = await t.post("/tasks/confirm", { handle: "player", task: "like" });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ApiError).error).toBe("not_started");
  });

  it("refuses CONFIRM before TASK_MIN_SECONDS and reports the wait", async () => {
    await t.post("/tasks/go", { handle: "player", task: "follow" });
    t.tick(5);
    const res = await t.post("/tasks/confirm", { handle: "player", task: "follow" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "too_early", retryAfterSeconds: 3 });
  });

  it("accepts CONFIRM once enough time has passed", async () => {
    await t.post("/tasks/go", { handle: "player", task: "follow" });
    t.tick(8);
    const res = await t.post("/tasks/confirm", { handle: "player", task: "follow" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as TaskResponse).state).toBe("done");
  });

  it("a second GO does not reset the timer", async () => {
    await t.post("/tasks/go", { handle: "player", task: "repost" });
    t.tick(6);
    await t.post("/tasks/go", { handle: "player", task: "repost" });
    t.tick(2);
    const res = await t.post("/tasks/confirm", { handle: "player", task: "repost" });
    expect(res.status).toBe(200);
  });

  it("rejects bad input", async () => {
    expect((await t.post("/tasks/go", { handle: "bad handle!", task: "like" })).status).toBe(400);
    expect((await t.post("/tasks/go", { handle: "player", task: "tip" })).status).toBe(400);
  });
});

describe("POST /waitlist", () => {
  it("joins once all four tasks are done, without exposing a spot number", async () => {
    const t = setup();
    await t.completeAll("player");
    const res = await t.post("/waitlist", { handle: "@Player", wallet: WALLET, turnstileToken: "ok" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as JoinResponse;
    expect(body).toEqual({
      handle: "player",
      status: "pending",
      cardUrl: "https://api.stackz.test/card/player.png",
      shareUrl: "https://api.stackz.test/s/player",
    });
    const entry = await t.deps.store.getEntry("player");
    expect(entry?.wallet).toBe(WALLET.toLowerCase());
  });

  it("lists missing tasks", async () => {
    const t = setup();
    await t.post("/tasks/go", { handle: "player", task: "follow" });
    t.tick(8);
    await t.post("/tasks/confirm", { handle: "player", task: "follow" });
    const res = await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "tasks_incomplete", missing: ["like", "comment", "repost"] });
  });

  it("rejects a failed Turnstile check", async () => {
    const t = setup();
    await t.completeAll("player");
    const res = await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "nope" });
    expect(res.status).toBe(403);
  });

  it("is idempotent for the same handle and wallet, and blocks a different wallet", async () => {
    const t = setup();
    await t.completeAll("player");
    await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" });
    expect((await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" })).status).toBe(200);
    const other = await t.post("/waitlist", {
      handle: "player",
      wallet: "0x1111111111111111111111111111111111111111",
      turnstileToken: "ok",
    });
    expect(other.status).toBe(409);
    expect(((await other.json()) as ApiError).error).toBe("handle_taken");
  });

  it("blocks a wallet already used by another handle", async () => {
    const t = setup();
    await t.completeAll("first");
    await t.completeAll("second");
    await t.post("/waitlist", { handle: "first", wallet: WALLET, turnstileToken: "ok" });
    const res = await t.post("/waitlist", { handle: "second", wallet: WALLET, turnstileToken: "ok" });
    expect(((await res.json()) as ApiError).error).toBe("wallet_taken");
  });

  it("still joins when the avatar lookup finds nothing", async () => {
    const t = setup({ lookupAvatar: async () => null });
    await t.completeAll("player");
    const res = await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" });
    expect(res.status).toBe(201);
  });
});

describe("cards and share page", () => {
  it("404s for handles not on the list", async () => {
    const t = setup();
    expect((await t.app.request("/card/nobody.png")).status).toBe(404);
  });

  it("renders once, then serves from the cache", async () => {
    const t = setup();
    await t.completeAll("player");
    await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" });
    const a = await t.app.request("/card/player.png");
    const b = await t.app.request("/card/player.png");
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toBe("image/png");
    expect(b.status).toBe(200);
    expect(t.renders).toEqual(["player"]);
  });

  it("share page carries the card as the X preview image", async () => {
    const t = setup();
    await t.completeAll("player");
    await t.post("/waitlist", { handle: "player", wallet: WALLET, turnstileToken: "ok" });
    const html = await (await t.app.request("/s/player")).text();
    expect(html).toContain('content="https://api.stackz.test/card/player.png"');
    expect(html).toContain("summary_large_image");
  });

  it("share page redirects for unknown handles", async () => {
    const t = setup();
    const res = await t.app.request("/s/nobody");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(ORIGIN);
  });
});

describe("cors", () => {
  it("allows only the configured origin", async () => {
    const t = setup();
    const ok = await t.app.request("/healthz", { headers: { origin: ORIGIN } });
    const bad = await t.app.request("/healthz", { headers: { origin: "https://evil.test" } });
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(bad.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("RateLimiter", () => {
  it("blocks after the limit and resets after the window", () => {
    let now = 0;
    const rl = new RateLimiter(2, 1000, () => now);
    expect(rl.hit("a").ok).toBe(true);
    expect(rl.hit("a").ok).toBe(true);
    expect(rl.hit("a").ok).toBe(false);
    expect(rl.hit("b").ok).toBe(true);
    now = 1000;
    expect(rl.hit("a").ok).toBe(true);
  });
});
