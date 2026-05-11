import { useEffect, useState } from 'react';

/**
 * Reads a CSS variable from :root whenever `data-theme` changes (for map strokes, etc.).
 * @param {string} name e.g. `--rydo-purple`
 * @param {string} fallback
 */
export function useThemeCssVar(name, fallback) {
  const [value, setValue] = useState(() => readVar(name, fallback));

  useEffect(() => {
    const sync = () => setValue(readVar(name, fallback));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [name, fallback]);

  return value;
}

function readVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const s = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return s || fallback;
}
