import { useQuery } from '@tanstack/react-query';
import { challengesApi } from '@/features/challenges/api/challenges-api';

export function useChallenges() {
  const query = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const challenges = await challengesApi.getChallenges();
      return Array.isArray(challenges)
        ? challenges.map((challenge) => ({
            id: challenge.id,
            title: challenge.title,
            progress: `${challenge.currentValue}/${challenge.targetValue} ${challenge.unit}`,
          }))
        : [];
    },
  });

  return {
    ...query,
    challenges: query.data || [],
  };
}
