import { characterCells, palette, type Traits } from "@stackz/shared";

export type { Traits };

const cache = new Map<string, string>();

/** Draws the character to a canvas once and returns a PNG data URL. */
export function characterImage(t: Traits, size = 320): string {
  const key = `${size}|${JSON.stringify(t)}`;
  const hit = cache.get(key);
  if (hit) return hit;

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
  characterCells(t).forEach((row, y) =>
    row.forEach((color, x) => {
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
