import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HAZARD_EXIT_MS } from '@/features/hazards/utils/hazard-motion';

/**
 * Keeps recently removed hazards in the display list until exit animation completes.
 * @param {Array<{ id: number | string }>} hazards
 * @returns {{ displayHazards: typeof hazards, exitingIds: Set<number | string>, onMarkerExitComplete: (id: number | string) => void }}
 */
export function useHazardExitBuffer(hazards) {
  const prevByIdRef = useRef(new Map());
  const [exitingIds, setExitingIds] = useState(() => new Set());
  const [exitingById, setExitingById] = useState(() => new Map());
  const exitTimersRef = useRef(new Map());

  useEffect(() => {
    const nextById = new Map(hazards.map((h) => [h.id, h]));
    const prevById = prevByIdRef.current;
    const removed = [];

    for (const [id] of prevById) {
      if (!nextById.has(id)) {
        removed.push(id);
      }
    }

    prevByIdRef.current = nextById;

    if (removed.length > 0) {
      setExitingById((prev) => {
        const next = new Map(prev);
        for (const id of removed) {
          next.set(id, prevById.get(id));
        }
        return next;
      });

      setExitingIds((prev) => {
        const next = new Set(prev);
        for (const id of removed) {
          next.add(id);
        }
        return next;
      });
    }

    if (removed.length === 0) return undefined;

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
        setExitingById((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
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
    setExitingById((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
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

    for (const [id, cached] of exitingById) {
      if (liveIds.has(id)) continue;
      if (cached) {
        result.push(cached);
      }
    }

    return result;
  }, [hazards, exitingById]);

  return { displayHazards, exitingIds, onMarkerExitComplete };
}
