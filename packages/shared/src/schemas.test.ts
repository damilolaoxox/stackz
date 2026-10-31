import { describe, expect, it } from "vitest";
import { handleSchema, joinRequestSchema, walletSchema } from "./schemas";

describe("handleSchema", () => {
  it("strips @ and lowercases", () => {
    expect(handleSchema.parse(" @Stackz_Game ")).toBe("stackz_game");
  });

  it.each(["", "@", "has space", "a".repeat(16), "dash-name", "émoji"])("rejects %j", (h) => {
    expect(handleSchema.safeParse(h).success).toBe(false);
  });
});

describe("walletSchema", () => {
  it("lowercases a valid EVM address", () => {
    expect(walletSchema.parse("0xABCDEF0123456789abcdef0123456789ABCDEF01")).toBe(
      "0xabcdef0123456789abcdef0123456789abcdef01",
    );
  });

  it.each(["0x123", "abcdef0123456789abcdef0123456789abcdef0123", "0xZZcdef0123456789abcdef0123456789abcdef01"])(
    "rejects %j",
    (w) => {
      expect(walletSchema.safeParse(w).success).toBe(false);
    },
  );
});

describe("joinRequestSchema", () => {
  it("requires a turnstile token", () => {
    const r = joinRequestSchema.safeParse({
      handle: "stackz",
      wallet: "0xabcdef0123456789abcdef0123456789abcdef01",
      turnstileToken: "",
    });
    expect(r.success).toBe(false);
  });
});
