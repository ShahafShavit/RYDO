import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/usersApi';

export const userSearchKeys = {
  all: ['users', 'search'],
  query: (q) => [...userSearchKeys.all, q],
};

/**
 * @param {string} debouncedQuery trimmed query; search runs when length >= 2
 * @param {number} [take]
 * @param {{ enabled?: boolean }} [options]
 */
export function useUserSearch(debouncedQuery, take = 20, options = {}) {
  const { enabled: enabledOption = true } = options;
  const q = (debouncedQuery || '').trim();
  return useQuery({
    queryKey: userSearchKeys.query(q),
    queryFn: async () => {
      const data = await usersApi.search({ q, take });
      return Array.isArray(data?.items) ? data.items : [];
    },
    enabled: enabledOption && q.length >= 2,
    placeholderData: (prev) => prev,
  });
}
