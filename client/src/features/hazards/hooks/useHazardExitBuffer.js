import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HAZARD_EXIT_MS } from '@/features/hazards/utils/hazard-motion';

/**
 * Keeps recently removed hazards in the display list until exit animation completes.
 * @param {Array<{ id: number | string }>} hazards
 * @returns {{ displayHazards: typeof hazards, exitingIds: Set<number | string>, onMarkerExitComplete: (id: number | string) => void }}
 */
export function useHazardExitBuffer(hazards) {
  const prevByIdRef = useRef(new Map());
  const exitCacheRef = useRef(new Map());
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const exitTimersRef = useRef(new Map());

  useEffect(() => {
    const nextById = new Map(hazards.map((h) => [h.id, h]));
    const prevById = prevByIdRef.current;
    const removed = [];

    for (const [id, hazard] of prevById) {
      if (!nextById.has(id)) {
        removed.push(id);
        exitCacheRef.current.set(id, hazard);
      }
    }

    for (const [id, hazard] of nextById) {
      exitCacheRef.current.set(id, hazard);
    }

    prevByIdRef.current = nextById;

    if (removed.length === 0) return undefined;

    setExitingIds((prev) => {
      const next = new Set(prev);
      for (const id of removed) {
        next.add(id);
      }
      return next;
    });

    for (const id of removed) {
      const existing = exitTimersRef.current.get(id);
      if (existing) window.clearTimeout(existing);

      const timer = window.setTimeout(() => {
        setExitingIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        exitCacheRef.current.delete(id);
        exitTimersRef.current.delete(id);
      }, HAZARD_EXIT_MS + 50);

      exitTimersRef.current.set(id, timer);
    }

    return undefined;
  }, [hazards]);

  useEffect(
    () => () => {
      for (const timer of exitTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      exitTimersRef.current.clear();
    },
    [],
  );

  const onMarkerExitComplete = useCallback((id) => {
    const timer = exitTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      exitTimersRef.current.delete(id);
    }
    exitCacheRef.current.delete(id);
    setExitingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const displayHazards = useMemo(() => {
    const result = [...hazards];
    const liveIds = new Set(hazards.map((h) => h.id));

    for (const id of exitingIds) {
      if (liveIds.has(id)) continue;
      const cached = exitCacheRef.current.get(id);
      if (cached) {
        result.push(cached);
      }
    }

    return result;
  }, [hazards, exitingIds]);

  return { displayHazards, exitingIds, onMarkerExitComplete };
}
