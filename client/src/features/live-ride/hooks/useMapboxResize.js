import { useCallback, useEffect } from 'react';

/**
 * Keeps Mapbox GL canvas in sync with its container (fixes stale width/height gaps).
 * @param {import('react').RefObject<{ getMap?: () => import('mapbox-gl').Map | undefined } | null>} mapRef
 * @param {import('react').RefObject<HTMLElement | null>} containerRef
 * @param {boolean} [enabled=true] re-attach when the map shell mounts (e.g. after loading gates)
 */
export function useMapboxResize(mapRef, containerRef, enabled = true) {
  const resize = useCallback(() => {
    mapRef.current?.getMap?.()?.resize();
  }, [mapRef]);

  useEffect(() => {
    if (!enabled) return undefined;

    let ro = null;
    let raf = 0;

    const attach = () => {
      resize();
      const el = containerRef.current;
      if (!el) return;
      ro?.disconnect();
      ro = new ResizeObserver(resize);
      ro.observe(el);
    };

    attach();
    raf = requestAnimationFrame(attach);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [containerRef, enabled, resize]);

  return resize;
}
