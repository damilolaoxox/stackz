import { Hono } from "hono";
import { joinRequestSchema, TASKS, type ApiError, type JoinResponse } from "@stackz/shared";
import type { AppEnv, Deps } from "../deps";
import { RateLimiter, rateLimit } from "../rate-limit";

export function cardUrl(apiUrl: string, handle: string) {
  return `${apiUrl.replace(/\/$/, "")}/card/${handle}.png`;
}

export function shareUrl(apiUrl: string, handle: string) {
  return `${apiUrl.replace(/\/$/, "")}/s/${handle}`;
}

export function waitlistRoutes(deps: Deps) {
  const { store, env } = deps;
  const perIp = new RateLimiter(10, 10 * 60_000);
  const app = new Hono<AppEnv>();

  app.post(
    "/",
    rateLimit(perIp, (c) => c.get("ip")),
    async (c) => {
      const parsed = joinRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
      const { handle, wallet, turnstileToken } = parsed.data;

      const respond = (status: JoinResponse["status"], code: 200 | 201) =>
        c.json<JoinResponse>(
          {
            handle,
            status,
            cardUrl: cardUrl(env.PUBLIC_API_URL, handle),
            shareUrl: shareUrl(env.PUBLIC_API_URL, handle),
          },
          code,
        );

      if (!(await deps.verifyTurnstile(turnstileToken, c.get("ip")))) {
        return c.json<ApiError>({ error: "turnstile_failed" }, 403);
      }

      const existing = await store.getEntry(handle);
      if (existing) {
        // Same person resubmitting is fine; anyone else gets "taken".
        return existing.wallet === wallet
          ? respond(existing.status, 200)
          : c.json<ApiError>({ error: "handle_taken" }, 409);
      }

      const rows = await store.getTaskRows(handle);
      const missing = TASKS.filter((t) => !rows.find((r) => r.task === t)?.done_at);
      if (missing.length) return c.json<ApiError>({ error: "tasks_incomplete", missing }, 409);

      const avatarUrl = await deps.lookupAvatar(handle);
      const result = await store.createEntry({
        x_handle: handle,
        x_avatar_url: avatarUrl,
        wallet,
        tasks: Object.fromEntries(rows.map((r) => [r.task, { go_at: r.go_at, done_at: r.done_at }])),
      });
      if (!result.ok)
        return c.json<ApiError>({ error: result.conflict === "wallet" ? "wallet_taken" : "handle_taken" }, 409);

      return respond(result.entry.status, 201);
    },
  );

  return app;
}
