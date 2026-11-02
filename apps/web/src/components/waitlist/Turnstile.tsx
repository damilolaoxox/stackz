import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "../../lib/config";

interface TurnstileApi {
  render(
    el: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      /** Returning true tells Turnstile the error was handled. */
      "error-callback"?: (code: string) => boolean | void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare's always-pass test site keys start with this. They are only used locally
 * (production sets a real key), and the matching test secret accepts any token.
 */
const IS_TEST_KEY = TURNSTILE_SITE_KEY.startsWith("1x0000000000000000000");
/** Cloudflare's documented dummy token; only a test secret accepts it, a real secret rejects it. */
const TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const MAX_RETRIES = 2;
const SCRIPT_WAIT_MS = 8000;

/** Cloudflare Turnstile, rendered explicitly. Change `resetKey` to get a fresh token. */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let widgetId: string | null = null;
    let timer = 0;
    let cancelled = false;
    let retries = 0;
    const started = Date.now();

    // Widget errors are often caused by browser extensions. Locally that shouldn't block
    // testing the join flow, so fall back to the dummy token the test secret accepts.
    const localFallback = () => {
      if (!IS_TEST_KEY) return false;
      onTokenRef.current(TEST_TOKEN);
      return true;
    };

    const mount = () => {
      if (cancelled || !ref.current) return;
      const ts = window.turnstile;
      if (!ts) {
        if (Date.now() - started > SCRIPT_WAIT_MS && localFallback()) return;
        timer = window.setTimeout(mount, 200);
        return;
      }
      widgetId = ts.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => {
          onTokenRef.current(null);
          if (localFallback()) return true;
          if (retries < MAX_RETRIES && widgetId) {
            retries++;
            const id = widgetId;
            timer = window.setTimeout(() => !cancelled && window.turnstile?.reset(id), 1500);
          }
          return true;
        },
      });
    };
    mount();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey]);

  return <div ref={ref} className="turnstile" />;
}
