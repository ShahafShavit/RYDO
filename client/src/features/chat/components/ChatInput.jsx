import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';

export default function ChatInput() {
  return (
    <div className="flex gap-3">
      <Input placeholder="Send a ride update..." />
      <Button variant="neon">Send</Button>
    </div>
  );
}
