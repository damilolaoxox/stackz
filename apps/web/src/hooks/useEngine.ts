import { useEffect, useRef, useState } from "react";
import { sound, TICK_SECONDS } from "../audio/sound";
import { TetrisEngine, type EngineEvent, type EngineOptions } from "../game/engine";

interface Options extends EngineOptions {
  tickMs: number;
  paused: boolean;
  /** Tick on the music clock once the music is playing (hero board only). */
  syncToMusic?: boolean;
  onEvents?: (events: EngineEvent[], musicTime: number | null) => void;
}

const MAX_CATCH_UP = 4;

/** Runs a TetrisEngine on requestAnimationFrame and re-renders after every tick. */
export function useEngine(options: Options): TetrisEngine {
  const engineRef = useRef<TetrisEngine | null>(null);
  if (!engineRef.current) engineRef.current = new TetrisEngine(options);
  const onEvents = useRef(options.onEvents);
  onEvents.current = options.onEvents;
  const [, setFrame] = useState(0);
  const { tickMs, paused, syncToMusic } = options;

  useEffect(() => {
    if (paused) return;
    const engine = engineRef.current;
    if (!engine) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastMusicTick: number | null = null;

    const loop = (now: number) => {
      let steps = 0;
      const music = syncToMusic ? sound.musicTime() : null;
      if (music !== null && music >= 0) {
        // One tick per 16th note of the music.
        const tick = Math.floor(music / TICK_SECONDS);
        if (lastMusicTick === null) lastMusicTick = tick - 1;
        steps = Math.max(0, Math.min(MAX_CATCH_UP, tick - lastMusicTick));
        lastMusicTick = tick;
      } else {
        acc += now - last;
        steps = Math.min(MAX_CATCH_UP, Math.floor(acc / tickMs));
        acc = steps === MAX_CATCH_UP ? 0 : acc - steps * tickMs;
      }
      last = now;

      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          const events = engine.tick();
          if (events.length) onEvents.current?.(events, music);
        }
        setFrame((f) => (f + 1) % 1_000_000);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, tickMs, syncToMusic]);

  return engineRef.current;
}
