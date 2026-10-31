import { memo, useEffect, useState } from "react";
import { palette } from "@stackz/shared";
import { sound } from "../../audio/sound";
import { cssVars } from "../../lib/css";
import { pick, seeded } from "../../lib/random";

const COLORS = [palette.yellow, palette.cobalt, palette.tomato, palette.cream];
const DEPTH_OPACITY = [1, 0.62, 0.38, 0.2];

interface Column {
  cells: { color: string; opacity: number; bottom: boolean }[];
  delay: string;
}

function buildFloor(): Column[] {
  const rnd = seeded(31);
  return Array.from({ length: 96 }, (_, i) => {
    const h = Math.max(1, Math.min(4, 1 + Math.floor(rnd() * 4) + (rnd() < 0.25 ? -1 : 0)));
    const cells = [];
    for (let r = h - 1; r >= 0; r--) {
      cells.push({ color: pick(COLORS, rnd), opacity: DEPTH_OPACITY[r] ?? 1, bottom: r === 0 });
    }
    return { cells, delay: `${(i * 0.022).toFixed(3)}s` };
  });
}

const FLOOR = buildFloor();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** HH:MM:SS:FF at 24 fps, from the music clock once it is running. */
function Timecode() {
  const [text, setText] = useState("00:00:00:00");
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let lastFrame = -1;
    const loop = (now: number) => {
      const t = sound.musicTime() ?? (now - start) / 1000;
      const frame = Math.floor(Math.max(0, t) * 24);
      if (frame !== lastFrame) {
        lastFrame = frame;
        const s = Math.floor(frame / 24);
        setText(`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frame % 24)}`);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <span className="floor__tc" aria-hidden="true">
      <span className="floor__tc-label">TC</span>
      {text}
    </span>
  );
}

/** The pile of landed blocks at the bottom of the hero, with a caption and timecode. */
export const HeroFloor = memo(function HeroFloor() {
  return (
    <div className="floor">
      <div className="floor__caption">
        <span className="floor__scene">
          <span className="floor__rule" />
          SCENE 01 · THE DROP
        </span>
        <Timecode />
      </div>
      <div className="floor__pile" aria-hidden="true">
        {FLOOR.map((col, i) => (
          <div key={i} className="floor__col">
            {col.cells.map((c, j) => (
              <span
                key={j}
                className={c.bottom ? "blk floor__cell floor__cell--sweep" : "blk floor__cell"}
                style={cssVars({}, { background: c.color, opacity: c.opacity, animationDelay: col.delay })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});
