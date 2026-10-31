import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { fonts, palette, TASK_COLORS, TASKS } from "@stackz/shared";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export interface CardInput {
  handle: string;
  /** PNG/JPEG data URI of the X profile picture, or null for the block avatar. */
  avatar: string | null;
}

export type RenderCard = (input: CardInput) => Promise<Uint8Array>;

// Resolved relative to this module. Keep this file directly under src/ so the
// path is the same from src/card.ts (dev) and the bundled dist/server.js.
const FONT_DIR = new URL("../assets/fonts/", import.meta.url);

let fontData: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;
function loadFonts() {
  fontData ??= Promise.all([
    readFile(new URL("ArchivoBlack-Regular.ttf", FONT_DIR)),
    readFile(new URL("SpaceMono-Regular.ttf", FONT_DIR)),
    readFile(new URL("SpaceMono-Bold.ttf", FONT_DIR)),
  ]).then(([display, mono, monoBold]) => [
    { name: fonts.display, data: display, weight: 400, style: "normal" },
    { name: fonts.mono, data: mono, weight: 400, style: "normal" },
    { name: fonts.mono, data: monoBold, weight: 700, style: "normal" },
  ]);
  return fontData;
}

// --- tiny element helpers (satori takes React-element-shaped objects) ---

type Style = Record<string, string | number>;
interface El {
  type: string;
  props: { style?: Style; children?: Child | Child[]; [k: string]: unknown };
}
type Child = El | string;

function div(style: Style, children?: Child | Child[]): El {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

function text(style: Style, value: string): El {
  return div(style, value);
}

/** A bevelled block, drawn with edge strips so it matches the site's inset box-shadow. */
function block(size: number, color: string, style: Style = {}): El {
  const b = Math.max(1, Math.round(size * 0.12));
  const strip = (s: Style, c: string) => div({ position: "absolute", backgroundColor: c, ...s });
  return div({ position: "relative", width: size, height: size, backgroundColor: color, flexShrink: 0, ...style }, [
    strip({ left: 0, top: 0, width: size, height: b }, "rgba(255,255,255,.28)"),
    strip({ left: 0, top: 0, width: b, height: size }, "rgba(255,255,255,.28)"),
    strip({ left: 0, bottom: 0, width: size, height: b }, "rgba(0,0,0,.3)"),
    strip({ right: 0, top: 0, width: b, height: size }, "rgba(0,0,0,.3)"),
  ]);
}

/** FNV-1a; deterministic per handle so the same handle always gets the same card. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

const HEAD_COLORS = [palette.cream, palette.yellow, palette.cobalt, palette.tomato, palette.mint];
const BLOCK_COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.mint, palette.cream];

/** 8×8 block face used when the X profile picture can't be fetched. */
function blockAvatar(handle: string, size: number): El {
  const r = rng(hash(handle));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const head = pick(HEAD_COLORS);
  const shirt = pick(BLOCK_COLORS.filter((c) => c !== head));
  const cell = size / 8;
  const rows: El[] = [];
  for (let y = 0; y < 8; y++) {
    const cells: El[] = [];
    for (let x = 0; x < 8; x++) {
      let color: string | null = null;
      if (y >= 1 && y <= 5 && x >= 1 && x <= 6) color = head;
      if (y === 2 && (x === 2 || x === 5)) color = palette.deepGround;
      if (y === 4 && (x === 3 || x === 4)) color = palette.deepGround;
      if (y >= 6) color = shirt;
      cells.push(color ? block(cell, color) : div({ width: cell, height: cell }));
    }
    rows.push(div({ flexDirection: "row" }, cells));
  }
  return div({ flexDirection: "column", width: size, height: size, backgroundColor: palette.garbage }, rows);
}

/** Block barcode. Purely decorative: no digits, no spot number. */
function barcode(handle: string): El {
  const r = rng(hash(`bar:${handle}`));
  const bars: El[] = [];
  for (let i = 0; i < 34; i++) {
    bars.push(div({ width: 4 + Math.floor(r() * 3) * 4, height: 56, backgroundColor: palette.cream, marginRight: 6 }));
  }
  return div({ flexDirection: "row", alignItems: "flex-end" }, bars);
}

/** Landed pile along the bottom edge. */
function pile(handle: string): El {
  const r = rng(hash(`pile:${handle}`));
  const size = 30;
  const cells: El[] = [];
  for (let i = 0; i < CARD_WIDTH / size; i++) {
    cells.push(
      r() < 0.12
        ? div({ width: size, height: size })
        : block(size, r() < 0.35 ? palette.garbage : BLOCK_COLORS[Math.floor(r() * 4)]!),
    );
  }
  return div({ position: "absolute", left: 0, bottom: 0, flexDirection: "row" }, cells);
}

export function cardElement({ handle, avatar }: CardInput): El {
  const avatarSize = 300;
  const frame = 16;
  const handleText = `@${handle}`;
  const handleSize = Math.min(84, Math.floor(620 / (handleText.length * 0.82)));
  const mono = { fontFamily: fonts.mono };

  const picture = avatar
    ? { type: "img", props: { src: avatar, width: avatarSize, height: avatarSize, style: { objectFit: "cover" } } }
    : blockAvatar(handle, avatarSize);

  const inset = 64;
  // Satori sizes boxes content-box, so the root has no padding; the content
  // column is inset with margins instead.
  return div(
    {
      position: "relative",
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: palette.ground,
      color: palette.cream,
      fontFamily: fonts.display,
    },
    [
      div({ flexDirection: "column", width: CARD_WIDTH - inset * 2, marginLeft: inset, marginTop: 44 }, [
        // Header: wordmark + season tag
        div({ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, [
          div({ flexDirection: "row", fontSize: 56, letterSpacing: 2 }, [
            "STACK",
            text({ color: palette.yellow }, "Z"),
          ]),
          text(
            { ...mono, fontSize: 22, fontWeight: 700, color: palette.yellow, letterSpacing: 3 },
            "SEASON 0 · ON THE LIST",
          ),
        ]),

        // Body: avatar + player panel
        div({ flexDirection: "row", alignItems: "center", marginTop: 36 }, [
          div({ position: "relative", padding: frame, backgroundColor: palette.yellow }, [
            block(avatarSize + frame * 2, palette.yellow, { position: "absolute", left: 0, top: 0 }),
            div({ position: "relative", width: avatarSize, height: avatarSize }, [picture as El]),
          ]),
          div({ flexDirection: "column", marginLeft: 56 }, [
            text({ ...mono, fontSize: 22, letterSpacing: 4, color: palette.cream, opacity: 0.6 }, "PLAYER"),
            text({ fontSize: handleSize, lineHeight: 1.1, marginTop: 8 }, handleText),
            div({ flexDirection: "row", alignItems: "center", marginTop: 28 }, [
              text({ ...mono, fontSize: 26, fontWeight: 700, letterSpacing: 3, marginRight: 20 }, "TASKS 4/4"),
              ...TASKS.map((t) => block(34, TASK_COLORS[t], { marginRight: 8 })),
            ]),
            text({ ...mono, fontSize: 22, letterSpacing: 3, color: palette.tomato, marginTop: 20 }, "SPOT PENDING"),
          ]),
        ]),

        // Footer: barcode + line
        div({ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28 }, [
          barcode(handle),
          text({ ...mono, fontSize: 20, letterSpacing: 2, opacity: 0.7 }, "THE BOARD IS THE BET."),
        ]),
      ]),

      pile(handle),
    ],
  );
}

export async function renderCard(input: CardInput): Promise<Uint8Array> {
  const svg = await satori(cardElement(input) as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: await loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
}

export function toDataUri(image: { data: Uint8Array; type: string }): string {
  return `data:${image.type};base64,${Buffer.from(image.data).toString("base64")}`;
}
