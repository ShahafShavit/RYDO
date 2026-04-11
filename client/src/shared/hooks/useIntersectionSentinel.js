import { useEffect, useRef } from 'react';

/**
 * Invokes onIntersect when the sentinel element intersects the viewport (or root).
 * @param {() => void} onIntersect
 * @param {boolean} [enabled=true]
 */
export function useIntersectionSentinel(onIntersect, enabled = true) {
  const ref = useRef(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current();
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled]);

  return ref;
}
