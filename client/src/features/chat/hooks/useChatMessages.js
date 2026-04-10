import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/features/chat/api/chat-api';

export function useChatMessages(rideId = 1) {
  const query = useQuery({
    queryKey: ['chat', rideId],
    queryFn: async () => {
      const messages = await chatApi.getMessages(rideId);
      return Array.isArray(messages)
        ? messages.map((message) => ({
            id: message.id,
            author: message.username || message.author || 'Unknown rider',
            body: message.message || message.body || '',
          }))
        : [];
    },
  });

  return {
    ...query,
    messages: query.data || [],
  };
}
