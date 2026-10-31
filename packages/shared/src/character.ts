import { palette } from "./brand";

export type Head = "cream" | "yellow" | "blue" | "tomato" | "mint";
export type Eyes = "shades" | "stare" | "visor" | "sleepy";
export type Mouth = "grin" | "flat" | "gold";
export type Headwear = "tpiece" | "crown" | "cap" | "none";

export interface Traits {
  bg: string;
  head: Head;
  eyes: Eyes;
  mouth: Mouth;
  headwear: Headwear;
  hat: string;
  shirt: string;
}

export const HEADS: Record<Head, readonly [face: string, shade: string]> = {
  cream: [palette.cream, "#C9BEA6"],
  yellow: [palette.yellow, "#C99A16"],
  blue: [palette.cobalt, "#2A4DB0"],
  tomato: [palette.tomato, "#B83A24"],
  mint: [palette.mint, "#358A57"],
};

const EYES: Record<Eyes, [string, string]> = {
  shades: ["...SSWSSSSWSD...", "...HSSSHHSSSD..."],
  stare: ["...HBWHHHBWHD...", "...HBBHHHBBHD..."],
  visor: ["...VVVVVVVVVD...", "...VVVVVVVVVD..."],
  sleepy: ["...HHHHHHHHHD...", "...HBBBHHBBBD..."],
};

const MOUTHS: Record<Mouth, [string, string]> = {
  grin: ["...HHMHHHHMHD...", "...HHHMMMMHHD..."],
  flat: ["...HHHMMMMHHD...", "...HHHHHHHHHD..."],
  gold: ["...HHHMMGMHHD...", "...HHHHHHHHHD..."],
};

const HEADWEAR: Record<Headwear, { row: number; lines: string[] }> = {
  tpiece: { row: 2, lines: ["......XXX.......", ".......X........"] },
  crown: { row: 1, lines: ["...X...X...X....", "...XX.XXX.XX....", "...XXXXXXXXX...."] },
  cap: { row: 2, lines: ["...XXXXXXXXX....", "...XXXXXXXXXXXX."] },
  none: { row: 0, lines: [] },
};

/** The 16×16 character as rows of colours; null is background. */
export function characterCells(t: Traits): (string | null)[][] {
  const g = Array.from({ length: 16 }, () => Array<string>(16).fill("."));
  const put = (start: number, lines: string[]) =>
    lines.forEach((line, i) =>
      [...line].forEach((ch, c) => {
        const row = g[start + i];
        if (ch !== "." && row) row[c] = ch;
      }),
    );
  const headRow = "...HHHHHHHHHD...";
  put(4, [
    ...Array<string>(8).fill(headRow),
    "....DDDDDDDD....",
    "......HHHD......",
    "..KKKKKKKKKKKK..",
    "..KKKKKKKKKKKK..",
  ]);
  put(7, EYES[t.eyes]);
  put(10, MOUTHS[t.mouth]);
  put(HEADWEAR[t.headwear].row, HEADWEAR[t.headwear].lines);

  const [face, shade] = HEADS[t.head];
  const colors: Record<string, string> = {
    H: face,
    D: shade,
    K: t.shirt,
    X: t.hat,
    B: palette.ground,
    W: "#FFFFFF",
    S: palette.ground,
    V: palette.tomato,
    M: palette.ground,
    G: palette.yellow,
  };
  return g.map((row) => row.map((ch) => colors[ch] ?? null));
}

/** FNV-1a. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable character for a handle, used when the X profile picture can't be fetched. */
export function traitsForHandle(handle: string): Traits {
  let x = hash(handle) || 1;
  const next = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(next() * xs.length)] as T;
  const head = pick(["cream", "yellow", "blue", "tomato", "mint"] as const);
  const bgs = [palette.cobalt, palette.yellow, palette.tomato, palette.cream].filter((c) => c !== HEADS[head][0]);
  return {
    bg: pick(bgs),
    head,
    eyes: pick(["shades", "stare", "visor", "sleepy"] as const),
    mouth: pick(["grin", "flat", "gold"] as const),
    headwear: pick(["tpiece", "crown", "cap", "none"] as const),
    hat: pick([palette.yellow, palette.cream, palette.cobalt, palette.tomato]),
    shirt: pick(["#2B2620", palette.tomato, palette.yellow, palette.cream]),
  };
}
