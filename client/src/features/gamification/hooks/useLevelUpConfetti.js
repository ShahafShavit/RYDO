import { useEffect, useRef } from 'react';
import { burstLeaderboardConfetti } from '@/features/leaderboards/leaderboard-confetti';
import { useAcknowledgeLevel, useGamificationMe } from '@/features/gamification/hooks/useGamification';

/**
 * Fires 3× celebration confetti on load when server reports unacknowledged level-up.
 */
export function useLevelUpConfetti() {
  const { data } = useGamificationMe();
  const acknowledge = useAcknowledgeLevel();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!data?.hasUnacknowledgedLevelUp || firedRef.current) return;
    firedRef.current = true;
    const cleanups = [];
    const timeouts = [0, 450, 900].map((delay) =>
      window.setTimeout(() => {
        cleanups.push(burstLeaderboardConfetti({ intensity: 'celebration', originY: 0.28 }));
      }, delay)
    );
    acknowledge.mutate();
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      cleanups.forEach((fn) => fn?.());
    };
  }, [data?.hasUnacknowledgedLevelUp, acknowledge]);
}
