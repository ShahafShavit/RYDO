import Card from '@/shared/components/ui/card/Card';
import { useChatMessages } from '@/features/chat/hooks/useChatMessages';

export default function ChatThread() {
  const { messages } = useChatMessages();

  return (
    <Card className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">{message.author}</p>
          <p className="mt-2 text-white/72">{message.body}</p>
        </div>
      ))}
    </Card>
  );
}
