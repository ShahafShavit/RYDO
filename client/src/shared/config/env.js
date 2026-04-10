const apiMode = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'real';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  apiMode,
  isMockApi: apiMode === 'mock',
  devAuthEnabled: import.meta.env.DEV && apiMode === 'mock' && import.meta.env.VITE_DEV_AUTH_ENABLED === 'true',
  devRole: import.meta.env.VITE_DEV_ROLE || 'user',
};
