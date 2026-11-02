import { createHash, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { handleSchema, type ApiError } from "@stackz/shared";
import type { AppEnv, Deps } from "../deps";
import { makeLimiter, rateLimit } from "../rate-limit";
import type { AdminEntry } from "../store";

const statusSchema = z.enum(["pending", "approved", "rejected"]);

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export interface AdminListResponse {
  entries: AdminEntry[];
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time compare (hashing first makes the lengths equal). */
function tokenMatches(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Review of waitlist entries: list them and set `status`. Handles are honour-based,
 * so this is how fakes are removed before Season 0.
 *
 * Only mounted when ADMIN_TOKEN is set. Callers send `Authorization: Bearer <ADMIN_TOKEN>`.
 * Used by `pnpm admin` (apps/api/scripts/admin.ts), never by the public site.
 */
export function adminRoutes(deps: Deps, token: string) {
  const { store } = deps;
  const perIp = makeLimiter(deps.limiter, "admin", 30, 60_000);
  const app = new Hono<AppEnv>();

  app.use(rateLimit(perIp, (c) => c.get("ip")));
  app.use(async (c, next) => {
    const auth = c.req.header("authorization") ?? "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!given || !tokenMatches(given, token)) return c.json<ApiError>({ error: "unauthorized" }, 401);
    c.header("Cache-Control", "no-store");
    await next();
  });

  app.get("/entries", async (c) => {
    const q = listQuerySchema.safeParse(c.req.query());
    if (!q.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
    return c.json<AdminListResponse>({ entries: await store.listEntries(q.data) });
  });

  app.post("/entries/:handle/status", async (c) => {
    const handle = handleSchema.safeParse(c.req.param("handle"));
    const body = z.object({ status: statusSchema }).safeParse(await c.req.json().catch(() => null));
    if (!handle.success || !body.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
    const entry = await store.setStatus(handle.data, body.data.status);
    if (!entry) return c.json<ApiError>({ error: "not_found" }, 404);
    return c.json<AdminEntry>(entry);
  });

  return app;
}
