import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/api/chat-api';

export function useSendMessage(rideId = 1) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (message) => chatApi.sendMessage(rideId, { message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', rideId] }),
  });

  return {
    ...mutation,
    sendMessage: mutation.mutateAsync,
  };
}
