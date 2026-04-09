export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  devAuthEnabled: import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_ENABLED === 'true',
  devRole: import.meta.env.VITE_DEV_ROLE || 'user',
};
