// client/src/shared/config/api-config.js
export const API_CONFIG = {
    useMockApi: import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.DEV,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
    mockDelay: Number(import.meta.env.VITE_MOCK_DELAY || 500), // ms
    enableMockErrors: import.meta.env.VITE_ENABLE_MOCK_ERRORS === 'true',
};
