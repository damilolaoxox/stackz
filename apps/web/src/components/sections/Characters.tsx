import { useMemo } from "react";
import { characterImage, LINEUP } from "../../lib/character";

export function Characters() {
  // Rendered twice so the conveyor loops seamlessly.
  const images = useMemo(() => LINEUP.map((t) => characterImage(t, 352)), []);
  const strip = [...images, ...images];

  return (
    <section className="characters" id="characters" aria-labelledby="characters-title">
      <div className="container characters__head">
        <div>
          <p className="eyebrow eyebrow--on-blue">
            <span className="eyebrow__level">LEVEL 03</span> · CHARACTERS
          </p>
          <h2 id="characters-title" className="section-title">
            Your face
            <br />
            on the board.
          </h2>
        </div>
        <p className="characters__text">
          [SUPPLY] characters, built from the same blocks you play with. Hold one and it's you in every match.
        </p>
      </div>
      <div className="conveyor" aria-hidden="true">
        <div className="conveyor__track">
          {strip.map((src, i) => (
            <img key={i} className="conveyor__item" src={src} alt="" width={176} height={176} />
          ))}
        </div>
      </div>
    </section>
  );
}
