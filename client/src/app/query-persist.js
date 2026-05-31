import { queryClient } from '@/app/query-client';
import { env } from '@/shared/config/env';

/** Clear in-memory cache; on native also wipe the persisted blob. */
export async function clearPersistedQueryCache() {
  queryClient.clear();
  if (!env.isNativeApp) return;

  const { removePersistedQueryCache } = await import('@/app/query-persist.native.js');
  await removePersistedQueryCache();
}
