import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

const adminKeys = {
    all: ['admin'],
    users: () => [...adminKeys.all, 'users'],
    userList: (filters) => [...adminKeys.users(), filters],
    routes: () => [...adminKeys.all, 'routes'],
    routeList: (filters) => [...adminKeys.routes(), filters],
    hazards: () => [...adminKeys.all, 'hazards'],
    hazardList: (filters) => [...adminKeys.hazards(), filters],
};

export const useAdminUsers = (options = {}) => {
    const { skip = 0, take = 20 } = options;
    return useQuery({
        queryKey: adminKeys.userList({ skip, take }),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.admin.users + `?skip=${skip}&take=${take}`);
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useDeleteUser = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (userId) => await apiClient.delete(`${API_ENDPOINTS.admin.users}/${userId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.users() }),
    });
};

export const useAdminRoutes = (options = {}) => {
    const { skip = 0, take = 20 } = options;
    return useQuery({
        queryKey: adminKeys.routeList({ skip, take }),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.admin.routes + `?skip=${skip}&take=${take}`);
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useAdminHazards = (options = {}) => {
    const { skip = 0, take = 20 } = options;
    return useQuery({
        queryKey: adminKeys.hazardList({ skip, take }),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.admin.hazards + `?skip=${skip}&take=${take}`);
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useDeleteRoute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (routeId) => await apiClient.delete(`${API_ENDPOINTS.admin.routes}/${routeId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.routes() }),
    });
};
