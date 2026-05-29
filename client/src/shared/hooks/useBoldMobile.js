import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

/** True when viewport is mobile (Bold layout applies). Matches Tailwind `md` breakpoint. */
export function useBoldMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
