import { memo } from "react";
import { palette } from "@stackz/shared";
import { PIECE_TYPES, pieceCells, type PieceType } from "../../game/pieces";
import { cssVars } from "../../lib/css";
import { pick, seeded } from "../../lib/random";

const COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.cream];

interface Piece {
  x: number;
  size: number;
  type: PieceType;
  color: string;
  opacity: number;
  animation: string;
}

function buildRain(): Piece[] {
  const rnd = seeded(11);
  const pieces: Piece[] = [];
  const add = (
    x: number,
    size: number,
    type: PieceType,
    color: string,
    dur: number,
    delay: number,
    opacity: number,
    timing: string,
    rotate: boolean,
  ) =>
    pieces.push({
      x: Math.round(x),
      size,
      type,
      color,
      opacity,
      animation: `${rotate ? "stz-drop-rot" : "stz-drop"} ${dur.toFixed(1)}s ${timing} ${delay.toFixed(1)}s infinite`,
    });

  // Far layer: small, faint, smooth.
  for (let i = 0; i < 18; i++) {
    const dur = 18 + rnd() * 10;
    add(rnd() * 1400, 14, pick(PIECE_TYPES, rnd), pick(COLORS, rnd), dur, -rnd() * dur, 0.16, "linear", false);
  }
  // Mid layer: drops row by row, some snap-rotate.
  for (let i = 0; i < 10; i++) {
    const dur = 11 + rnd() * 5;
    add(rnd() * 1380, 24, pick(PIECE_TYPES, rnd), pick(COLORS, rnd), dur, -rnd() * dur, 0.38, "steps(44)", i % 3 === 0);
  }
  // Near layer: big and solid.
  add(640, 46, "T", palette.tomato, 8, -2.5, 1, "steps(30)", true);
  add(40, 46, "L", palette.cobalt, 9.5, -6, 1, "steps(30)", false);
  add(930, 46, "Z", palette.yellow, 7.5, -4.8, 1, "steps(30)", false);
  return pieces;
}

const RAIN = buildRain();

export const Rain = memo(function Rain() {
  return (
    <div className="rain" aria-hidden="true">
      {RAIN.map((p, i) => (
        <div
          key={i}
          className="rain__piece"
          style={cssVars(
            { "--b": `${Math.max(2, Math.round(p.size * 0.12))}px` },
            { left: p.x, width: p.size * 4, height: p.size * 4, opacity: p.opacity, animation: p.animation },
          )}
        >
          {pieceCells(p.type).map(([cx, cy], j) => (
            <span
              key={j}
              className="blk"
              style={{
                left: cx * p.size,
                top: cy * p.size,
                width: p.size - 2,
                height: p.size - 2,
                background: p.color,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
