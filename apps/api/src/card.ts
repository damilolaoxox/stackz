import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { characterCells, fonts, palette, TASK_COLORS, TASKS, traitsForHandle } from "@stackz/shared";

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

const BLOCK_COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.mint, palette.cream];

/** The site's 16×16 block character, used when the X profile picture can't be fetched. */
function blockAvatar(handle: string, size: number): El {
  const traits = traitsForHandle(handle);
  const cell = size / 16;
  const blocks: El[] = [];
  characterCells(traits).forEach((row, y) =>
    row.forEach((color, x) => {
      if (color) blocks.push(block(cell, color, { position: "absolute", left: x * cell, top: y * cell }));
    }),
  );
  return div({ position: "relative", width: size, height: size, backgroundColor: traits.bg }, blocks);
}

/** 5×7 block glyphs for the stamp. */
const GLYPHS: Record<string, string[]> = {
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
};

const INK = palette.tomato;
const INK_DARK = "#C9432B";

/**
 * The stamp: a square ring of tetrominoes around "S0" in block letters, tilted like it was
 * pressed by hand. A few blocks are missing per handle, like ink that didn't take.
 */
function stamp(handle: string): El {
  const r = rng(hash(`stamp:${handle}`));
  const C = 24;
  const N = 12;
  const S = C * N;

  // Walk the ring clockwise; every 4 cells is one I or L piece, shaded alternately so the seams show.
  const path: [number, number][] = [];
  for (let x = 0; x < N; x++) path.push([x, 0]);
  for (let y = 1; y < N; y++) path.push([N - 1, y]);
  for (let x = N - 2; x >= 0; x--) path.push([x, N - 1]);
  for (let y = N - 2; y >= 1; y--) path.push([0, y]);
  const ring = path
    .map(([x, y], i) =>
      r() < 0.07 ? null : block(C, Math.floor(i / 4) % 2 ? INK_DARK : INK, { position: "absolute", left: x * C, top: y * C }),
    )
    .filter((b): b is El => b !== null);

  const G = 16;
  const letters: El[] = [];
  ["S", "0"].forEach((ch, li) =>
    GLYPHS[ch]!.forEach((row, y) =>
      [...row].forEach((v, x) => {
        if (v === "#" && r() > 0.06) {
          letters.push(block(G, INK, { position: "absolute", left: (li * 6 + x) * G, top: y * G }));
        }
      }),
    ),
  );

  const label = { fontFamily: fonts.mono, fontWeight: 700, fontSize: 17, letterSpacing: 4, color: INK };
  return div(
    { position: "absolute", right: 72, top: 150, width: S, height: S, transform: "rotate(-9deg)", opacity: 0.95 },
    [
      ...ring,
      div(
        {
          position: "absolute",
          left: C,
          top: C,
          width: S - C * 2,
          height: S - C * 2,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        },
        [
          text(label, "ADMIT ONE"),
          div({ position: "relative", width: 11 * G, height: 7 * G, marginTop: 14, marginBottom: 14 }, letters),
          text(label, "ON THE LIST"),
        ],
      ),
    ],
  );
}

/** The four waitlist tasks as full power bars, the same as the site after joining. */
function taskBars(): El {
  return div(
    { flexDirection: "column" },
    TASKS.map((t, i) =>
      div({ flexDirection: "row", alignItems: "center", marginTop: i ? 14 : 0 }, [
        text(
          { fontFamily: fonts.mono, fontWeight: 700, fontSize: 16, letterSpacing: 2, width: 128, color: palette.cream, opacity: 0.7 },
          t.toUpperCase(),
        ),
        ...Array.from({ length: 10 }, () => block(20, TASK_COLORS[t], { marginRight: 4 })),
      ]),
    ),
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
  const avatarSize = 272;
  const frame = 16;
  const handleText = `@${handle}`;
  // The handle column is about 400px wide, between the avatar and the stamp.
  const handleSize = Math.min(64, Math.floor(400 / (handleText.length * 0.78)));
  const mono = { fontFamily: fonts.mono };

  const picture = avatar
    ? { type: "img", props: { src: avatar, width: avatarSize, height: avatarSize, style: { objectFit: "cover" } } }
    : blockAvatar(handle, avatarSize);

  const inset = 64;
  // Satori sizes boxes content-box, so the root has no padding; content is inset with margins.
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
        // Header: wordmark + card label
        div({ flexDirection: "row", alignItems: "center" }, [
          div({ flexDirection: "row", fontSize: 48, letterSpacing: 1 }, ["STACK", text({ color: palette.yellow }, "Z")]),
          text(
            { ...mono, fontSize: 18, fontWeight: 700, color: palette.yellow, letterSpacing: 4, marginLeft: 28, marginTop: 10 },
            "PLAYER CARD · SEASON 0",
          ),
        ]),

        // Body: framed avatar + handle + task bars
        div({ flexDirection: "row", alignItems: "flex-start", marginTop: 44 }, [
          div({ position: "relative", padding: frame, backgroundColor: palette.yellow }, [
            block(avatarSize + frame * 2, palette.yellow, { position: "absolute", left: 0, top: 0 }),
            div({ position: "relative", width: avatarSize, height: avatarSize }, [picture as El]),
          ]),
          div({ flexDirection: "column", marginLeft: 44, marginTop: 4 }, [
            text({ ...mono, fontSize: 18, letterSpacing: 4, color: palette.cream, opacity: 0.6 }, "PLAYER"),
            text({ fontSize: handleSize, lineHeight: 1.1, marginTop: 8, marginBottom: 30 }, handleText),
            taskBars(),
          ]),
        ]),
      ]),

      text(
        { ...mono, position: "absolute", left: inset, bottom: 54, fontSize: 18, letterSpacing: 3, opacity: 0.7 },
        "THE BOARD IS THE BET.",
      ),
      stamp(handle),
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
