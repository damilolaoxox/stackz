import type { Task } from "@stackz/shared";

const env = import.meta.env;

export const API_URL = (env.VITE_API_URL || "http://localhost:8787").replace(/\/$/, "");
/** Falls back to Cloudflare's always-pass test key so local development works. */
export const TURNSTILE_SITE_KEY = env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
/** The Stackz X account. Public, so it has a default; the env var can override it. */
export const X_HANDLE = (env.VITE_X_HANDLE || "playstackz").replace(/^@/, "");
export const COMMUNITY_URL = env.VITE_COMMUNITY_URL || "";

export const X_PROFILE_URL = `https://x.com/${X_HANDLE}`;

/**
 * Where GO sends people. Follow uses X's one-click follow page; like, comment and repost
 * open the profile, where the pinned post sits on top. Nothing is checked through the
 * X API: CONFIRM counts once TASK_MIN_SECONDS have passed since GO (enforced by the API).
 */
export function taskIntentUrl(task: Task): string {
  return task === "follow" ? `https://x.com/intent/follow?screen_name=${encodeURIComponent(X_HANDLE)}` : X_PROFILE_URL;
}

/** Same formulas as apps/api/src/routes/waitlist.ts. */
export const cardUrl = (handle: string) => `${API_URL}/card/${handle}.png`;
export const shareUrl = (handle: string) => `${API_URL}/s/${handle}`;
