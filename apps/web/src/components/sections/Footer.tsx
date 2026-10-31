import { palette } from "@stackz/shared";
import { pieceCells, type PieceType } from "../../game/pieces";
import { COMMUNITY_URL, X_PROFILE_URL } from "../../lib/config";
import { Wordmark } from "../Wordmark";

const LANDERS: { type: PieceType; color: string; left: string; delay: string; dur: string }[] = [
  { type: "T", color: palette.yellow, left: "18%", delay: "0s", dur: "5s" },
  { type: "O", color: palette.cobalt, left: "52%", delay: "1.6s", dur: "6.5s" },
  { type: "S", color: palette.tomato, left: "80%", delay: "3s", dur: "5.8s" },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__row">
          <span>SEASON 0 · PRE-SEASON</span>
          <nav className="footer__links" aria-label="Footer">
            <a href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer">
              X
            </a>
            {COMMUNITY_URL && (
              <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
                COMMUNITY
              </a>
            )}
            <a href="/privacy">PRIVACY</a>
          </nav>
        </div>
        <div className="footer__mark">
          <div className="footer__landers" aria-hidden="true">
            {LANDERS.map((p) => (
              <div
                key={p.type}
                className="footer__lander"
                style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur }}
              >
                {pieceCells(p.type).map(([x, y], j) => (
                  <span key={j} className="blk" style={{ left: x * 30, top: y * 30, background: p.color }} />
                ))}
              </div>
            ))}
          </div>
          <Wordmark className="wordmark footer__wordmark" />
        </div>
      </div>
    </footer>
  );
}
