import { describe, expect, it } from "vitest";
import { renderCard } from "../src/card";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

describe("renderCard", () => {
  it("renders a PNG with the block avatar fallback", async () => {
    const png = await renderCard({ handle: "stackz_player15", avatar: null });
    expect([...png.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(png.length).toBeGreaterThan(5000);
  }, 20_000);
});
