import { memo } from "react";
import { palette } from "@stackz/shared";
import { pieceCells, type PieceType } from "../../game/pieces";

const NEXT: { type: PieceType; color: string }[] = [
  { type: "T", color: palette.tomato },
  { type: "I", color: palette.cream },
  { type: "O", color: palette.cobalt },
  { type: "S", color: palette.yellow },
];

/** Cycles through upcoming pieces in a small box. */
export const NextPreview = memo(function NextPreview() {
  return (
    <div className="next" aria-hidden="true">
      <div className="next__strip">
        {NEXT.map((p, i) => {
          const cells = pieceCells(p.type);
          const w = Math.max(...cells.map((c) => c[0])) + 1;
          const h = Math.max(...cells.map((c) => c[1])) + 1;
          return (
            <div key={i} className="next__slot">
              <div className="next__piece" style={{ width: w * 14, height: h * 14 }}>
                {cells.map(([x, y], j) => (
                  <span key={j} className="blk" style={{ left: x * 14, top: y * 14, background: p.color }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** A digit that rolls through 0-9 on a stepped loop. */
export function RollingDigit({ seconds, count = 10, accent = false }: { seconds: number; count?: 3 | 6 | 10; accent?: boolean }) {
  return (
    <span className={accent ? "roll roll--accent" : "roll"} aria-hidden="true">
      <span className={`roll__col roll__col--${count}`} style={{ animationDuration: `${seconds}s` }}>
        {DIGITS.slice(0, count).map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  );
}

/** The live match pot under the hero board. Decorative until real matches exist. */
export function Pot() {
  return (
    <div className="pot" aria-hidden="true">
      <div className="pot__row">
        <span className="pot__label">POT</span>
        <span className="pot__value">
          48,2
          <RollingDigit seconds={20} />
          <RollingDigit seconds={2} accent />
        </span>
      </div>
      <div className="pot__bar">
        <span />
      </div>
      <div className="pot__sides">
        <span>BACKING P1</span>
        <span>BACKING P2</span>
      </div>
    </div>
  );
}
