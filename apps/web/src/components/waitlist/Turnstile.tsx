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
      "error-callback"?: () => void;
    },
  ): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Cloudflare Turnstile, rendered explicitly. Change `resetKey` to get a fresh token. */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let widgetId: string | null = null;
    let timer = 0;
    let cancelled = false;
    const mount = () => {
      if (cancelled || !ref.current) return;
      const ts = window.turnstile;
      if (!ts) {
        timer = window.setTimeout(mount, 200);
        return;
      }
      widgetId = ts.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
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
