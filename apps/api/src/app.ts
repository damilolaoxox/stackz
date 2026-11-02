import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { ApiError } from "@stackz/shared";
import type { AppEnv, Deps } from "./deps";
import { allowedOrigins, type Env } from "./env";
import { clientIp, makeLimiter, rateLimit } from "./rate-limit";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import { tasksRoutes } from "./routes/tasks";
import { waitlistRoutes } from "./routes/waitlist";

export function createApp(deps: Deps, opts: { log?: boolean } = {}) {
  const app = new Hono<AppEnv>();
  const globalLimit = makeLimiter(deps.limiter, "global", 120, 60_000);

  if (opts.log) app.use(logger());
  // Cards are embedded cross-origin (site, X previews), so don't lock resources to same-origin.
  app.use(secureHeaders({ crossOriginResourcePolicy: "cross-origin" }));
  app.use(cors({ origin: allowedOrigins(deps.env as Env), allowMethods: ["GET", "POST"], maxAge: 600 }));
  app.use(async (c, next) => {
    c.set("ip", clientIp(c));
    await next();
  });

  app.get("/healthz", (c) => c.json({ ok: true }));

  app.use(rateLimit(globalLimit, (c) => c.get("ip")));
  app.use(bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.json<ApiError>({ error: "invalid_request" }, 413) }));

  app.route("/tasks", tasksRoutes(deps));
  app.route("/waitlist", waitlistRoutes(deps));
  // Without a token the admin routes don't exist at all (plain 404).
  if (deps.env.ADMIN_TOKEN) app.route("/admin", adminRoutes(deps, deps.env.ADMIN_TOKEN));
  app.route("/", publicRoutes(deps));

  app.notFound((c) => c.json<ApiError>({ error: "not_found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json<ApiError>({ error: "internal" }, 500);
  });

  return app;
}
