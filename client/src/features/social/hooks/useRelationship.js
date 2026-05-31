import { useQuery } from '@tanstack/react-query';
import { friendsApi } from '../api/friends-api';
import { normalizeHandle } from '@/shared/lib/user-paths';

export const relationshipKeys = {
  all: ['social', 'relationship'],
  detail: (handle) => [...relationshipKeys.all, normalizeHandle(handle)],
};

export function useRelationship(handle, options = {}) {
  const { enabled = true } = options;
  const h = normalizeHandle(handle);
  return useQuery({
    queryKey: relationshipKeys.detail(h),
    queryFn: () => friendsApi.getRelationship(h),
    enabled: enabled && h.length > 0,
  });
}
