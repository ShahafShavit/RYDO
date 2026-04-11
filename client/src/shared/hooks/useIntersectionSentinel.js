import { useEffect, useRef } from 'react';

/**
 * Invokes onIntersect when the sentinel element intersects the viewport (or root).
 * Avoids an immediate second fetch when the sentinel is already visible right after
 * loading finishes (short lists / tall viewports) by ignoring intersections during
 * an initial settle window, then optionally firing once if the sentinel is still visible.
 *
 * @param {() => void} onIntersect
 * @param {boolean} [enabled=true]
 * @param {{ rootMargin?: string, ignoreInitialMs?: number }} [options]
 */
export function useIntersectionSentinel(onIntersect, enabled = true, options = {}) {
  const { rootMargin = '0px 0px 64px 0px', ignoreInitialMs = 320 } = options;
  const ref = useRef(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const enabledAt = performance.now();
    let settleTimerId = 0;
    let graceSettleScheduled = false;

    const runIfStillVisible = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh && rect.bottom > 0) onIntersectRef.current();
    };

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        const elapsed = performance.now() - enabledAt;
        if (elapsed < ignoreInitialMs) {
          if (!graceSettleScheduled) {
            graceSettleScheduled = true;
            const delay = Math.max(0, ignoreInitialMs - elapsed);
            settleTimerId = window.setTimeout(runIfStillVisible, delay);
          }
          return;
        }
        onIntersectRef.current();
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => {
      if (settleTimerId) window.clearTimeout(settleTimerId);
      obs.disconnect();
    };
  }, [enabled, rootMargin, ignoreInitialMs]);

  return ref;
}
