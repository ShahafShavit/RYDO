import { useEffect } from 'react';

const STACK_VAR = '--rydo-bottom-stack-h';
const FALLBACK = 'var(--rydo-tabbar-h)';

/**
 * Measures the fixed bottom chrome stack and publishes --rydo-bottom-stack-h on <html>.
 */
export function useMobileBottomStackInset(stackRef) {
  useEffect(() => {
    const el = stackRef?.current;
    if (!el) return undefined;

    const root = document.documentElement;

    const publish = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty(STACK_VAR, h > 0 ? `${h}px` : FALLBACK);
    };

    publish();

    const ro = new ResizeObserver(publish);
    ro.observe(el);

    return () => {
      ro.disconnect();
      root.style.removeProperty(STACK_VAR);
    };
  }, [stackRef]);
}
