import { afterEach, describe, expect, it, vi } from "vitest";
import { createAvatarLookup, unavatarUrl } from "../src/avatar";

function respond(status: number, type = "image/jpeg") {
  return new Response(status === 200 ? "img" : null, { status, headers: { "content-type": type } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAvatarLookup", () => {
  it("returns and caches a found avatar", async () => {
    const fetchMock = vi.fn(async () => respond(200));
    vi.stubGlobal("fetch", fetchMock);
    const lookup = createAvatarLookup();
    expect(await lookup("github")).toBe(unavatarUrl("github"));
    expect(await lookup("github")).toBe(unavatarUrl("github"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches a definite 404 as no avatar", async () => {
    const fetchMock = vi.fn(async () => respond(404, "application/json"));
    vi.stubGlobal("fetch", fetchMock);
    const lookup = createAvatarLookup();
    expect(await lookup("nobody")).toBeNull();
    expect(await lookup("nobody")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a timeout", () => Promise.reject(new DOMException("timed out", "TimeoutError"))],
    ["a 429", async () => respond(429, "application/json")],
    ["a 503", async () => respond(503, "text/html")],
  ])("does not cache %s, so the next lookup retries", async (_name, first) => {
    const fetchMock = vi
      .fn(first)
      .mockImplementationOnce(first)
      .mockImplementation(async () => respond(200));
    vi.stubGlobal("fetch", fetchMock);
    const lookup = createAvatarLookup();
    expect(await lookup("github")).toBeNull();
    expect(await lookup("github")).toBe(unavatarUrl("github"));
  });
});
