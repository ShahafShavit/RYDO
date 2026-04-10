import { useState } from 'react';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import { useSendMessage } from '@/features/chat/hooks/useSendMessage';

export default function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, isPending } = useSendMessage();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    await sendMessage(message.trim());
    setMessage('');
  };

  return (
    <div className="flex gap-3">
      <Input placeholder="Send a ride update..." value={message} onChange={(event) => setMessage(event.target.value)} />
      <Button variant="neon" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Sending…' : 'Send'}</Button>
    </div>
  );
}
