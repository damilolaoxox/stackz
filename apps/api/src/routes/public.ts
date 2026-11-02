import { Hono } from "hono";
import { handleSchema, type ApiError, type AvatarResponse } from "@stackz/shared";
import { toDataUri } from "../card";
import type { AppEnv, Deps } from "../deps";
import { makeLimiter, rateLimit } from "../rate-limit";
import { cardUrl } from "./waitlist";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** Avatar lookup, share card PNG and the share page X crawls for the link preview. */
export function publicRoutes(deps: Deps) {
  const { store, cards, env } = deps;
  const avatarLimit = makeLimiter(deps.limiter, "avatar", 30, 60_000);
  const cardLimit = makeLimiter(deps.limiter, "card", 60, 60_000);
  const app = new Hono<AppEnv>();

  app.get(
    "/x/avatar",
    rateLimit(avatarLimit, (c) => c.get("ip")),
    async (c) => {
      const handle = handleSchema.safeParse(c.req.query("handle") ?? "");
      if (!handle.success) return c.json<ApiError>({ error: "invalid_request" }, 400);
      c.header("Cache-Control", "public, max-age=3600");
      return c.json<AvatarResponse>({ url: await deps.lookupAvatar(handle.data) });
    },
  );

  app.get(
    "/card/:file",
    rateLimit(cardLimit, (c) => c.get("ip")),
    async (c) => {
      const file = c.req.param("file");
      const handle = handleSchema.safeParse(file.endsWith(".png") ? file.slice(0, -4) : "");
      if (!handle.success) return c.json<ApiError>({ error: "not_found" }, 404);

      let png = await cards.get(handle.data);
      if (!png) {
        const entry = await store.getEntry(handle.data);
        if (!entry) return c.json<ApiError>({ error: "not_found" }, 404);
        const image = entry.x_avatar_url ? await deps.fetchAvatarImage(entry.x_avatar_url) : null;
        png = await deps.renderCard({ handle: handle.data, avatar: image ? toDataUri(image) : null });
        // A failed cache write shouldn't fail the request; we'll render again next time.
        await cards.put(handle.data, png).catch((err) => console.error("card cache write failed", err));
      }

      return c.body(png as Uint8Array<ArrayBuffer>, 200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      });
    },
  );

  app.get("/s/:handle", async (c) => {
    const handle = handleSchema.safeParse(c.req.param("handle"));
    const entry = handle.success ? await store.getEntry(handle.data) : null;
    if (!handle.success || !entry) return c.redirect(env.SITE_URL, 302);

    const title = escapeHtml(`@${handle.data} is on the Stackz list`);
    const desc = "Real-time Tetris where the crowd puts tokens on every match. Season 0 is coming.";
    const image = escapeHtml(cardUrl(env.PUBLIC_API_URL, handle.data));
    const site = escapeHtml(env.SITE_URL);
    c.header("Cache-Control", "public, max-age=3600");
    return c.html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0; url=${site}">
</head><body><a href="${site}">Go to Stackz</a></body></html>`);
  });

  return app;
}
