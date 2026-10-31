import { palette } from "@stackz/shared";

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

const HEADS: Record<Head, [face: string, shade: string]> = {
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

/** The 16×16 trait grid as letters; "." is background. */
export function characterGrid(t: Traits): string[][] {
  const g = Array.from({ length: 16 }, () => Array<string>(16).fill("."));
  const put = (start: number, lines: string[]) =>
    lines.forEach((line, i) =>
      [...line].forEach((ch, c) => {
        const row = g[start + i];
        if (ch !== "." && row) row[c] = ch;
      }),
    );
  const headRow = "...HHHHHHHHHD...";
  put(4, [...Array<string>(8).fill(headRow), "....DDDDDDDD....", "......HHHD......", "..KKKKKKKKKKKK..", "..KKKKKKKKKKKK.."]);
  put(7, EYES[t.eyes]);
  put(10, MOUTHS[t.mouth]);
  put(HEADWEAR[t.headwear].row, HEADWEAR[t.headwear].lines);
  return g;
}

const cache = new Map<string, string>();

/** Draws the character to a canvas once and returns a PNG data URL. */
export function characterImage(t: Traits, size = 320): string {
  const key = `${size}|${JSON.stringify(t)}`;
  const hit = cache.get(key);
  if (hit) return hit;

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

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const cell = size / 16;
  const b = Math.max(1, Math.round(cell * 0.12));
  if (t.bg !== "transparent") {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, size, size);
  }
  characterGrid(t).forEach((row, y) =>
    row.forEach((ch, x) => {
      const color = colors[ch];
      if (!color) return;
      const px = x * cell;
      const py = y * cell;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, cell, cell);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(px, py, cell, b);
      ctx.fillRect(px, py, b, cell);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(px, py + cell - b, cell, b);
      ctx.fillRect(px + cell - b, py, b, cell);
    }),
  );
  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

export const LINEUP: Traits[] = [
  { bg: palette.yellow, head: "cream", eyes: "shades", mouth: "grin", headwear: "tpiece", hat: palette.tomato, shirt: "#2B2620" },
  { bg: palette.ground, head: "yellow", eyes: "stare", mouth: "flat", headwear: "crown", hat: palette.cream, shirt: palette.cobalt },
  { bg: palette.tomato, head: "cream", eyes: "sleepy", mouth: "gold", headwear: "cap", hat: palette.cobalt, shirt: "#2B2620" },
  { bg: palette.cream, head: "mint", eyes: "visor", mouth: "grin", headwear: "none", hat: palette.yellow, shirt: palette.tomato },
  { bg: palette.yellow, head: "tomato", eyes: "shades", mouth: "flat", headwear: "crown", hat: palette.cream, shirt: palette.cobalt },
  { bg: palette.ground, head: "blue", eyes: "sleepy", mouth: "grin", headwear: "tpiece", hat: palette.yellow, shirt: palette.cream },
  { bg: palette.cream, head: "yellow", eyes: "visor", mouth: "gold", headwear: "cap", hat: palette.tomato, shirt: "#2B2620" },
  { bg: palette.tomato, head: "mint", eyes: "stare", mouth: "grin", headwear: "none", hat: palette.yellow, shirt: palette.yellow },
];

/** Fallback avatar when the X profile picture can't be fetched. */
export const DEFAULT_AVATAR: Traits = {
  bg: palette.cobalt,
  head: "cream",
  eyes: "shades",
  mouth: "grin",
  headwear: "tpiece",
  hat: palette.yellow,
  shirt: "#2B2620",
};
