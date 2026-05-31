import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { createQueryCacheAsyncStorage, getQueryCacheStorageKey } from '@/app/query-cache-storage';
import { ONE_HOUR_MS } from '@/app/query-constants';

export const queryPersister = createAsyncStoragePersister({
  storage: createQueryCacheAsyncStorage(),
  key: getQueryCacheStorageKey(),
  throttleTime: 1000,
});

let persistFailureLogged = false;

/** @param {string} buster */
export function getNativePersistOptions(buster) {
  return {
    persister: queryPersister,
    maxAge: ONE_HOUR_MS,
    buster,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  };
}

export async function removePersistedQueryCache() {
  try {
    await queryPersister.removeClient();
  } catch (error) {
    if (!persistFailureLogged) {
      console.warn('[rydo] failed to clear persisted query cache', error);
      persistFailureLogged = true;
    }
  }
}
