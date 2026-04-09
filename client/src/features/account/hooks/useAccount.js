import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/account-api';

export const accountKeys = {
    all: ['account'],
    preferences: () => [...accountKeys.all, 'preferences'],
    profile: () => [...accountKeys.all, 'profile'],
};

export const useChangePassword = () => {
    return useMutation({
        mutationFn: accountApi.changePassword,
    });
};

export const usePreferences = () => {
    return useQuery({
        queryKey: accountKeys.preferences(),
        queryFn: accountApi.getPreferences,
    });
};

export const useUpdatePreferences = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: accountApi.updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.preferences() });
        },
    });
};

export const useProfile = () => {
    return useQuery({
        queryKey: accountKeys.profile(),
        queryFn: accountApi.getProfile,
    });
};
