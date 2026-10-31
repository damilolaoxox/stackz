const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 6000;

export type LookupAvatar = (handle: string) => Promise<string | null>;
export type FetchAvatarImage = (url: string) => Promise<{ data: Uint8Array; type: string } | null>;

/** unavatar.io URL that 404s instead of returning a generic picture when the handle has none. */
export function unavatarUrl(handle: string): string {
  return `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`;
}

function headers(apiKey?: string): Record<string, string> {
  return apiKey ? { "x-api-key": apiKey } : {};
}

/**
 * Cached lookup. Never throws: any failure means "no avatar", and the UI shows the block avatar.
 * Only a definite answer is cached. A timeout, 429 or 5xx is retried on the next lookup, so a
 * slow moment at unavatar.io doesn't hide someone's picture for an hour.
 */
export function createAvatarLookup(apiKey?: string, now: () => number = Date.now): LookupAvatar {
  const cache = new Map<string, { url: string | null; expires: number }>();
  const inflight = new Map<string, Promise<string | null>>();

  async function fetchUrl(handle: string): Promise<{ url: string | null; definite: boolean }> {
    const url = unavatarUrl(handle);
    try {
      const res = await fetch(url, { headers: headers(apiKey), signal: AbortSignal.timeout(TIMEOUT_MS) });
      await res.body?.cancel();
      if (res.ok && res.headers.get("content-type")?.startsWith("image/")) return { url, definite: true };
      return { url: null, definite: res.status === 404 };
    } catch {
      return { url: null, definite: false };
    }
  }

  return async (handle) => {
    const cached = cache.get(handle);
    if (cached && cached.expires > now()) return cached.url;
    let p = inflight.get(handle);
    if (!p) {
      p = fetchUrl(handle).then(({ url, definite }) => {
        if (definite) cache.set(handle, { url, expires: now() + (url ? HIT_TTL_MS : MISS_TTL_MS) });
        inflight.delete(handle);
        return url;
      });
      inflight.set(handle, p);
    }
    return p;
  };
}

/** Downloads avatar bytes for the share card. Only PNG and JPEG, which the renderer supports. */
export function createAvatarImageFetcher(apiKey?: string): FetchAvatarImage {
  return async (url) => {
    try {
      const res = await fetch(url, { headers: headers(apiKey), signal: AbortSignal.timeout(TIMEOUT_MS) });
      const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
      if (!res.ok || !["image/png", "image/jpeg"].includes(type)) {
        await res.body?.cancel();
        return null;
      }
      return { data: new Uint8Array(await res.arrayBuffer()), type };
    } catch {
      return null;
    }
  };
}
