import { palette } from "@stackz/shared";
import { TetrisBoard } from "../TetrisBoard";

const BEATS = [
  { n: "01", text: "Back P1 or P2 before the drop.", color: palette.yellow },
  { n: "02", text: "Watch both boards live.", color: palette.tomato },
  { n: "03", text: "Winners split the pot.", color: "#6F93F0" },
];

export function Match() {
  return (
    <section className="match" id="match" aria-labelledby="match-title">
      <div className="container match__inner">
        <div className="match__copy">
          <p className="eyebrow">
            <span className="eyebrow__level">LEVEL 02</span> · THE MATCH
          </p>
          <h2 id="match-title" className="section-title">
            Two boards.
            <br />
            <span className="accent">One pot.</span>
          </h2>
          <p className="match__text">
            Pick a side before the first drop. Every line a player clears buries their rival in garbage. When one tops
            out, everyone who backed the other side splits the pot.
          </p>
          <ul className="beats">
            {BEATS.map((b) => (
              <li key={b.n}>
                <span className="beats__n" style={{ color: b.color }}>
                  {b.n}
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="match__boards">
          <div className="match__side">
            <span className="match__odds match__odds--p1">P1 · ×1.7</span>
            <TetrisBoard cell={20} rows={16} tickMs={110} skill={0.9} />
          </div>
          <div className="match__side nudge">
            <span className="match__odds match__odds--p2">P2 · ×2.3</span>
            <TetrisBoard cell={20} rows={16} tickMs={105} skill={0.55} garbage />
          </div>
        </div>
      </div>
    </section>
  );
}
