/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the Hono API on Render, e.g. https://api.stackz.xyz */
  readonly VITE_API_URL?: string;
  /** Cloudflare Turnstile site key (public). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** The Stackz X account, without "@". */
  readonly VITE_X_HANDLE?: string;
  /** ID of the pinned post that the like, comment and repost tasks point at. */
  readonly VITE_PINNED_POST_ID?: string;
  /** Optional community link for the footer. */
  readonly VITE_COMMUNITY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
