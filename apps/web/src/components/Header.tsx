import { sound } from "../audio/sound";
import { useMuted } from "../hooks/useMotion";
import { Wordmark } from "./Wordmark";

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" stroke="none" />
      {muted ? <path d="M11 6l4 4M15 6l-4 4" /> : <path d="M11.5 5.5a3.5 3.5 0 0 1 0 5M13.5 3.5a6.5 6.5 0 0 1 0 9" />}
    </svg>
  );
}

export function Header() {
  const muted = useMuted();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#top" className="site-header__brand" aria-label="Stackz home">
          <Wordmark />
        </a>
        <nav className="site-nav" aria-label="Main">
          <a href="#match">THE MATCH</a>
          <a href="#characters">CHARACTERS</a>
          <button
            type="button"
            className="sound-toggle"
            aria-pressed={!muted}
            onClick={() => {
              sound.unlock();
              sound.setMuted(!muted);
            }}
          >
            <SpeakerIcon muted={muted} />
            <span>{muted ? "SOUND OFF" : "SOUND ON"}</span>
          </button>
          <a href="#waitlist" className="btn btn--outline">
            JOIN THE WAITLIST
          </a>
        </nav>
      </div>
    </header>
  );
}
