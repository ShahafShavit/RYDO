import { useUploadRoute as useApiUpload } from '../api/routesApi';

export function useUploadRoute() {
  const mutation = useApiUpload();
  return {
    upload: (payload, opts) => mutation.mutate(payload, opts),
    isLoading: mutation.isLoading,
    isError: mutation.isError,
    error: mutation.error,
  };
}
