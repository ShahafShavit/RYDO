import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/account-api';
import { normalizeAccountProfile, normalizePreferences } from '@/features/account/account-mapper';
import { userProfileKeys } from '@/features/users/hooks/useUserProfile';

export const accountKeys = {
    all: ['account'],
    preferences: () => [...accountKeys.all, 'preferences'],
    profile: () => [...accountKeys.all, 'profile'],
};

export const useChangePassword = () => {
    const mutation = useMutation({
        mutationFn: accountApi.changePassword,
    });

    return {
        ...mutation,
        isLoading: mutation.isPending,
    };
};

export const usePreferences = () => {
    return useQuery({
        queryKey: accountKeys.preferences(),
        queryFn: async () => normalizePreferences(await accountApi.getPreferences()),
    });
};

export const useUpdatePreferences = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data) => normalizePreferences(await accountApi.updatePreferences(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.preferences() });
        },
    });

    return {
        ...mutation,
        isLoading: mutation.isPending,
    };
};

export const useProfile = () => {
    return useQuery({
        queryKey: accountKeys.profile(),
        queryFn: async () => normalizeAccountProfile(await accountApi.getProfile()),
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data) => normalizeAccountProfile(await accountApi.updateProfile(data)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: accountKeys.profile() });
            queryClient.invalidateQueries({ queryKey: userProfileKeys.all });
        },
    });

    return {
        ...mutation,
        isLoading: mutation.isPending,
    };
};
