import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/api-client';
import { API_ENDPOINTS } from '@/shared/api/api-endpoints';

export const routeKeys = {
    all: ['routes'],
    lists: () => [...routeKeys.all, 'list'],
    list: (filters) => [...routeKeys.lists(), { filters }],
    details: () => [...routeKeys.all, 'detail'],
    detail: (id) => [...routeKeys.details(), id],
    saved: () => [...routeKeys.all, 'saved'],
};

export const useRoutesList = (options = {}) => {
    const { skip = 0, take = 20 } = options;
    return useQuery({
        queryKey: routeKeys.list({ skip, take }),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.routes.list + `?skip=${skip}&take=${take}`);
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useRouteById = (id) => {
    return useQuery({
        queryKey: routeKeys.detail(id),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.routes.details(id));
            return res;
        },
        enabled: !!id,
    });
};

export const useUploadRoute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await apiClient.uploadFile(API_ENDPOINTS.routes.uploadGpx, data.file, data);
            return res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: routeKeys.lists() }),
    });
};

export const useSavedRoutes = () => {
    return useQuery({
        queryKey: routeKeys.saved(),
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.routes.saved);
            return res || [];
        },
    });
};

export const useMyRoutes = (options = {}) => {
    const { skip = 0, take = 20 } = options;
    return useQuery({
        queryKey: [...routeKeys.lists(), 'my', { skip, take }],
        queryFn: async () => {
            const res = await apiClient.get(API_ENDPOINTS.routes.my + `?skip=${skip}&take=${take}`);
            return res || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useSaveRoute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (routeId) => await apiClient.post(API_ENDPOINTS.routes.save(routeId)),
        onSuccess: () => qc.invalidateQueries({ queryKey: routeKeys.saved() }),
    });
};

export const useUnsaveRoute = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (routeId) => await apiClient.delete(API_ENDPOINTS.routes.unsave(routeId)),
        onSuccess: () => qc.invalidateQueries({ queryKey: routeKeys.saved() }),
    });
};
