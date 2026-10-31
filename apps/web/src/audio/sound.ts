/**
 * Site audio. Browsers block sound until the visitor interacts, so nothing plays until the
 * first pointerdown that is not inside a text field (see installSoundTriggers).
 *
 * The music is in step with the hero board: one game tick (90 ms) is one 16th note at 166.67 BPM.
 * The hero board reads musicTime() so its ticks land on the beat.
 */

export const TICK_SECONDS = 0.09;
export const INTRO_SECONDS = 5.76; // 4 bars
export const LOOP_SECONDS = 23.04; // 16 bars

const FILES = {
  intro: "/sfx/theme-intro.mp3",
  loop: "/sfx/theme-loop.mp3",
  click: "/sfx/click.mp3",
  lock: "/sfx/lock.mp3",
  lineClear: "/sfx/line-clear.mp3",
  taskDone: "/sfx/task-done.mp3",
} as const;

type BufferName = keyof typeof FILES;
export type Sfx = "click" | "lock" | "lineClear" | "taskDone";

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.6;
const MUTE_KEY = "stackz.muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Seconds of silence an MP3 decoder may leave at the start; trimmed so the loop is seamless. */
function leadIn(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  const max = Math.min(data.length, 8192);
  for (let i = 0; i < max; i++) {
    if (Math.abs(data[i] ?? 0) > 0.0015) return i / buffer.sampleRate;
  }
  return 0;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private buffers: Partial<Record<BufferName, AudioBuffer>> = {};
  private musicStart: number | null = null;
  private listeners = new Set<() => void>();
  muted = readMuted();

  /** Call from inside a user gesture. Creates the audio context and starts the music once loaded. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = MUSIC_VOLUME;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = SFX_VOLUME;
    this.sfx.connect(this.master);
    void this.load().then(() => this.startMusic());
  }

  private async load() {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      (Object.entries(FILES) as [BufferName, string][]).map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          this.buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
        } catch (err) {
          console.warn(`stackz: could not load ${url}`, err);
        }
      }),
    );
  }

  private startMusic() {
    const { ctx, music } = this;
    const intro = this.buffers.intro;
    const loop = this.buffers.loop;
    if (!ctx || !music || !intro || !loop || this.musicStart !== null) return;

    const t0 = ctx.currentTime + 0.06;
    const introSrc = ctx.createBufferSource();
    introSrc.buffer = intro;
    introSrc.connect(music);
    introSrc.start(t0, leadIn(intro), INTRO_SECONDS);

    // Scheduled sample-accurately after the intro. <audio loop> would leave a gap.
    const loopOffset = leadIn(loop);
    const loopSrc = ctx.createBufferSource();
    loopSrc.buffer = loop;
    loopSrc.loop = true;
    loopSrc.loopStart = loopOffset;
    loopSrc.loopEnd = Math.min(loop.duration, loopOffset + LOOP_SECONDS);
    loopSrc.connect(music);
    loopSrc.start(t0 + INTRO_SECONDS, loopOffset);

    this.musicStart = t0;
    this.emit();
  }

  /** Seconds since the music started, or null before it starts. Drives the hero board's ticks. */
  musicTime(): number | null {
    if (!this.ctx || this.musicStart === null) return null;
    return this.ctx.currentTime - this.musicStart;
  }

  /** Plays an effect. `atMusicTime` lines it up with a tick on the music clock. */
  play(name: Sfx, atMusicTime?: number) {
    const { ctx, sfx } = this;
    const buffer = this.buffers[name];
    if (!ctx || !sfx || !buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(sfx);
    const when = atMusicTime !== undefined && this.musicStart !== null ? this.musicStart + atMusicTime : 0;
    src.start(Math.max(when, ctx.currentTime), leadIn(buffer));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    this.emit();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private emit() {
    for (const fn of this.listeners) fn();
  }
}

export const sound = new SoundEngine();

const TEXT_FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const CLICKABLE = "button, a, [data-sfx]";

/**
 * The only place sounds are triggered by the visitor. Rules:
 * - Pointer presses only. There are no keyboard listeners, so typing, Enter, Space and Tab never click.
 * - pointerup only resumes the audio context (mobile unlocks on touch end); it never plays a sound itself.
 * - A press inside a text field never clicks and never starts the music.
 * - The click plays only on buttons, links and [data-sfx] elements that are not disabled.
 */
export function installSoundTriggers(): () => void {
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest(TEXT_FIELD)) return;
    sound.unlock();
    const control = target.closest(CLICKABLE);
    if (!control) return;
    if (control instanceof HTMLButtonElement && control.disabled) return;
    if (control.getAttribute("aria-disabled") === "true") return;
    sound.play("click");
  };
  // Mobile Safari and Chrome only unlock audio at the end of a touch, so resume there too.
  // Same text-field rule; never plays the click.
  const onPointerUp = (e: PointerEvent) => {
    if (e.target instanceof Element && !e.target.closest(TEXT_FIELD)) sound.unlock();
  };
  document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  document.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    document.removeEventListener("pointerup", onPointerUp, { capture: true });
  };
}
