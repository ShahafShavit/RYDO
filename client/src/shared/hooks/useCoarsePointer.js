import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';

/** True when the primary input is coarse (touch). Used to gate embedded map/chart interaction. */
export function useCoarsePointer() {
  const [isCoarse, setIsCoarse] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsCoarse(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isCoarse;
}
