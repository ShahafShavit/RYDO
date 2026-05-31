import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { gamificationApi } from '@/features/gamification/api/gamification-api';

export function useGamificationMe() {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  return useQuery({
    queryKey: ['gamification', 'me', userId ?? 'guest'],
    queryFn: () => gamificationApi.getMe(),
    enabled: userId != null,
  });
}

export function useGamificationChallenges() {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  return useQuery({
    queryKey: ['gamification', 'challenges', userId ?? 'guest'],
    queryFn: () => gamificationApi.getMyChallenges(),
    enabled: userId != null,
  });
}

export function useRecentXp(take = 20) {
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  return useQuery({
    queryKey: ['gamification', 'xp-recent', userId ?? 'guest', take],
    queryFn: () => gamificationApi.getRecentXp(take),
    enabled: userId != null,
  });
}

export function usePinChallenge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  const scopedKey = userId ?? 'guest';
  return useMutation({
    mutationFn: (instanceId) => gamificationApi.setPinnedChallenge(instanceId ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gamification', 'me', scopedKey] });
    },
  });
}

export function useAcknowledgeLevel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id != null ? Number(user.id) : null;
  const scopedKey = userId ?? 'guest';
  return useMutation({
    mutationFn: () => gamificationApi.acknowledgeLevel(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gamification', 'me', scopedKey] });
    },
  });
}
