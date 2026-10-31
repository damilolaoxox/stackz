import { palette } from "@stackz/shared";

export const PIECE_TYPES = ["I", "O", "T", "S", "Z", "L", "J"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];
export type Point = readonly [x: number, y: number];

const BASE: Record<PieceType, { color: string; cells: Point[] }> = {
  I: {
    color: palette.cream,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    color: palette.yellow,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  T: {
    color: palette.tomato,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  S: {
    color: palette.cobalt,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    color: palette.tomato,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    color: palette.yellow,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  J: {
    color: palette.cobalt,
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ],
  },
};

function normalize(cells: Point[]): Point[] {
  const minX = Math.min(...cells.map((p) => p[0]));
  const minY = Math.min(...cells.map((p) => p[1]));
  return cells.map(([x, y]) => [x - minX, y - minY] as const).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function rotations(cells: Point[]): Point[][] {
  const out: Point[][] = [];
  let cur = normalize(cells);
  for (let i = 0; i < 4; i++) {
    const key = JSON.stringify(cur);
    if (!out.some((r) => JSON.stringify(r) === key)) out.push(cur);
    cur = normalize(cur.map(([x, y]) => [y, -x] as const));
  }
  return out;
}

export interface PieceDef {
  color: string;
  rots: Point[][];
}

export const PIECES: Record<PieceType, PieceDef> = Object.fromEntries(
  PIECE_TYPES.map((t) => [t, { color: BASE[t].color, rots: rotations(BASE[t].cells) }]),
) as Record<PieceType, PieceDef>;

/** Raw (unrotated) cells, for decorative pieces such as the rain and the NEXT preview. */
export function pieceCells(type: PieceType): Point[] {
  return normalize(BASE[type].cells);
}

export function width(cells: Point[]): number {
  return Math.max(...cells.map((p) => p[0])) + 1;
}
