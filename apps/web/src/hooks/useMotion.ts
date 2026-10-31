import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { sound } from "../audio/sound";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    sound.subscribe,
    () => sound.muted,
    () => false,
  );
}

/** True while the element is on screen, so off-screen boards stop ticking. */
export function useInView<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView];
}
