import { palette } from "@stackz/shared";
import { PIECE_TYPES, PIECES, width, type PieceType, type Point } from "./pieces";

export type Cell = string | null;
export type Grid = Cell[][];

export interface EngineOptions {
  rows: number;
  cols?: number;
  /** 0 plays sloppily, 1 plays the best placement every time. */
  skill: number;
  /** Push a grey garbage row in from below every `garbageEvery` locks. */
  garbage?: boolean;
  garbageEvery?: number;
  /** Start with a few half-filled rows so the board never opens empty. */
  prefill?: boolean;
  random?: () => number;
}

export interface ActivePiece {
  type: PieceType;
  r: number;
  x: number;
  y: number;
}

export interface Placement {
  r: number;
  x: number;
  score: number;
}

export type EngineEvent = { type: "lock" } | { type: "clear"; lines: number } | { type: "topout" };

export type ViewKind = "empty" | "block" | "ghost" | "flash" | "dead";
export interface ViewCell {
  kind: ViewKind;
  color: string | null;
}

const FLASH_TICKS = 4;
const TOPOUT_TICKS = 14;
const PREFILL_COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.cream];

export function emptyGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array<Cell>(cols).fill(null));
}

/** Removes full rows and returns the new grid plus how many rows were cleared. */
export function clearRows(grid: Grid): { grid: Grid; cleared: number } {
  const cols = grid[0]?.length ?? 0;
  const kept = grid.filter((row) => !row.every(Boolean));
  const cleared = grid.length - kept.length;
  while (kept.length < grid.length) kept.unshift(Array<Cell>(cols).fill(null));
  return { grid: kept, cleared };
}

export function collides(grid: Grid, cells: Point[], x: number, y: number): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (const [cx, cy] of cells) {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= cols || gy >= rows) return true;
    if (gy >= 0 && grid[gy]?.[gx]) return true;
  }
  return false;
}

/** Scores a finished board the classic way: low, flat, few holes, many lines. */
function scoreGrid(grid: Grid, lines: number): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const heights: number[] = [];
  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let h = 0;
    let seen = false;
    for (let r = 0; r < rows; r++) {
      if (grid[r]?.[c]) {
        if (!seen) {
          h = rows - r;
          seen = true;
        }
      } else if (seen) holes++;
    }
    heights.push(h);
  }
  const aggregate = heights.reduce((a, b) => a + b, 0);
  let bumpiness = 0;
  for (let c = 0; c < cols - 1; c++) bumpiness += Math.abs((heights[c] ?? 0) - (heights[c + 1] ?? 0));
  return -0.51 * aggregate + 0.76 * lines - 0.36 * holes - 0.18 * bumpiness;
}

export function bestPlacement(grid: Grid, type: PieceType, skill: number, random: () => number): Placement | null {
  const cols = grid[0]?.length ?? 0;
  let best: Placement | null = null;
  PIECES[type].rots.forEach((cells, r) => {
    for (let x = 0; x <= cols - width(cells); x++) {
      if (collides(grid, cells, x, 0)) continue;
      let y = 0;
      while (!collides(grid, cells, x, y + 1)) y++;
      const next = grid.map((row) => row.slice());
      for (const [cx, cy] of cells) {
        const row = next[y + cy];
        if (row) row[x + cx] = "x";
      }
      const { grid: after, cleared } = clearRows(next);
      const score = scoreGrid(after, cleared) + random() * (1 - skill) * 3;
      if (!best || score > best.score) best = { r, x, score };
    }
  });
  return best;
}

/**
 * A self-playing Tetris board. Call tick() once per game tick; it returns what happened.
 * Pieces rotate into place, slide one column per tick, then drop one row per tick.
 */
export class TetrisEngine {
  readonly rows: number;
  readonly cols: number;
  grid: Grid;
  piece: ActivePiece | null = null;
  lines = 0;
  /** Rows currently flashing before they clear. */
  flash: { rows: number[]; ticks: number } | null = null;
  /** Ticks left in the topped-out pause before the board restarts. */
  over = 0;

  private target: Placement | null = null;
  private bag: PieceType[] = [];
  private locks = 0;
  private readonly opts: Required<Omit<EngineOptions, "cols">>;

  constructor(options: EngineOptions) {
    this.rows = options.rows;
    this.cols = options.cols ?? 10;
    this.opts = {
      rows: options.rows,
      skill: options.skill,
      garbage: options.garbage ?? false,
      garbageEvery: options.garbageEvery ?? 5,
      prefill: options.prefill ?? true,
      random: options.random ?? Math.random,
    };
    this.grid = emptyGrid(this.rows, this.cols);
    this.reset();
  }

  reset() {
    const rnd = this.opts.random;
    this.grid = emptyGrid(this.rows, this.cols);
    if (this.opts.prefill) {
      for (let r = this.rows - 1; r >= this.rows - 3; r--) {
        const hole = Math.floor(rnd() * this.cols);
        const row = this.grid[r];
        if (!row) continue;
        for (let c = 0; c < this.cols; c++) {
          if (c !== hole && rnd() < 0.82) row[c] = PREFILL_COLORS[Math.floor(rnd() * PREFILL_COLORS.length)] ?? null;
        }
      }
    }
    this.lines = 0;
    this.flash = null;
    this.over = 0;
    this.locks = 0;
    this.bag = [];
    this.spawn();
  }

  /** 7-bag randomiser: every piece once per bag, in a shuffled order. */
  nextType(): PieceType {
    if (!this.bag.length) {
      const bag = [...PIECE_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.opts.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j] as PieceType, bag[i] as PieceType];
      }
      this.bag = bag;
    }
    return this.bag.pop() as PieceType;
  }

  private spawn(): EngineEvent[] {
    const type = this.nextType();
    const cells = PIECES[type].rots[0] as Point[];
    const piece: ActivePiece = { type, r: 0, x: Math.floor((this.cols - width(cells)) / 2), y: 0 };
    if (collides(this.grid, cells, piece.x, piece.y)) {
      this.piece = null;
      this.target = null;
      this.over = TOPOUT_TICKS;
      return [{ type: "topout" }];
    }
    this.piece = piece;
    this.target = bestPlacement(this.grid, type, this.opts.skill, this.opts.random) ?? { r: 0, x: piece.x, score: 0 };
    return [];
  }

  private lock(): EngineEvent[] {
    const p = this.piece;
    if (!p) return [];
    const def = PIECES[p.type];
    for (const [cx, cy] of def.rots[p.r] ?? []) {
      const row = this.grid[p.y + cy];
      if (row) row[p.x + cx] = def.color;
    }
    this.piece = null;
    this.locks++;
    const events: EngineEvent[] = [{ type: "lock" }];

    if (this.opts.garbage && this.locks % this.opts.garbageEvery === 0) {
      const hole = Math.floor(this.opts.random() * this.cols);
      this.grid.shift();
      this.grid.push(Array.from({ length: this.cols }, (_, c) => (c === hole ? null : palette.garbage)));
    }

    const full: number[] = [];
    this.grid.forEach((row, i) => {
      if (row.every(Boolean)) full.push(i);
    });
    if (full.length) {
      this.flash = { rows: full, ticks: FLASH_TICKS };
      events.push({ type: "clear", lines: full.length });
    } else {
      events.push(...this.spawn());
    }
    return events;
  }

  tick(): EngineEvent[] {
    if (this.over > 0) {
      this.over--;
      if (this.over === 0) this.reset();
      return [];
    }
    if (this.flash) {
      this.flash.ticks--;
      if (this.flash.ticks <= 0) {
        const { grid, cleared } = clearRows(this.grid);
        this.grid = grid;
        this.lines += cleared;
        this.flash = null;
        return this.spawn();
      }
      return [];
    }

    const p = this.piece;
    if (!p) return this.spawn();
    const rots = PIECES[p.type].rots;
    const t = this.target ?? { r: p.r, x: p.x, score: 0 };
    const cur = rots[p.r] as Point[];
    const want = rots[t.r] as Point[];

    if (p.r !== t.r && !collides(this.grid, want, p.x, p.y)) {
      p.r = t.r;
    } else if (p.x !== t.x && p.r === t.r) {
      const nx = p.x + Math.sign(t.x - p.x);
      if (!collides(this.grid, cur, nx, p.y)) p.x = nx;
      else if (!collides(this.grid, cur, p.x, p.y + 1)) p.y++;
      else return this.lock();
    } else if (!collides(this.grid, cur, p.x, p.y + 1)) {
      p.y++;
    } else {
      return this.lock();
    }
    return [];
  }

  /** Row the active piece would land on, for the ghost. */
  ghostY(): number | null {
    const p = this.piece;
    if (!p) return null;
    const cells = PIECES[p.type].rots[p.r] as Point[];
    let y = p.y;
    while (!collides(this.grid, cells, p.x, y + 1)) y++;
    return y;
  }

  /** Everything the board should draw this frame. */
  view(): ViewCell[][] {
    const view: ViewCell[][] = this.grid.map((row) =>
      row.map((c) => (c ? { kind: "block" as const, color: c } : { kind: "empty" as const, color: null })),
    );
    const set = (y: number, x: number, cell: ViewCell) => {
      const row = view[y];
      if (row && x >= 0 && x < row.length) row[x] = cell;
    };
    const p = this.piece;
    if (p) {
      const def = PIECES[p.type];
      const cells = def.rots[p.r] as Point[];
      const gy = this.ghostY();
      if (gy !== null) {
        for (const [cx, cy] of cells) {
          if (view[gy + cy]?.[p.x + cx]?.kind === "empty") set(gy + cy, p.x + cx, { kind: "ghost", color: def.color });
        }
      }
      for (const [cx, cy] of cells) {
        if (p.y + cy >= 0) set(p.y + cy, p.x + cx, { kind: "block", color: def.color });
      }
    }
    if (this.flash && this.flash.ticks % 2 === 0) {
      for (const r of this.flash.rows) view[r] = view[r]?.map(() => ({ kind: "flash" as const, color: null })) ?? [];
    }
    if (this.over > 0) {
      for (const row of view) {
        row.forEach((c, i) => {
          if (c.kind === "block") row[i] = { kind: "dead", color: palette.garbage };
        });
      }
    }
    return view;
  }
}
