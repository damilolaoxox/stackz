import { useState } from "react";
import type { JoinResponse } from "@stackz/shared";

const SHARE_TEXT = "I'm on the Stackz list for Season 0. The board is the bet.";

const HEADINGS: Record<JoinResponse["status"], string> = {
  pending: "Your spot is pending.",
  approved: "You're in.",
  rejected: "Your spot wasn't approved.",
};

async function fetchCard(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`card ${res.status}`);
  return res.blob();
}

export function JoinedPanel({ joined, onNotYou }: { joined: JoinResponse; onNotYou: () => void }) {
  const [note, setNote] = useState("");

  const share = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(joined.shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      const blob = await fetchCard(joined.cardUrl);
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      setNote("Card copied. Paste it anywhere.");
    } catch {
      setNote("Your browser can't copy images. Use Download instead.");
    }
  };

  const download = async () => {
    try {
      const blob = await fetchCard(joined.cardUrl);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `stackz-${joined.handle}.png`;
      a.click();
      URL.revokeObjectURL(href);
      setNote("Card downloaded.");
    } catch {
      setNote("Couldn't download the card. Try again in a moment.");
    }
  };

  return (
    <div className="joined">
      <div className="joined__copy">
        <p className="joined__kicker">
          <span className="blink joined__dot" aria-hidden="true" />
          YOU'RE ON THE LIST
        </p>
        <h3 className="joined__title">{HEADINGS[joined.status]}</h3>
        <p className="joined__text">Your Stackz card. Share it and bring your friends into Season 0.</p>
        <p className="joined__note">We'll reach out on X when Season 0 opens.</p>
        <div className="joined__actions">
          <button type="button" className="btn btn--primary btn--shadow" onClick={share}>
            Share on X
          </button>
          <button type="button" className="btn btn--paper" onClick={() => void copy()}>
            Copy image
          </button>
          <button type="button" className="btn btn--paper" onClick={() => void download()}>
            Download
          </button>
        </div>
        <p className="joined__status" aria-live="polite">
          {note}
        </p>
        <button type="button" className="link-btn" onClick={onNotYou}>
          Not you?
        </button>
      </div>
      <figure className="joined__card">
        <img src={joined.cardUrl} alt={`Stackz Season 0 card for @${joined.handle}`} width={1200} height={630} />
      </figure>
    </div>
  );
}
