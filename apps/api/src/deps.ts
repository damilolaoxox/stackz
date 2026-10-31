import type { Hono } from "hono";
import type { FetchAvatarImage, LookupAvatar } from "./avatar";
import type { RenderCard } from "./card";
import type { Env } from "./env";
import type { CardCache, Store } from "./store";
import type { VerifyTurnstile } from "./turnstile";

/** Everything the routes need, injected so tests can replace any of it. */
export interface Deps {
  env: Pick<Env, "ALLOWED_ORIGINS" | "SITE_URL" | "PUBLIC_API_URL" | "TASK_MIN_SECONDS">;
  store: Store;
  cards: CardCache;
  verifyTurnstile: VerifyTurnstile;
  lookupAvatar: LookupAvatar;
  fetchAvatarImage: FetchAvatarImage;
  renderCard: RenderCard;
  now: () => Date;
}

export type AppEnv = { Variables: { ip: string } };
export type App = Hono<AppEnv>;
