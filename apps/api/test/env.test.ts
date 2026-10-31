import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env";

describe("loadEnv", () => {
  it("treats empty values as unset, like the blanks in .env.example", () => {
    const env = loadEnv({
      STORE: "memory",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      UNAVATAR_API_KEY: " ",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.UNAVATAR_API_KEY).toBeUndefined();
    expect(env.PORT).toBe(8787);
  });

  it("still requires Supabase credentials for STORE=supabase", () => {
    expect(() => loadEnv({ STORE: "supabase", SUPABASE_URL: "", TURNSTILE_SECRET_KEY: "x" })).toThrow(/SUPABASE_URL/);
  });

  it("refuses the memory store in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production", STORE: "memory", TURNSTILE_SECRET_KEY: "x" })).toThrow(/memory/);
  });
});
