import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';

export const relationshipKeys = {
  all: ['social', 'relationship'],
  detail: (userId) => [...relationshipKeys.all, Number(userId)],
};

export function useRelationship(userId, options = {}) {
  const { enabled = true } = options;
  const id = Number(userId);
  return useQuery({
    queryKey: relationshipKeys.detail(id),
    queryFn: () => friendsApi.getRelationship(id),
    enabled: enabled && Number.isFinite(id) && id > 0,
  });
}
