import { z } from "zod";
import { TASK_MIN_SECONDS_DEFAULT } from "@stackz/shared";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().default(8787),
    /** Comma-separated list of origins allowed by CORS, e.g. the waitlist site. */
    ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
    /** Public URL of the waitlist site; share links redirect here. */
    SITE_URL: z.url().default("http://localhost:5173"),
    /** Public URL of this API; used for absolute card and share links. */
    PUBLIC_API_URL: z.url().default("http://localhost:8787"),
    TASK_MIN_SECONDS: z.coerce.number().int().min(0).default(TASK_MIN_SECONDS_DEFAULT),
    /** "memory" is for local development only and is refused in production. */
    STORE: z.enum(["supabase", "memory"]).default("supabase"),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_CARDS_BUCKET: z.string().default("cards"),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    /** Optional unavatar.io Pro key; the free tier is rate-limited per IP. */
    UNAVATAR_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORE === "supabase" && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
      ctx.addIssue({
        code: "custom",
        message: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORE=supabase",
      });
    }
    if (env.NODE_ENV === "production" && env.STORE === "memory") {
      ctx.addIssue({ code: "custom", message: "STORE=memory is not allowed in production" });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // An empty value (e.g. "SUPABASE_URL=" in .env) means unset, not "".
  const present = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ""));
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
