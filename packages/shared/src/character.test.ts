import { describe, expect, it } from "vitest";
import { palette } from "./brand";
import { characterCells, HEADS, traitsForHandle } from "./character";

describe("traitsForHandle", () => {
  it("is stable for the same handle", () => {
    expect(traitsForHandle("stackz_player")).toEqual(traitsForHandle("stackz_player"));
  });

  it("never puts the head on a background of the same colour", () => {
    for (const h of ["a", "bb", "player_one", "stackz", "zz_top", "x9", "longest_handle1"]) {
      const t = traitsForHandle(h);
      expect(t.bg).not.toBe(HEADS[t.head][0]);
    }
  });
});

describe("characterCells", () => {
  it("draws a 16×16 grid with the head colour in it", () => {
    const t = traitsForHandle("stackz");
    const cells = characterCells(t);
    expect(cells).toHaveLength(16);
    expect(cells.every((r) => r.length === 16)).toBe(true);
    expect(cells.flat()).toContain(HEADS[t.head][0]);
    expect(cells.flat()).toContain(palette.ground);
  });
});
