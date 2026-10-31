import { palette } from "@stackz/shared";
import { Header } from "../Header";
import { TetrisBoard } from "../TetrisBoard";
import { BlockHeadline } from "./BlockHeadline";
import { HeroFloor } from "./HeroFloor";
import { NextPreview, Pot } from "./HudBits";
import { Rain } from "./Rain";

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero__stage">
        <Rain />
        <div className="hero__live">
          <div className="hero__live-head">
            <span className="blink live-dot" aria-hidden="true">
              ●
            </span>{" "}
            LIVE · MATCH 0412
          </div>
          <TetrisBoard cell={26} rows={18} tickMs={90} skill={0.85} label="P1" labelColor={palette.yellow} musical />
          <Pot />
        </div>
      </div>

      <Header />

      <div className="hero__content">
        <div className="hero__hud">
          <span className="hero__hud-next">
            NEXT <NextPreview />
          </span>
          <span>LEVEL 00</span>
          <span>SEASON 0 · TICKETS OPEN</span>
        </div>
        <BlockHeadline />
        <p className="hero__sub">Real-time Tetris where the crowd puts tokens on every match. Play it, back it, or both.</p>
        <div>
          <a href="#waitlist" className="btn btn--primary">
            Join the waitlist
          </a>
        </div>
      </div>

      <HeroFloor />
    </section>
  );
}
