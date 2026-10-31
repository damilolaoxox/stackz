import { sound } from "../audio/sound";
import type { EngineEvent } from "../game/engine";
import { useEngine } from "../hooks/useEngine";
import { useInView, useReducedMotion } from "../hooks/useMotion";
import { cssVars } from "../lib/css";

interface Props {
  cell: number;
  rows: number;
  tickMs: number;
  skill: number;
  garbage?: boolean;
  label?: string;
  labelColor?: string;
  /** Hero board: tick on the music clock and play lock / line-clear sounds. */
  musical?: boolean;
}

function playEvents(events: EngineEvent[], musicTime: number | null) {
  const at = musicTime ?? undefined;
  for (const e of events) {
    if (e.type === "lock") sound.play("lock", at);
    if (e.type === "clear") sound.play("lineClear", at);
  }
}

/** A real, self-playing Tetris board. With reduced motion it shows a still board. */
export function TetrisBoard({ cell, rows, tickMs, skill, garbage = false, label = "", labelColor, musical = false }: Props) {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const engine = useEngine({
    rows,
    skill,
    garbage,
    tickMs,
    paused: reduced || !inView,
    syncToMusic: musical,
    onEvents: musical ? playEvents : undefined,
  });

  const view = engine.view();
  const topped = engine.over > 0;

  return (
    <div
      ref={ref}
      className="board"
      style={cssVars({ "--cell": `${cell}px`, "--b": `${Math.max(2, Math.round(cell * 0.12))}px` })}
      aria-hidden="true"
    >
      <div className="board__stats">
        <span>
          LINES <b>{String(engine.lines).padStart(3, "0")}</b>
        </span>
        <span className={topped ? "board__label board__label--out" : "board__label"} style={topped ? undefined : { color: labelColor }}>
          {topped ? "TOPPED OUT" : label}
        </span>
      </div>
      <div className="board__well">
        {view.map((row, y) => (
          <div className="board__row" key={y}>
            {row.map((c, x) => (
              <span key={x} className={`board__cell is-${c.kind}`} style={c.color ? cssVars({ "--c": c.color }) : undefined} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
