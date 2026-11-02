import { describe, expect, it } from "vitest";
import { TASKS, type ProgressResponse } from "@stackz/shared";
import { createApp } from "../src/app";
import type { Deps } from "../src/deps";
import type { AdminListResponse } from "../src/routes/admin";
import { createMemoryCardCache, createMemoryStore, type AdminEntry } from "../src/store";

const TOKEN = "t".repeat(40);
const WALLET_A = "0x" + "a".repeat(40);
const WALLET_B = "0x" + "b".repeat(40);

function setup(adminToken: string | null = TOKEN) {
  let clock = new Date("2026-10-31T12:00:00Z");
  const deps: Deps = {
    env: {
      ALLOWED_ORIGINS: "https://stackz.test",
      SITE_URL: "https://stackz.test",
      PUBLIC_API_URL: "https://api.stackz.test",
      TASK_MIN_SECONDS: 8,
      ADMIN_TOKEN: adminToken ?? undefined,
    },
    store: createMemoryStore(),
    cards: createMemoryCardCache(),
    verifyTurnstile: async () => true,
    lookupAvatar: async () => null,
    fetchAvatarImage: async () => null,
    renderCard: async () => new Uint8Array([0x89]),
    now: () => clock,
  };
  const app = createApp(deps);
  const req = (path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) =>
    app.request(path, {
      method: init.method ?? "GET",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "9.9.9.9",
        ...(init.token === null ? {} : { authorization: `Bearer ${init.token ?? TOKEN}` }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  async function join(handle: string, wallet: string) {
    for (const task of TASKS) await req("/tasks/go", { method: "POST", body: { handle, task }, token: null });
    clock = new Date(clock.getTime() + 10_000);
    for (const task of TASKS) await req("/tasks/confirm", { method: "POST", body: { handle, task }, token: null });
    const res = await req("/waitlist", { method: "POST", body: { handle, wallet, turnstileToken: "x" }, token: null });
    expect(res.status).toBe(201);
  }
  return { app, req, join };
}

describe("admin review", () => {
  it("does not exist when ADMIN_TOKEN is unset", async () => {
    const t = setup(null);
    expect((await t.req("/admin/entries")).status).toBe(404);
  });

  it("rejects a missing or wrong token", async () => {
    const t = setup();
    expect((await t.req("/admin/entries", { token: null })).status).toBe(401);
    expect((await t.req("/admin/entries", { token: "wrong" })).status).toBe(401);
    expect((await t.req("/admin/entries", { token: TOKEN + "x" })).status).toBe(401);
  });

  it("lists entries oldest first, with wallet and task times, filtered by status", async () => {
    const t = setup();
    await t.join("alice", WALLET_A);
    await t.join("bob", WALLET_B);

    const res = await t.req("/admin/entries?status=pending");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { entries } = (await res.json()) as AdminListResponse;
    expect(entries.map((e) => e.x_handle)).toEqual(["alice", "bob"]);
    expect(entries[0]!.wallet).toBe(WALLET_A);
    expect(Object.keys(entries[0]!.tasks).sort()).toEqual([...TASKS].sort());

    const none = (await (await t.req("/admin/entries?status=approved")).json()) as AdminListResponse;
    expect(none.entries).toEqual([]);
    const paged = (await (await t.req("/admin/entries?limit=1&offset=1")).json()) as AdminListResponse;
    expect(paged.entries.map((e) => e.x_handle)).toEqual(["bob"]);
  });

  it("approves and rejects, and the public progress reflects it", async () => {
    const t = setup();
    await t.join("alice", WALLET_A);

    const res = await t.req("/admin/entries/@Alice/status", { method: "POST", body: { status: "rejected" } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as AdminEntry).status).toBe("rejected");

    const progress = (await (await t.req("/tasks/alice", { token: null })).json()) as ProgressResponse;
    expect(progress.status).toBe("rejected");
    // Public responses never carry the wallet or task log of an entry.
    expect(JSON.stringify(progress)).not.toContain(WALLET_A);
  });

  it("rejects bad input and unknown handles", async () => {
    const t = setup();
    expect((await t.req("/admin/entries?status=banned")).status).toBe(400);
    expect((await t.req("/admin/entries?limit=0")).status).toBe(400);
    expect((await t.req("/admin/entries/alice/status", { method: "POST", body: { status: "vip" } })).status).toBe(400);
    expect((await t.req("/admin/entries/nobody/status", { method: "POST", body: { status: "approved" } })).status).toBe(
      404,
    );
  });
});
