import { useEffect, useRef, useState } from 'react';
import { HAZARD_PULSE_MS } from '@/features/hazards/utils/hazard-motion';

/**
 * Tracks hazard IDs that appeared recently (for enter pulse).
 * @param {Array<{ id: number | string }>} hazards
 * @returns {Set<number | string>}
 */
export function useNewHazardIds(hazards) {
  const prevIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const [newIds, setNewIds] = useState(() => new Set());
  const timersRef = useRef(new Map());

  useEffect(() => {
    const currentIds = new Set(hazards.map((h) => h.id));
    const prevIds = prevIdsRef.current;
    const appeared = [];

    if (initializedRef.current) {
      for (const id of currentIds) {
        if (!prevIds.has(id)) {
          appeared.push(id);
        }
      }
    }

    prevIdsRef.current = currentIds;
    initializedRef.current = true;

    if (appeared.length === 0) return undefined;

    queueMicrotask(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        for (const id of appeared) {
          next.add(id);
        }
        return next;
      });
    });

    for (const id of appeared) {
      const existing = timersRef.current.get(id);
      if (existing) window.clearTimeout(existing);

      const timer = window.setTimeout(() => {
        setNewIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timersRef.current.delete(id);
      }, HAZARD_PULSE_MS);

      timersRef.current.set(id, timer);
    }

    return undefined;
  }, [hazards]);

  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        window.clearTimeout(timer);
      }
      timersRef.current.clear();
    },
    [],
  );

  return newIds;
}
