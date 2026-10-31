import type { CSSProperties } from "react";

/** Inline CSS custom properties, e.g. cssVars({ "--x": 3 }). */
export function cssVars(vars: Record<`--${string}`, string | number>, extra?: CSSProperties): CSSProperties {
  return { ...(vars as CSSProperties), ...extra };
}
