import { memo } from "react";
import { palette } from "@stackz/shared";
import { cssVars } from "../../lib/css";
import { seeded } from "../../lib/random";

/** 5×7 block font, only the letters the headline needs. */
const FONT: Record<string, string[]> = {
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
};

interface Block {
  x: number;
  y: number;
  color: string;
  delay: string;
}
interface Line {
  blocks: Block[];
  width: number;
  dotX?: number;
}

function buildLines(): Line[] {
  const rnd = seeded(23);
  let order = 0;
  const spell = (text: string, accentFrom: number): Line => {
    const blocks: Block[] = [];
    let x = 0;
    [...text].forEach((ch, idx) => {
      if (ch === " ") {
        x += 3;
        return;
      }
      const glyph = FONT[ch] ?? [];
      const accent = idx >= accentFrom;
      glyph.forEach((row, r) =>
        [...row].forEach((v, c) => {
          if (v !== "#") return;
          const roll = rnd();
          const color = accent
            ? roll < 0.15
              ? palette.tomato
              : palette.yellow
            : roll < 0.08
              ? palette.cobalt
              : roll < 0.13
                ? palette.tomato
                : palette.cream;
          // Bottom rows land first, like a stack building up.
          const delay = 0.35 + order * 0.006 + (6 - r) * 0.07 + roll * 0.25;
          blocks.push({ x: x + c, y: r, color, delay: `${delay.toFixed(2)}s` });
          order++;
        }),
      );
      x += 6;
    });
    return { blocks, width: x - 1 };
  };
  const l1 = spell("THE BOARD", 99);
  const l2 = spell("IS THE BET", 7);
  return [l1, { ...l2, width: l2.width + 2, dotX: l2.width + 1 }];
}

const LINES = buildLines();

/** "THE BOARD IS THE BET." built from blocks that fall into place on load. */
export const BlockHeadline = memo(function BlockHeadline() {
  return (
    <h1 className="headline">
      <span className="sr-only">The board is the bet.</span>
      <span className="headline__word" aria-hidden="true">
        {LINES.map((line, i) => (
          <span key={i} className="headline__line" style={cssVars({ "--w": line.width })}>
            {line.blocks.map((b, j) => (
              <span
                key={j}
                className="blk headline__cell"
                style={cssVars({ "--x": b.x, "--y": b.y }, { background: b.color, animationDelay: b.delay })}
              />
            ))}
            {line.dotX !== undefined && <span className="blk headline__dot" style={cssVars({ "--x": line.dotX, "--y": 6 })} />}
          </span>
        ))}
      </span>
    </h1>
  );
});
