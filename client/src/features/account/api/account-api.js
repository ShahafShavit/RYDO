import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const accountApi = {
    changePassword: async (data) => {
        return apiClient.put(API_ENDPOINTS.account.changePassword, data);
    },

    getPreferences: async () => {
        return apiClient.get(API_ENDPOINTS.account.preferences);
    },

    updatePreferences: async (data) => {
        return apiClient.put(API_ENDPOINTS.account.preferences, data);
    },

    getProfile: async () => {
        return apiClient.get(API_ENDPOINTS.account.profile);
    },

    updateProfile: async (data) => {
        return apiClient.put(API_ENDPOINTS.account.profile, data);
    },

    uploadAvatar: async (file) => {
        return apiClient.uploadFile(API_ENDPOINTS.account.avatarUpload, file, {}, { fileFieldName: 'file' });
    },
};
