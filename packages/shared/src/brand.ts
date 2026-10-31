import type { Task } from "./schemas";

export const palette = {
  ground: "#15130F",
  deepGround: "#0E0D0A",
  cream: "#EFE7D6",
  yellow: "#F2C230",
  cobalt: "#3D6BE0",
  tomato: "#E8553A",
  mint: "#4FB477",
  garbage: "#4A443A",
} as const;

export const fonts = {
  display: "Archivo Black",
  mono: "Space Mono",
} as const;

export const TASK_COLORS: Record<Task, string> = {
  follow: palette.yellow,
  like: palette.cobalt,
  comment: palette.tomato,
  repost: palette.mint,
};

/** Hard block bevel. `b` is about 12% of the cell size. */
export function bevelShadow(cellSize: number): string {
  const b = Math.max(1, Math.round(cellSize * 0.12));
  return `inset ${b}px ${b}px 0 rgba(255,255,255,.28), inset -${b}px -${b}px 0 rgba(0,0,0,.3)`;
}
