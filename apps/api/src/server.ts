import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createAvatarImageFetcher, createAvatarLookup } from "./avatar";
import { renderCard } from "./card";
import { loadEnv } from "./env";
import { createMemoryCardCache, createMemoryStore } from "./store";
import { createSupabaseCardCache, createSupabaseClient, createSupabaseStore } from "./store-supabase";
import { createTurnstileVerifier } from "./turnstile";

const env = loadEnv();

let store, cards;
if (env.STORE === "supabase") {
  const db = createSupabaseClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  store = createSupabaseStore(db);
  cards = createSupabaseCardCache(db, env.SUPABASE_CARDS_BUCKET);
} else {
  console.warn("STORE=memory: data is lost on restart. Local development only.");
  store = createMemoryStore();
  cards = createMemoryCardCache();
}

const app = createApp(
  {
    env,
    store,
    cards,
    verifyTurnstile: createTurnstileVerifier(env.TURNSTILE_SECRET_KEY),
    lookupAvatar: createAvatarLookup(env.UNAVATAR_API_KEY),
    fetchAvatarImage: createAvatarImageFetcher(env.UNAVATAR_API_KEY),
    renderCard,
    now: () => new Date(),
  },
  { log: true },
);

// The returned http.Server is where the real-time game server's WebSocket
// upgrade handler will attach later, beside these HTTP routes.
const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`stackz api listening on :${info.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
