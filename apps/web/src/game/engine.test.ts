import { describe, expect, it } from "vitest";
import { seeded } from "../lib/random";
import { bestPlacement, clearRows, collides, emptyGrid, TetrisEngine, type EngineEvent } from "./engine";
import { PIECE_TYPES, PIECES } from "./pieces";

describe("pieces", () => {
  it("has the right number of distinct rotations", () => {
    expect(PIECES.O.rots).toHaveLength(1);
    expect(PIECES.I.rots).toHaveLength(2);
    expect(PIECES.T.rots).toHaveLength(4);
  });
});

describe("clearRows", () => {
  it("removes full rows and drops the rest down", () => {
    const grid = emptyGrid(4, 3);
    grid[3] = ["a", "b", "c"];
    grid[2] = ["a", null, "c"];
    const { grid: after, cleared } = clearRows(grid);
    expect(cleared).toBe(1);
    expect(after).toHaveLength(4);
    expect(after[3]).toEqual(["a", null, "c"]);
    expect(after[0]).toEqual([null, null, null]);
  });
});

describe("collides", () => {
  it("detects walls, floor and blocks", () => {
    const grid = emptyGrid(4, 4);
    grid[3] = [null, "x", null, null];
    const cell = [[0, 0]] as const;
    expect(collides(grid, [...cell], -1, 0)).toBe(true);
    expect(collides(grid, [...cell], 0, 4)).toBe(true);
    expect(collides(grid, [...cell], 1, 3)).toBe(true);
    expect(collides(grid, [...cell], 0, 3)).toBe(false);
  });
});

describe("bestPlacement", () => {
  it("drops an I piece into the only gap to clear a line", () => {
    const grid = emptyGrid(6, 4);
    for (let r = 2; r < 6; r++) grid[r] = ["x", "x", null, "x"];
    const best = bestPlacement(grid, "I", 1, () => 0);
    expect(best).not.toBeNull();
    const cells = PIECES.I.rots[best!.r]!;
    expect(cells.every(([cx]) => best!.x + cx === 2)).toBe(true);
  });
});

describe("TetrisEngine", () => {
  it("draws every piece once per 7-bag", () => {
    const engine = new TetrisEngine({ rows: 18, skill: 1, prefill: false, random: seeded(1) });
    // The constructor already spawned one piece, so drain the rest of that first bag.
    for (let i = 0; i < 6; i++) engine.nextType();
    const drawn = Array.from({ length: 7 }, () => engine.nextType());
    expect(new Set(drawn).size).toBe(7);
    expect([...drawn].sort()).toEqual([...PIECE_TYPES].sort());
  });

  it("plays a long game: locks pieces, clears lines and stays in bounds", () => {
    const engine = new TetrisEngine({ rows: 18, skill: 1, random: seeded(42) });
    const events: EngineEvent[] = [];
    for (let i = 0; i < 4000; i++) events.push(...engine.tick());
    expect(events.filter((e) => e.type === "lock").length).toBeGreaterThan(50);
    expect(events.some((e) => e.type === "clear")).toBe(true);
    expect(engine.grid).toHaveLength(18);
    expect(engine.grid.every((row) => row.length === 10)).toBe(true);
  });

  it("tops out under garbage and restarts", () => {
    const engine = new TetrisEngine({ rows: 12, skill: 0, garbage: true, garbageEvery: 1, random: seeded(7) });
    const events: EngineEvent[] = [];
    for (let i = 0; i < 6000 && !events.some((e) => e.type === "topout"); i++) events.push(...engine.tick());
    expect(events.some((e) => e.type === "topout")).toBe(true);
    for (let i = 0; i < 20; i++) engine.tick();
    expect(engine.over).toBe(0);
    expect(engine.piece).not.toBeNull();
  });

  it("view() shows the active piece and its ghost", () => {
    const engine = new TetrisEngine({ rows: 18, skill: 1, prefill: false, random: seeded(3) });
    const cells = engine.view().flat();
    expect(cells.filter((c) => c.kind === "block")).toHaveLength(4);
    expect(cells.filter((c) => c.kind === "ghost").length).toBeGreaterThan(0);
  });
});
