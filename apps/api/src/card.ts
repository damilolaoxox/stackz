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

/** Rectangle with two-step pixel corners, as three overlapping absolute boxes. */
function stepped(x: number, y: number, w: number, h: number, step: number, color: string): El[] {
  const box = (l: number, t: number, bw: number, bh: number) =>
    div({ position: "absolute", left: l, top: t, width: bw, height: bh, backgroundColor: color });
  return [
    box(x + step * 2, y, w - step * 4, h),
    box(x + step, y + step, w - step * 2, h - step * 2),
    box(x, y + step * 2, w, h - step * 4),
  ];
}

const STAMP_W = 264;
const STAMP_H = 152;

/**
 * The rubber stamp pressed onto the avatar's corner: pixel-cornered like a block, a T-piece mark,
 * PENDING on an inked band, and worn ink that differs per handle.
 */
function stamp(handle: string): El {
  const r = rng(hash(`stamp:${handle}`));
  const ink = palette.tomato;
  const paper = palette.cream;
  const step = 6;
  const mono = { fontFamily: fonts.mono, fontWeight: 700, color: ink, letterSpacing: 3 };

  const specks: El[] = [];
  for (let i = 0; i < 30; i++) {
    const s = [2, 3, 4, 5][Math.floor(r() * 4)]!;
    specks.push(
      div({
        position: "absolute",
        left: Math.floor(7 + r() * (STAMP_W - 14 - s)),
        top: Math.floor(7 + r() * (STAMP_H - 14 - s)),
        width: s,
        height: s,
        backgroundColor: r() < 0.8 ? paper : ink,
      }),
    );
  }

  const tPiece = div(
    { position: "relative", width: 20, height: 13, marginRight: 8 },
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ].map(([x, y]) =>
      div({ position: "absolute", left: x! * 7, top: y! * 7, width: 6, height: 6, backgroundColor: ink }),
    ),
  );

  const row = (top: number, height: number, children: Child | Child[]) =>
    div(
      { position: "absolute", left: 0, top, width: STAMP_W, height, alignItems: "center", justifyContent: "center" },
      children,
    );

  return div(
    {
      position: "absolute",
      left: 168,
      top: 362,
      width: STAMP_W,
      height: STAMP_H,
      transform: "rotate(-10deg)",
      opacity: 0.96,
    },
    [
      ...stepped(0, 0, STAMP_W, STAMP_H, step, ink),
      ...stepped(7, 7, STAMP_W - 14, STAMP_H - 14, step, paper),
      ...stepped(13, 13, STAMP_W - 26, STAMP_H - 26, step, ink),
      ...stepped(16, 16, STAMP_W - 32, STAMP_H - 32, step, paper),
      row(24, 20, [tPiece, text({ ...mono, fontSize: 13 }, "STACKZ · SEASON 0")]),
      div({ position: "absolute", left: 16, top: 52, width: STAMP_W - 32, height: 52, backgroundColor: ink }),
      row(
        52,
        52,
        text({ fontFamily: fonts.display, fontSize: 38, lineHeight: 1, letterSpacing: 3, color: paper }, "PENDING"),
      ),
      row(108, 20, text({ ...mono, fontSize: 12 }, "WAITING FOR THE DROP")),
      ...specks,
    ],
  );
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
          ]),
        ]),

        // Footer: barcode + line
        div({ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28 }, [
          barcode(handle),
          text({ ...mono, fontSize: 20, letterSpacing: 2, opacity: 0.7 }, "THE BOARD IS THE BET."),
        ]),
      ]),

      pile(handle),
      // Last, so it sits on top of the avatar frame and the barcode.
      stamp(handle),
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
