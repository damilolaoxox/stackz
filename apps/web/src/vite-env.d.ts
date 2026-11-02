/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the Hono API on Render, e.g. https://api.stackz.xyz */
  readonly VITE_API_URL?: string;
  /** Cloudflare Turnstile site key (public). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Overrides the Stackz X account (default "playstackz"), without "@". */
  readonly VITE_X_HANDLE?: string;
  /** Optional community link for the footer. */
  readonly VITE_COMMUNITY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
