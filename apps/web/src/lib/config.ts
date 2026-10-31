import type { Task } from "@stackz/shared";

const env = import.meta.env;

export const API_URL = (env.VITE_API_URL || "http://localhost:8787").replace(/\/$/, "");
/** Falls back to Cloudflare's always-pass test key so local development works. */
export const TURNSTILE_SITE_KEY = env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
export const X_HANDLE = (env.VITE_X_HANDLE || "").replace(/^@/, "");
export const PINNED_POST_ID = env.VITE_PINNED_POST_ID || "";
export const COMMUNITY_URL = env.VITE_COMMUNITY_URL || "";

export const X_PROFILE_URL = X_HANDLE ? `https://x.com/${X_HANDLE}` : "https://x.com";

/** Where GO sends people for each task. Falls back to the profile until the post exists. */
export function taskIntentUrl(task: Task): string {
  const post = encodeURIComponent(PINNED_POST_ID);
  switch (task) {
    case "follow":
      return X_HANDLE ? `https://x.com/intent/follow?screen_name=${encodeURIComponent(X_HANDLE)}` : X_PROFILE_URL;
    case "like":
      return PINNED_POST_ID ? `https://x.com/intent/like?tweet_id=${post}` : X_PROFILE_URL;
    case "comment":
      return PINNED_POST_ID ? `https://x.com/intent/tweet?in_reply_to=${post}` : X_PROFILE_URL;
    case "repost":
      return PINNED_POST_ID ? `https://x.com/intent/retweet?tweet_id=${post}` : X_PROFILE_URL;
  }
}

/** Same formulas as apps/api/src/routes/waitlist.ts. */
export const cardUrl = (handle: string) => `${API_URL}/card/${handle}.png`;
export const shareUrl = (handle: string) => `${API_URL}/s/${handle}`;
