import { useState } from "react";
import { traitsForHandle } from "@stackz/shared";
import { characterImage } from "../../lib/character";

interface Props {
  handle: string | null;
  /** undefined while loading, null when X has no picture we can use. */
  url: string | null | undefined;
}

/** The square beside the handle input where the X profile picture appears. */
export function AvatarBox({ handle, url }: Props) {
  const [failed, setFailed] = useState<string | null>(null);

  if (!handle) {
    return (
      <span className="avatar avatar--empty" role="img" aria-label="Your X profile picture appears here">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="8" y="3" width="8" height="8" />
          <path d="M4 21v-3a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3" />
        </svg>
      </span>
    );
  }
  if (url === undefined)
    return <span className="avatar avatar--loading" role="img" aria-label="Loading profile picture" />;

  const usable = url && failed !== url ? url : null;
  return (
    <span className="avatar">
      <img
        src={usable ?? characterImage(traitsForHandle(handle), 128)}
        alt={usable ? `@${handle}'s X profile picture` : "Stackz block avatar"}
        width={64}
        height={64}
        onError={() => setFailed(url ?? null)}
      />
    </span>
  );
}
