import { memo } from "react";
import { palette } from "@stackz/shared";
import { pick, seeded } from "../../lib/random";

const COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.cream];
const ROW = (() => {
  const rnd = seeded(57);
  return Array.from({ length: 96 }, () => pick(COLORS, rnd));
})();

/** A full row of blocks that flashes and clears on a loop, between sections. */
export const LineClearDivider = memo(function LineClearDivider() {
  return (
    <div className="divider" aria-hidden="true">
      <div className="divider__row">
        {ROW.map((c, i) => (
          <span key={i} className="blk" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
});
