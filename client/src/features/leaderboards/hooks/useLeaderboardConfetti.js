import { useEffect, useRef } from 'react';
import { burstLeaderboardConfetti } from '@/features/leaderboards/leaderboard-confetti';
import { findUserLeaderboardRow } from '@/features/leaderboards/leaderboard-utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

/**
 * Fires a confetti burst whenever the active board changes (swipe or tab tap).
 * @param {{ enabled?: boolean, data: object | undefined, currentUserId?: number | string | null, activeBoard: string }} props
 */
export function useLeaderboardConfetti({ enabled = false, data, currentUserId, activeBoard }) {
  const reducedMotion = useReducedMotion();
  const timerRef = useRef(null);
  const cleanupRef = useRef(() => {});

  useEffect(() => {
    if (!enabled || reducedMotion || !data || !activeBoard) return undefined;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const rows = data[activeBoard] ?? [];
      const userRow = findUserLeaderboardRow(rows, currentUserId);
      const intensity = userRow?.rank != null && userRow.rank <= 3 ? 'celebration' : 'subtle';

      cleanupRef.current();
      cleanupRef.current = burstLeaderboardConfetti({ intensity, originY: 0.32 });
    }, 220);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, reducedMotion, data, currentUserId, activeBoard]);

  useEffect(
    () => () => {
      cleanupRef.current();
    },
    [],
  );
}
